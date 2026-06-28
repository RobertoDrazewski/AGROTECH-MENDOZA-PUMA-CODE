/* ============================================================
 * AgroTech Mendoza  ·  by puma-code.com
 * NODO DE PATIO v4.7 — Heltec Wireless Tracker (ESP32-S3)
 * = v4.6 SIN watchdog (para que el OTA no se corte)
 *   Mantiene: presion validada (null si invalida),
 *   reconexion WiFi no bloqueante, iconos, bateria, QR.
 *
 * NOTA: el WDT se saco a proposito. El WDT viejo de la v4.5.2
 * cortaba el OTA a los ~15s. Esta version entra limpia por WiFi.
 * Si mas adelante queres watchdog, se reintroduce con cuidado
 * una vez que esta este corriendo (ya tiene OTA estable).
 *
 * ARCHIVOS/LIBRERIAS:
 * - "puma_logo.h" en la carpeta del .ino
 * - Library Manager: "QRCode" by Richard Moore (ricmoo)
 * ============================================================ */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoOTA.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_BMP280.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <TinyGPSPlus.h>

#define USE_TFT 1
#if USE_TFT
  #include <SPI.h>
  #include <Adafruit_GFX.h>
  #include <Adafruit_ST7735.h>
  #include "puma_logo.h"
  extern "C" {
  #include <qrcode.h>
}
#endif

// =================== CONFIG (EDITAR) ========================
const char* WIFI_SSID = "Adriana Abad";
const char* WIFI_PASS = "Abuela123";

const char* BACKEND_URL =
  "https://agrotech-mendoza-puma-code-production.up.railway.app/api/v1/telemetria/ingest";

const char* VINEDO_ID = "Patio_Casa";
const char* NODE_ID   = "heltec-patio-01";

const char* OTA_HOSTNAME = "agrotech-patio-01";
const char* OTA_PASSWORD = "PumaCode2026";

#define QR_URL      "https://agrotech-pumacode.com.ar/"
#define QR_VERSION  4

const unsigned long REPORT_INTERVAL_MS = 20000UL;
const unsigned long CARD_INTERVAL_MS   = 3500UL;

#define USAR_GPS  true

// Capacitive Soil Moisture Sensor — convencion REAL de ESTE sensor:
// SECO = valor BAJO (~60), MOJADO = valor ALTO. Calibrado por prueba
// aire/agua. PROVISORIO hasta el sensor nuevo.
const int SOIL_DRY = 60;
const int SOIL_WET = 3800;

// ---- BATERIA (Heltec Wireless Tracker) --------------------
#define VBAT_PIN     1
#define ADC_CTRL     2
#define BAT_CTRL_ON  HIGH
float   BAT_MULT  =  4.9;
#define BAT_CHARGE_V 4.25

// ---- PRESION: rango fisico valido (Mendoza ~915 hPa) ------
#define PRES_MIN_VALID 800.0
#define PRES_MAX_VALID 1100.0
// ===========================================================

#define PIN_SOIL     4
#define PIN_DS18B20  5
#define PIN_SDA      6
#define PIN_SCL      7
#define VGNSS_CTRL   3
#define GNSS_RX      33
#define GNSS_TX      34
#define GNSS_BAUD    115200

#define TFT_CS   38
#define TFT_DC   40
#define TFT_RST  39
#define TFT_SCLK 41
#define TFT_MOSI 42
#define TFT_BL   21

#define PUMA_GREEN 0x9E68
#define ORANGE     0xFD20
#define LIGHTBLUE  0x5D9F

Adafruit_SHT31  sht31 = Adafruit_SHT31();
Adafruit_BMP280 bmp;
OneWire           oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);
TinyGPSPlus       gps;
WiFiClientSecure  netClient;
#if USE_TFT
  Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCLK, TFT_RST);
#endif

bool okSHT = false, okBMP = false;
// DIAG BMP: coeficientes de calibracion leidos crudos del sensor.
// Si dig_T1/dig_P1 salen 0 o 65535 -> calibracion corrupta (resoldar).
// Si salen plausibles pero igual mide mal -> sensor clon/dañado.
uint16_t gDigT1 = 0, gDigP1 = 0;
int16_t  gDigT2 = 0, gDigT3 = 0, gDigP2 = 0, gDigP3 = 0;
uint8_t  gBmpChipID = 0;
unsigned long lastReport = 0, lastCard = 0;
unsigned long lastWifiTry = 0;
int lastHttp = 0;
int cardIdx = 0;
#define NUM_CARDS 9

