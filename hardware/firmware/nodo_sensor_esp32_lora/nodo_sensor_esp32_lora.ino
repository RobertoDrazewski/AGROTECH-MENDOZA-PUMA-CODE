/*
 * ============================================================================
 *  AgroTech Mendoza · by puma-code.com
 *  Nodo Sensor de Campo — ESP32 + LoRa (SX1276 / RFM95) 915 MHz
 * ----------------------------------------------------------------------------
 *  Lee sensores (temperatura aire/suelo, humedad aire/suelo, presión),
 *  arma un paquete JSON compacto, lo transmite por LoRa al gateway y entra en
 *  deep-sleep para maximizar la autonomía con alimentación solar.
 *
 *  Librerías (Arduino IDE / PlatformIO):
 *    - LoRa by Sandeep Mistry        (radio SX1276/RFM95)
 *    - OneWire + DallasTemperature   (DS18B20, temperatura de suelo)
 *    - Adafruit_SHT31                (temp/hum de aire) [o DHT para DHT22]
 *    - Adafruit_BMP280               (presión atmosférica)
 *
 *  NOTA: Esta es una implementación LoRa punto-a-punto lista para demo. Para
 *  LoRaWAN real (OTAA/ABP) usar la librería MCCI LMIC y registrar el device
 *  en el gateway / servidor de red (TTN, ChirpStack, etc.). Ver gateway_lora/.
 * ============================================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_SHT31.h>
#include <Adafruit_BMP280.h>

// ----------------------- CONFIGURACIÓN DEL NODO ----------------------------
#define VINEDO_ID        "Cuartel_Malbec_1"   // Identificador único del cuartel
#define LORA_FREQUENCY   915E6                // Banda AR/AU915 (Argentina)
#define TX_POWER_DBM     17                   // Potencia de transmisión
#define SLEEP_MINUTES    15                   // Intervalo entre lecturas

// ----------------------- PINOUT (ESP32) ------------------------------------
// LoRa SX1276 (VSPI)
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_SS     5
#define LORA_RST   14
#define LORA_DIO0   2
// DS18B20 (temperatura de suelo)
#define ONE_WIRE_PIN 4
// Sensor capacitivo de humedad de suelo (ADC)
#define SOIL_ADC_PIN 34
#define SOIL_DRY     3200   // calibrar: lectura ADC en seco
#define SOIL_WET     1200   // calibrar: lectura ADC en agua

#define uS_TO_S 1000000ULL

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature soilTemp(&oneWire);
Adafruit_SHT31 sht31 = Adafruit_SHT31();
Adafruit_BMP280 bmp;

RTC_DATA_ATTR int bootCount = 0;   // persiste durante el deep-sleep

// --------------------------------------------------------------------------
float readSoilMoisture() {
  long raw = 0;
  for (int i = 0; i < 10; i++) { raw += analogRead(SOIL_ADC_PIN); delay(5); }
  raw /= 10;
  float pct = (float)(SOIL_DRY - raw) * 100.0 / (float)(SOIL_DRY - SOIL_WET);
  if (pct < 0) pct = 0; if (pct > 100) pct = 100;
  return pct;
}

bool initRadio() {
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) return false;
  LoRa.setTxPower(TX_POWER_DBM);
  LoRa.setSpreadingFactor(9);     // SF9: equilibrio alcance/consumo
  LoRa.setSignalBandwidth(125E3);
  LoRa.enableCrc();
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(100);
  bootCount++;
  Serial.printf("\n[AgroTech] Boot #%d - %s\n", bootCount, VINEDO_ID);

  Wire.begin();
  soilTemp.begin();
  bool okSht = sht31.begin(0x44);
  bool okBmp = bmp.begin(0x76);

  // --- Lectura de sensores ---
  soilTemp.requestTemperatures();
  float tSuelo  = soilTemp.getTempCByIndex(0);
  float tAire   = okSht ? sht31.readTemperature() : NAN;
  float hAire   = okSht ? sht31.readHumidity()    : NAN;
  float presion = okBmp ? bmp.readPressure() / 100.0F : NAN;  // hPa
  float hSuelo  = readSoilMoisture();

  // --- Paquete JSON (las claves coinciden con el backend FastAPI) ---
  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"vinedo_id\":\"%s\",\"temp_aire\":%.2f,\"humedad_aire\":%.2f,"
    "\"presion_atm\":%.1f,\"humedad_suelo\":%.2f,\"bat\":%d}",
    VINEDO_ID,
    isnan(tAire) ? tSuelo : tAire,
    isnan(hAire) ? 0.0 : hAire,
    isnan(presion) ? 1013.0 : presion,
    hSuelo, bootCount);

  Serial.printf("[AgroTech] Payload: %s\n", payload);

  // --- Transmisión LoRa ---
  if (initRadio()) {
    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();
    Serial.println("[AgroTech] Paquete LoRa enviado.");
    LoRa.sleep();
  } else {
    Serial.println("[AgroTech] ERROR: radio LoRa no inicializó.");
  }

  // --- Deep sleep ---
  Serial.printf("[AgroTech] Durmiendo %d min...\n", SLEEP_MINUTES);
  esp_sleep_enable_timer_wakeup((uint64_t)SLEEP_MINUTES * 60ULL * uS_TO_S);
  esp_deep_sleep_start();
}

void loop() {
  // No se usa: el ciclo de vida es setup() -> deep sleep -> reset.
}
