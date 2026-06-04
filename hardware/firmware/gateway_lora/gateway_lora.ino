/*
 * ============================================================================
 *  AgroTech Mendoza · by puma-code.com
 *  Gateway LoRa → HTTP (ESP32 single-channel, para demo / piloto)
 * ----------------------------------------------------------------------------
 *  Recibe los paquetes JSON de los nodos por LoRa y los reenvía por WiFi al
 *  backend FastAPI: POST {API_URL}/api/v1/telemetria/ingest
 *
 *  Para producción a escala se recomienda un gateway LoRaWAN multicanal
 *  (RAK7268 / Dragino LPS8) + servidor de red (ChirpStack o The Things Stack),
 *  que entrega los datos por MQTT/HTTP integration al mismo endpoint /ingest.
 *
 *  Librerías: LoRa (Sandeep Mistry), WiFi, HTTPClient (incluidas en core ESP32).
 * ============================================================================
 */

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ----------------------- CONFIGURACIÓN -------------------------------------
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";
const char* API_URL   = "http://192.168.1.100:8000/api/v1/telemetria/ingest";

#define LORA_FREQUENCY 915E6
#define LORA_SCK  18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS    5
#define LORA_RST  14
#define LORA_DIO0  2

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[Gateway] Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf("\n[Gateway] WiFi OK. IP: %s\n", WiFi.localIP().toString().c_str());
}

void setup() {
  Serial.begin(115200);
  connectWiFi();

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[Gateway] ERROR: LoRa no inicializó."); while (1);
  }
  LoRa.setSpreadingFactor(9);
  LoRa.setSignalBandwidth(125E3);
  LoRa.enableCrc();
  Serial.println("[Gateway] Escuchando paquetes LoRa...");
}

void forwardToBackend(const String& json) {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST((uint8_t*)json.c_str(), json.length());
  Serial.printf("[Gateway] POST -> HTTP %d\n", code);
  http.end();
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String data = "";
    while (LoRa.available()) data += (char)LoRa.read();
    int rssi = LoRa.packetRssi();
    Serial.printf("[Gateway] RX (RSSI %d): %s\n", rssi, data.c_str());
    if (data.startsWith("{")) forwardToBackend(data);
  }
}