float gSuelo = 0, gTSuelo = NAN, gTAire = NAN, gHAire = NAN, gPres = NAN, gTBmp = NAN;
bool  gPresOK = false;
bool  gTSueloOK = false, gFix = false;
double gLat = 0, gLon = 0;
int   gSoilRaw = 0;
int   gSoilMin = 4095;
int   gSoilMax = 0;
float gBatV = 0;
int   gBatPct = 0;
bool  otaEnCurso = false;

// OPCION B: ultimo valor VALIDO de cada sensor que puede fallar.
// Si el sensor falla un ciclo, se manda este ultimo bueno en vez de null.
// Valores de respaldo iniciales razonables para Mendoza por si el sensor
// nunca dio una lectura valida (arranque con sensor roto).
float gLastPres  = 915.0;   // presion tipica Mendoza (~750m)
float gLastSuelo = 0.0;     // suelo: arranca en 0% (seco) hasta tener dato

int soilPercent(int raw) {
  long p = map(raw, SOIL_DRY, SOIL_WET, 0, 100);
  if (p < 0) p = 0; if (p > 100) p = 100;
  return (int)p;
}

int batPercent(float v) {
  if (v >= 4.15) return 100;
  if (v <= 3.3) return 0;
  return (int)((v - 3.3) / 0.9 * 100.0);
}

float readBatteryV() {
  pinMode(ADC_CTRL, OUTPUT);
  digitalWrite(ADC_CTRL, BAT_CTRL_ON);
  delay(20);
  uint32_t acc = 0;
  for (int i = 0; i < 16; i++) acc += analogReadMilliVolts(VBAT_PIN);
  digitalWrite(ADC_CTRL, (BAT_CTRL_ON == LOW) ? HIGH : LOW);
  float mv = acc / 16.0;
  return (mv * BAT_MULT) / 1000.0;
}

bool isCharging() { return (gBatV >= BAT_CHARGE_V); }

void conectarWiFi(unsigned long timeoutMs) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WiFi] conectando a "); Serial.print(WIFI_SSID);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(400); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED)
    Serial.printf("[WiFi] OK  IP %s  RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  else
    Serial.println("[WiFi] sin conexion (reintenta en loop)");
}

void mantenerWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiTry < 10000UL) return;
  lastWifiTry = millis();
  Serial.println("[WiFi] caido -> reconectando (no bloqueante)...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void setupOTA() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);
  ArduinoOTA.onStart([]() {
    otaEnCurso = true; Serial.println("\n[OTA] Iniciando...");
#if USE_TFT
    tft.fillScreen(ST77XX_BLACK);
    tft.fillRect(0, 0, 160, 15, ST77XX_BLUE);
    tft.setTextColor(ST77XX_WHITE); tft.setTextSize(1);
    tft.setCursor(28, 4); tft.print("ACTUALIZANDO");
#endif
  });
  ArduinoOTA.onProgress([](unsigned int prog, unsigned int total) {
    int pct = (prog * 100) / total; Serial.printf("[OTA] %u%%\r", pct);
#if USE_TFT
    int w = (pct * 140) / 100;
    tft.drawRect(10, 40, 140, 16, ST77XX_WHITE);
    tft.fillRect(10, 40, w, 16, PUMA_GREEN);
    tft.setCursor(64, 62); tft.setTextColor(ST77XX_WHITE); tft.printf("%d%%", pct);
#endif
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\n[OTA] Listo. Reiniciando.");
#if USE_TFT
    tft.fillScreen(ST77XX_BLACK);
    tft.setCursor(40, 36); tft.setTextColor(PUMA_GREEN); tft.print("OTA OK :)");
#endif
  });
  ArduinoOTA.onError([](ota_error_t e) { otaEnCurso = false; Serial.printf("[OTA] Error %u\n", e); });
  ArduinoOTA.begin();
  Serial.printf("[OTA] Listo '%s' en %s\n", OTA_HOSTNAME, WiFi.localIP().toString().c_str());
}

