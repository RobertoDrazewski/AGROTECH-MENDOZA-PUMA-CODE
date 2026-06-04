# Lista de Materiales (BOM) — Nodo Sensor AgroTech Mendoza
**Proyecto:** AgroTech Mendoza · by puma-code.com
**Versión:** 2.0 · Nodo de campo autónomo solar con telemetría LoRaWAN

> Precios de referencia en USD (orientativos, mercado argentino/importación, 2026). Verificar con proveedor antes de comprar.

## 1. Nodo sensor de campo (por unidad / por cuartel)

| # | Componente | Especificación | Cant. | Precio U. (USD) | Subtotal |
|---|------------|----------------|:-----:|:---------------:|:--------:|
| 1 | Microcontrolador | ESP32-WROOM-32 (WiFi/BLE, dual-core) | 1 | 7.00 | 7.00 |
| 2 | Módulo LoRa | SX1276 / RFM95W 915 MHz (banda AU915/AR) | 1 | 9.00 | 9.00 |
| 3 | Antena LoRa | 915 MHz, conector SMA, 3 dBi | 1 | 4.00 | 4.00 |
| 4 | Sensor temp. suelo | DS18B20 sonda inox, cable 1 m | 1 | 3.50 | 3.50 |
| 5 | Sensor temp/hum aire | SHT31 (preciso) o DHT22 (económico) | 1 | 6.00 | 6.00 |
| 6 | Sensor humedad suelo | Capacitivo v2.0 (resistente a corrosión) | 1 | 3.00 | 3.00 |
| 7 | Sensor presión | BMP280 (presión + temp) I2C | 1 | 2.50 | 2.50 |
| 8 | Panel solar | 6 V / 2 W policristalino | 1 | 8.00 | 8.00 |
| 9 | Controlador de carga | TP4056 con protección (DW01) | 1 | 1.50 | 1.50 |
| 10 | Batería | Li-Ion 18650 3.7 V 3000 mAh | 1 | 5.00 | 5.00 |
| 11 | Portabatería | Soporte 18650 con cables | 1 | 1.00 | 1.00 |
| 12 | Regulador | MCP1700 / AMS1117 3.3 V LDO | 1 | 1.00 | 1.00 |
| 13 | Gabinete | Caja estanca IP65 100×68×50 mm + prensacables | 1 | 6.00 | 6.00 |
| 14 | Conectores/cableado | Borneras, cable AWG22, termocontraíble | 1 | 3.00 | 3.00 |
| 15 | PCB / protoboard | PCB perforada o PCB a medida | 1 | 2.00 | 2.00 |
| | | | | **Subtotal nodo** | **62.00** |

## 2. Actuador de riego (opcional, por cuartel con riego)

| # | Componente | Especificación | Cant. | Precio U. (USD) | Subtotal |
|---|------------|----------------|:-----:|:---------------:|:--------:|
| 16 | Electroválvula | 1" 12 VDC latch (bajo consumo) | 1 | 14.00 | 14.00 |
| 17 | Driver/relé | Módulo relé 1 canal optoacoplado o H-bridge para latch | 1 | 2.50 | 2.50 |
| 18 | Fuente extra | Batería/solar dimensionado para válvula | 1 | 6.00 | 6.00 |
| | | | | **Subtotal actuador** | **22.50** |

## 3. Gateway LoRaWAN (uno por finca / hasta ~10 km de nodos)

| # | Componente | Especificación | Cant. | Precio U. (USD) | Subtotal |
|---|------------|----------------|:-----:|:---------------:|:--------:|
| 19 | Gateway LoRaWAN | RAK7268 / Dragino LPS8 (8 canales) o ESP32+SX1276 (single-channel demo) | 1 | 120.00 | 120.00 |
| 20 | Antena gateway | 915 MHz 5–8 dBi exterior + cable | 1 | 18.00 | 18.00 |
| 21 | Conectividad backhaul | 4G/Ethernet/WiFi a Internet | 1 | — | — |
| | | | | **Subtotal gateway** | **138.00** |

## 4. Costo estimado de una finca tipo (4 cuarteles)

| Concepto | Cant. | Subtotal (USD) |
|----------|:-----:|:--------------:|
| Nodos sensores | 4 | 248.00 |
| Actuadores de riego | 4 | 90.00 |
| Gateway LoRaWAN | 1 | 138.00 |
| Instalación / puesta en marcha (estimado) | — | 150.00 |
| **TOTAL aproximado** | | **≈ 626.00 USD** |

> No incluye software/licencia de plataforma, servidor de aplicación ni mantenimiento. Estos se cotizan aparte como servicio de Puma-Code.com.

## Notas de selección
- **Banda de frecuencia:** En Argentina usar **AU915 / AR915 MHz** (no EU868). Configurar el plan de canales correspondiente en el firmware y el gateway.
- **Sensor de aire:** SHT31 recomendado por precisión y estabilidad; DHT22 como alternativa económica.
- **Brix y pH:** no existen sensores in-situ confiables y económicos para uva en vid; se obtienen por **muestreo + refractómetro/pH-metro** y se cargan manualmente, o se estiman por modelo a partir de clima acumulado (GDD). El sistema soporta ambas vías.
- **Electroválvula latch:** preferible a solenoide continuo por ahorro de energía (solo consume en el pulso de apertura/cierre).
