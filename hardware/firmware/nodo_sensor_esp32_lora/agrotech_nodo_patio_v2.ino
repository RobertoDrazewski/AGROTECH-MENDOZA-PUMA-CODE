#include <Wire.h>

void setup() {
  Serial.begin(115200);
  delay(300);
  Wire.begin(6, 7);   // SDA=6, SCL=7 (tu Heltec)
  Serial.println("\n[Scan I2C]");
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0)
      Serial.printf("  Dispositivo en 0x%02X\n", a);
  }
  // Leer el registro de ID del chip (0xD0) en 0x76 y 0x77
  for (byte addr : {0x76, 0x77}) {
    Wire.beginTransmission(addr);
    Wire.write(0xD0);                 // registro CHIP_ID
    if (Wire.endTransmission() == 0) {
      Wire.requestFrom(addr, (uint8_t)1);
      if (Wire.available()) {
        byte id = Wire.read();
        Serial.printf("  0x%02X -> CHIP_ID 0x%02X = %s\n", addr, id,
          id==0x58 ? "BMP280" :
          id==0x60 ? "BME280 (mide humedad!)" :
          id==0x61 ? "BME680" :
          id==0x55 ? "BMP180" : "desconocido");
      }
    }
  }
}
void loop() {}