// ----------------------- PANTALLA --------------------------
#if USE_TFT
void initTFT() {
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);
  tft.initR(INITR_MINI160x80);
  tft.setRotation(1);
  tft.invertDisplay(true);
  tft.setTextWrap(false);
  tft.fillScreen(ST77XX_BLACK);
}

void centerText(const char* s, uint8_t size, int y, uint16_t color) {
  int w = (int)strlen(s) * 6 * size;
  int x = (160 - w) / 2; if (x < 0) x = 0;
  tft.setTextSize(size); tft.setTextColor(color);
  tft.setCursor(x, y); tft.print(s);
}

void centerTextIn(const char* s, uint8_t size, int x0, int y, uint16_t color) {
  int w = (int)strlen(s) * 6 * size;
  int x = x0 + ((160 - x0) - w) / 2; if (x < x0) x = x0;
  tft.setTextSize(size); tft.setTextColor(color);
  tft.setCursor(x, y); tft.print(s);
}

void iconTermometro(int cx, int cy, uint16_t c) {
  tft.fillCircle(cx, cy + 12, 7, c);
  tft.fillRoundRect(cx - 3, cy - 14, 6, 22, 3, c);
  tft.fillCircle(cx, cy + 12, 4, ST77XX_BLACK);
  tft.fillRect(cx - 1, cy - 6, 2, 18, ST77XX_BLACK);
  tft.fillCircle(cx, cy + 12, 3, c);
  tft.fillRect(cx - 1, cy + 2, 2, 11, c);
}

void iconGotaAire(int cx, int cy, uint16_t c) {
  tft.fillTriangle(cx - 7, cy - 12, cx - 13, cy, cx - 1, cy, c);
  tft.fillCircle(cx - 7, cy, 6, c);
  tft.fillTriangle(cx + 7, cy - 4, cx + 2, cy + 8, cx + 12, cy + 8, c);
  tft.fillCircle(cx + 7, cy + 8, 5, c);
}

void iconPresion(int cx, int cy, uint16_t c) {
  tft.drawCircle(cx, cy, 15, c);
  tft.drawCircle(cx, cy, 14, c);
  tft.fillCircle(cx, cy, 2, c);
  tft.drawLine(cx, cy, cx + 9, cy - 7, c);
  tft.drawPixel(cx, cy - 13, c);
  tft.drawPixel(cx + 13, cy, c);
  tft.drawPixel(cx - 13, cy, c);
}

void iconSuelo(int cx, int cy, uint16_t c) {
  tft.fillTriangle(cx, cy - 14, cx - 8, cy - 1, cx + 8, cy - 1, c);
  tft.fillCircle(cx, cy - 1, 8, c);
  tft.drawFastHLine(cx - 15, cy + 9, 30, c);
  tft.drawFastHLine(cx - 12, cy + 13, 24, c);
  tft.drawFastHLine(cx - 8, cy + 17, 16, c);
}

void drawSensorIcon(int i, int cx, int cy, uint16_t c) {
  switch (i) {
    case 0: iconSuelo(cx, cy, c); break;
    case 1: iconTermometro(cx, cy, c); break;
    case 2: iconGotaAire(cx, cy, c); break;
    case 3: iconTermometro(cx, cy, c); break;
    default: iconPresion(cx, cy, c); break;
  }
}

void drawLogoSplash() {
  tft.fillScreen(ST77XX_BLACK);
  tft.drawXBitmap(6, (80 - PUMA_64_H) / 2, puma_logo_64, PUMA_64_W, PUMA_64_H, PUMA_GREEN);
  tft.setTextSize(1);
  tft.setTextColor(PUMA_GREEN);  tft.setCursor(82, 24); tft.print("AgroTech");
  tft.setTextColor(ST77XX_WHITE); tft.setCursor(82, 40); tft.print("by Puma");
  tft.setCursor(82, 52); tft.print("Code");
}

void drawQRCard() {
  QRCode qr;
  uint8_t buf[qrcode_getBufferSize(QR_VERSION)];
  qrcode_initText(&qr, buf, QR_VERSION, ECC_MEDIUM, QR_URL);
  const int scale = 2;
  int side = qr.size * scale;
  int ox = (160 - side) / 2;
  int oy = (80 - side) / 2 - 2;
  int qz = 4;
  tft.fillScreen(ST77XX_BLACK);
  tft.fillRect(ox - qz, oy - qz, side + 2 * qz, side + 2 * qz, ST77XX_WHITE);
  for (uint8_t y = 0; y < qr.size; y++)
    for (uint8_t x = 0; x < qr.size; x++)
      if (qrcode_getModule(&qr, x, y))
        tft.fillRect(ox + x * scale, oy + y * scale, scale, scale, ST77XX_BLACK);
}

void drawCalibCard() {
  tft.fillScreen(ST77XX_BLACK);
  tft.fillRect(0, 0, 160, 14, ORANGE);
  tft.setTextSize(1); tft.setTextColor(ST77XX_BLACK);
  const char* t = "CALIB SUELO";
  tft.setCursor((160 - (int)strlen(t) * 6) / 2, 4); tft.print(t);
  char val[10]; snprintf(val, sizeof val, "%d", gSoilRaw);
  centerText(val, 4, 22, ST77XX_WHITE);
  tft.setTextSize(1);
  char ln[30]; snprintf(ln, sizeof ln, "seco:%d  mojado:%d", gSoilMin, gSoilMax);
  int w = (int)strlen(ln) * 6;
  tft.setCursor((160 - w) / 2, 62); tft.setTextColor(ST77XX_CYAN); tft.print(ln);
}

void drawBatteryCard() {
  tft.fillScreen(ST77XX_BLACK);
  bool cargando = isCharging();
  uint16_t accent = cargando ? LIGHTBLUE
                  : ((gBatV >= 3.7) ? PUMA_GREEN : (gBatV >= 3.4) ? ST77XX_YELLOW : ST77XX_RED);
  tft.fillRect(0, 0, 160, 14, accent);
  tft.setTextSize(1); tft.setTextColor(ST77XX_BLACK);
  const char* t = cargando ? "CARGANDO" : "BATERIA";
  tft.setCursor((160 - (int)strlen(t) * 6) / 2, 4); tft.print(t);

  char val[12];
  if (cargando) strcpy(val, "FULL");
  else snprintf(val, sizeof val, "%.2fV", gBatV);
  centerText(val, 3, 22, ST77XX_WHITE);

  int bx = 15, by = 52, bw = 130, bh = 18;
  tft.drawRect(bx, by, bw, bh, ST77XX_WHITE);
  tft.fillRect(bx + 2, by + 2, (gBatPct * (bw - 4)) / 100, bh - 4, accent);
  char pc[8];
  if (cargando) strcpy(pc, "100%");
  else snprintf(pc, sizeof pc, "%d%%", gBatPct);
  int w = (int)strlen(pc) * 6;
  tft.setTextSize(1); tft.setTextColor(ST77XX_WHITE);
  tft.setCursor((160 - w) / 2, by + 5); tft.print(pc);
}

void drawFooter() {
  tft.setTextSize(1);
  tft.setCursor(3, 70);
  tft.setTextColor(ST77XX_WHITE);  tft.printf("W%d ", WiFi.RSSI());
  uint16_t pc = (lastHttp == 200 || lastHttp == 201) ? PUMA_GREEN
              : (lastHttp > 0 ? ST77XX_YELLOW : ST77XX_RED);
  tft.setTextColor(pc);            tft.printf("P%d ", lastHttp);
  tft.setTextColor(gFix ? PUMA_GREEN : ST77XX_RED);
  tft.printf("G%s", gFix ? "ok" : "--");
}

void drawStatusCard() {
  tft.fillScreen(ST77XX_BLACK);
  tft.fillRect(0, 0, 160, 14, PUMA_GREEN);
  tft.setTextSize(1); tft.setTextColor(ST77XX_BLACK);
  const char* t = "ESTADO NODO";
  tft.setCursor((160 - (int)strlen(t) * 6) / 2, 4); tft.print(t);
  int y = 22;
  tft.setTextColor(ST77XX_WHITE); tft.setCursor(8, y);
  tft.printf("WiFi : %d dBm", WiFi.RSSI()); y += 13;
  uint16_t pc = (lastHttp == 200 || lastHttp == 201) ? PUMA_GREEN
              : (lastHttp > 0 ? ST77XX_YELLOW : ST77XX_RED);
  tft.setTextColor(pc); tft.setCursor(8, y);
  tft.printf("POST : %d", lastHttp); y += 13;
  tft.setTextColor(gFix ? PUMA_GREEN : ST77XX_YELLOW); tft.setCursor(8, y);
  tft.printf("GPS  : %s", gFix ? "fix ok" : "buscando"); y += 13;
  uint16_t bc = isCharging() ? LIGHTBLUE
              : ((gBatV >= 3.7) ? PUMA_GREEN : (gBatV >= 3.4) ? ST77XX_YELLOW : ST77XX_RED);
  tft.setTextColor(bc); tft.setCursor(8, y);
  if (isCharging()) tft.printf("BAT  : %.2fV FULL", gBatV);
  else              tft.printf("BAT  : %.2fV %d%%", gBatV, gBatPct);
}

void drawSensorCard(int i) {
  tft.fillScreen(ST77XX_BLACK);
  char title[18], val[12], unit[8];
  uint16_t accent;
  switch (i) {
    case 0: strcpy(title,"HUM. SUELO"); accent=PUMA_GREEN;
      snprintf(val,sizeof val,"%.0f",gSuelo); strcpy(unit,"%"); break;
    case 1: strcpy(title,"TEMP AIRE"); accent=ST77XX_CYAN;
      if(isnan(gTAire))strcpy(val,"--");else snprintf(val,sizeof val,"%.1f",gTAire);
      strcpy(unit,"C"); break;
    case 2: strcpy(title,"HUM. AIRE"); accent=LIGHTBLUE;
      if(isnan(gHAire))strcpy(val,"--");else snprintf(val,sizeof val,"%.0f",gHAire);
      strcpy(unit,"%HR"); break;
    case 3: strcpy(title,"TEMP SUELO"); accent=ORANGE;
      if(gTSueloOK)snprintf(val,sizeof val,"%.1f",gTSuelo);else strcpy(val,"--");
      strcpy(unit,"C"); break;
    default: strcpy(title,"PRESION");
      // DEBUG: mostrar SIEMPRE el valor crudo del sensor para diagnosticar.
      // Blanco si esta en rango valido, amarillo si esta fuera (dudoso).
      // Solo "--" si de verdad no hay sensor (lectura NaN).
      accent = gPresOK ? ST77XX_WHITE : ST77XX_YELLOW;
      if (isnan(gPres)) strcpy(val,"--");
      else snprintf(val,sizeof val,"%.0f",gPres);
      strcpy(unit, gPresOK ? "hPa" : "hPa?"); break;
  }
  tft.fillRect(0, 0, 160, 14, accent);
  tft.setTextSize(1); tft.setTextColor(ST77XX_BLACK);
  tft.setCursor((160 - (int)strlen(title)*6)/2, 4); tft.print(title);
  drawSensorIcon(i, 30, 44, accent);
  uint8_t vs = (strlen(val) >= 5) ? 2 : 3;
  centerTextIn(val, vs, 58, 28, ST77XX_WHITE);
  centerTextIn(unit, 1, 58, 56, accent);
  drawFooter();
}

void drawCard(int i) {
  if (i == 8) { drawBatteryCard(); return; }
  if (i == 7) { drawCalibCard();   return; }
  if (i == 6) { drawQRCard();      return; }
  if (i >= 5) { drawStatusCard();  return; }
  drawSensorCard(i);
}
#endif

// ----------------------- SETUP -----------------------------
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[AgroTech] Iniciando setup v4.7 (sin WDT)...");

  pinMode(VGNSS_CTRL, OUTPUT);
  digitalWrite(VGNSS_CTRL, HIGH);
  delay(120);

#if USE_TFT
  initTFT();
  drawLogoSplash();
  delay(3000);
#endif

#if USAR_GPS
  Serial1.begin(GNSS_BAUD, SERIAL_8N1, GNSS_RX, GNSS_TX);
#endif

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL, ADC_11db);
  analogSetPinAttenuation(VBAT_PIN, ADC_11db);

  Wire.begin(PIN_SDA, PIN_SCL);
  okSHT = sht31.begin(0x44);
  okBMP = bmp.begin(0x76) || bmp.begin(0x77);
  if (okBMP) {
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
  }
  // DIAG BMP: leer coeficientes de calibracion crudos por I2C.
  // Probamos en 0x76 y 0x77 (la que responda).
  {
    uint8_t addr = 0x76;
    Wire.beginTransmission(addr);
    Wire.write(0xD0);
    if (Wire.endTransmission() != 0) { addr = 0x77; }
    auto rd16 = [&](uint8_t reg) -> uint16_t {
      Wire.beginTransmission(addr);
      Wire.write(reg);
      Wire.endTransmission();
      Wire.requestFrom(addr, (uint8_t)2);
      uint8_t lsb = Wire.available() ? Wire.read() : 0;
      uint8_t msb = Wire.available() ? Wire.read() : 0;
      return (uint16_t)((msb << 8) | lsb);
    };
    auto rd8 = [&](uint8_t reg) -> uint8_t {
      Wire.beginTransmission(addr);
      Wire.write(reg);
      Wire.endTransmission();
      Wire.requestFrom(addr, (uint8_t)1);
      return Wire.available() ? Wire.read() : 0;
    };
    gBmpChipID = rd8(0xD0);
    gDigT1 = rd16(0x88);
    gDigT2 = (int16_t)rd16(0x8A);
    gDigT3 = (int16_t)rd16(0x8C);
    gDigP1 = rd16(0x8E);
    gDigP2 = (int16_t)rd16(0x90);
    gDigP3 = (int16_t)rd16(0x92);
  }
  ds18b20.begin();

  netClient.setInsecure();
  conectarWiFi(20000UL);
  if (WiFi.status() == WL_CONNECTED) setupOTA();

  Serial.println("[AgroTech] Listo.");
  leerSensores();
#if USE_TFT
  drawCard(cardIdx);
#endif
}

// ----------------------- LOOP ------------------------------
void loop() {
  ArduinoOTA.handle();
  if (otaEnCurso) return;

  mantenerWiFi();

#if USAR_GPS
  while (Serial1.available()) gps.encode(Serial1.read());
#endif

  if (millis() - lastCard >= CARD_INTERVAL_MS) {
    lastCard = millis();
    leerSensores();
    cardIdx = (cardIdx + 1) % NUM_CARDS;
#if USE_TFT
    drawCard(cardIdx);
#endif
  }

  if (millis() - lastReport >= REPORT_INTERVAL_MS) {
    lastReport = millis();
    enviar();
  }
}

// --------------------- LEER SENSORES -----------------------
void leerSensores() {
  gSoilRaw = analogRead(PIN_SOIL);
  if (gSoilRaw < gSoilMin) gSoilMin = gSoilRaw;
  if (gSoilRaw > gSoilMax) gSoilMax = gSoilRaw;
  gSuelo   = (float)soilPercent(gSoilRaw);

  ds18b20.requestTemperatures();
  gTSuelo   = ds18b20.getTempCByIndex(0);
  gTSueloOK = (gTSuelo != DEVICE_DISCONNECTED_C) && !isnan(gTSuelo);
  gTAire = okSHT ? sht31.readTemperature() : NAN;
  gHAire = okSHT ? sht31.readHumidity()    : NAN;
  gPres  = okBMP ? bmp.readPressure() / 100.0F : NAN;
  gTBmp  = okBMP ? bmp.readTemperature() : NAN;

  gPresOK = (!isnan(gPres) && gPres >= PRES_MIN_VALID && gPres <= PRES_MAX_VALID);

  // OPCION B: si la lectura es valida, la guardamos como "ultima buena".
  // Asi, si el sensor falla en un ciclo, mandamos esta en vez de null.
  if (gPresOK) gLastPres = gPres;
  if (!isnan(gSuelo)) gLastSuelo = gSuelo;

  gBatV = readBatteryV();
  gBatPct = isCharging() ? 100 : batPercent(gBatV);

#if USAR_GPS
  gFix = gps.location.isValid();
  if (gFix) { gLat = gps.location.lat(); gLon = gps.location.lng(); }
#endif

  Serial.println("------------- LECTURA -------------");
  Serial.printf("Suelo : %d raw (min %d / max %d) / %.0f %%\n",
                gSoilRaw, gSoilMin, gSoilMax, gSuelo);
  Serial.printf("T suelo: %.2f C %s\n", gTSuelo, gTSueloOK ? "" : "(sin sensor)");
  Serial.printf("Aire  : %.2f C / %.1f %%HR\n", gTAire, gHAire);
  Serial.printf("BMP   : %.1f hPa %s\n", gPres, gPresOK ? "" : "(INVALIDA - sensor en revision)");
  Serial.printf("Bat   : %.2f V (%d%%) %s\n", gBatV, gBatPct, isCharging() ? "[cargando]" : "");
  Serial.printf("GPS   : fix=%d  %.6f, %.6f\n", gFix, gLat, gLon);
}

// ---------------------- ENVIAR -----------------------------
// Helper: arma un campo numerico como texto, o "null" si es NaN/invalido.
// Evita que el snprintf escriba "nan" en el JSON (causa del error 422).
static void numField(char* dst, size_t sz, float v, bool valido, int dec) {
  if (!valido || isnan(v) || isinf(v)) { strcpy(dst, "null"); return; }
  if (dec == 0)      snprintf(dst, sz, "%.0f", v);
  else if (dec == 1) snprintf(dst, sz, "%.1f", v);
  else               snprintf(dst, sz, "%.2f", v);
}

void enviar() {
  // Temp y humedad de aire son criticas para la helada: si faltan, no enviamos.
  if (isnan(gTAire) || isnan(gHAire)) {
    Serial.println("[SKIP] Falta temp/humedad de aire (NaN)."); return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] caido, no se envia (se reconecta en loop)."); return;
  }

  // Cada campo numerico se serializa protegido contra NaN -> "null".
  // OPCION B: presion y suelo NUNCA van null (el backend los exige float).
  // Si el sensor fallo este ciclo, se manda el ultimo valor valido conocido.
  char fTAire[16], fHAire[16], fPres[16], fSuelo[16], fTSuelo[16], fBat[16];
  numField(fTAire,  sizeof fTAire,  gTAire,  !isnan(gTAire), 2);
  numField(fHAire,  sizeof fHAire,  gHAire,  !isnan(gHAire), 2);
  numField(fPres,   sizeof fPres,   gPresOK ? gPres : gLastPres,   true, 1);
  numField(fSuelo,  sizeof fSuelo,  isnan(gSuelo) ? gLastSuelo : gSuelo, true, 2);
  numField(fTSuelo, sizeof fTSuelo, gTSuelo, gTSueloOK,      2);  // este si puede ir null
  numField(fBat,    sizeof fBat,    gBatV,   !isnan(gBatV),  2);

  char body[800];
  int n = snprintf(body, sizeof(body),
    "{\"vinedo_id\":\"%s\",\"source\":\"hardware\",\"node_id\":\"%s\","
    "\"temp_aire\":%s,\"humedad_aire\":%s,\"presion_atm\":%s,"
    "\"humedad_suelo\":%s,\"temp_suelo\":%s,\"rssi\":%d,\"bateria_v\":%s",
    VINEDO_ID, NODE_ID, fTAire, fHAire, fPres, fSuelo, fTSuelo, WiFi.RSSI(), fBat);
  // DIAG BMP: anexar coeficientes de calibracion + chip id + presion cruda.
  // Mira estos campos en el curl/Railway. Si diag_T1 o diag_P1 son 0 o 65535
  // -> calibracion corrupta (resoldar). Si son plausibles y pres sigue mal
  // -> sensor clon/dañado.
  n += snprintf(body + n, sizeof(body) - n,
    ",\"diag_chipid\":%u,\"diag_T1\":%u,\"diag_T2\":%d,\"diag_T3\":%d,"
    "\"diag_P1\":%u,\"diag_P2\":%d,\"diag_P3\":%d,\"diag_pres_raw\":%.1f",
    gBmpChipID, gDigT1, gDigT2, gDigT3, gDigP1, gDigP2, gDigP3,
    okBMP ? bmp.readPressure() / 100.0F : -1.0F);
  if (gFix)
    n += snprintf(body + n, sizeof(body) - n, ",\"lat\":%.6f,\"lon\":%.6f", gLat, gLon);
  snprintf(body + n, sizeof(body) - n, "}");

  HTTPClient http;
  http.begin(netClient, BACKEND_URL);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  lastHttp = http.POST(String(body));
  Serial.printf("[POST] HTTP %d  body=%s\n", lastHttp, body);
  if (lastHttp > 0) Serial.printf("[POST] resp: %s\n", http.getString().substring(0,120).c_str());
  http.end();
}
