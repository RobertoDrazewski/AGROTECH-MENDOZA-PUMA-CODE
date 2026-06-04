# Informe de Ingeniería Eléctrica — Nodo Sensor AgroTech Mendoza
**Proyecto:** AgroTech Mendoza · by puma-code.com
**Documento:** Dimensionamiento eléctrico, balance de energía y consideraciones de instalación
**Revisión:** 2.0

---

## 1. Objetivo
Definir el diseño eléctrico del nodo sensor de campo para que opere de forma **autónoma e ininterrumpida** mediante energía solar, con telemetría inalámbrica de largo alcance (LoRa/LoRaWAN) en viñedos de Mendoza.

## 2. Arquitectura eléctrica
La cadena de energía es:

`Panel Solar 6V/2W → TP4056 (cargador Li-Ion con protección) → Batería 18650 3.7V → LDO 3.3V (MCP1700) → ESP32 + sensores + radio LoRa`

- Nivel lógico de todo el sistema: **3.3 V**.
- Bus I2C compartido (SHT31 + BMP280) en GPIO21/GPIO22.
- DS18B20 en 1-Wire (GPIO4) con resistencia pull-up de 4.7 kΩ.
- Sensor capacitivo de humedad de suelo en ADC (GPIO34); requiere **calibración** seco/húmedo.

## 3. Balance de energía (presupuesto)

### 3.1 Consumo por estado
| Estado | Corriente típica | Duración por ciclo |
|--------|:----------------:|:------------------:|
| Deep sleep (ESP32 + periféricos apagados) | ~0.05 mA | ~15 min |
| Lectura de sensores | ~40 mA | ~2 s |
| Transmisión LoRa (TX, 17 dBm) | ~120 mA | ~0.5 s |
| Adquisición WiFi (solo si se usa, no en operación normal) | ~160 mA | — |

### 3.2 Energía por ciclo (intervalo de 15 min)
- Activo: (40 mA × 2 s) + (120 mA × 0.5 s) ≈ **0.039 mAh** por ciclo.
- Sleep: 0.05 mA × 0.25 h ≈ **0.0125 mAh** por ciclo.
- **Total por ciclo ≈ 0.052 mAh** → **~4.97 mAh/día** (96 ciclos/día).

> Margen práctico (autodescarga, picos, temperatura): se adopta **~12 mAh/día**.

### 3.3 Autonomía y recarga
- Batería 18650 de 3000 mAh → autonomía teórica **sin sol > 200 días** al consumo calculado (en la práctica, limitada por autodescarga y frío: se asegura **>10 días** de respaldo).
- Panel 6V/2W entrega ~330 mA pico; con **2–3 h de sol efectivo** genera **>600 mAh/día**, muy por encima del consumo. **Superávit amplio**, apto incluso para días nublados consecutivos.

**Conclusión:** el sistema es **energéticamente autosuficiente** con margen holgado. El cuello de botella no es la energía sino la antena/alcance y la protección mecánica.

## 4. Alcance de radio (LoRa)
- Frecuencia: **AR/AU 915 MHz** (normativa argentina; no usar EU868).
- SF9 / BW125 kHz: equilibrio alcance-consumo. Alcance rural típico **2–8 km** con línea de vista parcial; hasta ~10–15 km con antenas y altura favorables.
- Recomendación: gateway en punto alto de la finca (tanque, poste, casco); antena 5–8 dBi exterior.

## 5. Protecciones y seguridad eléctrica
- TP4056 con **DW01 + FS8205**: protección de sobrecarga, sobredescarga y cortocircuito de la celda Li-Ion.
- Diodo Schottky en serie con el panel (anti-retorno nocturno) si el cargador no lo incluye.
- Fusible rearmable (PTC) en la línea de batería recomendado.
- **Li-Ion y temperatura:** no cargar por debajo de 0 °C. En zonas de heladas frecuentes, considerar batería LiFePO4 (más tolerante) o cortar carga por temperatura.

## 6. Gabinete e instalación (intemperie)
- Caja **IP65** mínimo; preferible IP66/IP67 en zonas de lluvia/granizo.
- Prensacables estancos para sondas; sellado de pasamuros.
- Sensor de suelo enterrado a profundidad de raíz activa (20–40 cm según cultivo).
- Panel orientado al **norte** (hemisferio sur), inclinación ≈ latitud (~33°).
- Puesta a tierra del gabinete metálico (si aplica) y descargador de sobretensiones en el gateway.

## 7. Actuador de riego (opcional)
- Electroválvula **12 V tipo latch** (consume solo en el pulso) accionada por driver H-bridge/relé.
- Alimentación independiente dimensionada aparte (la válvula excede el presupuesto del nodo sensor).
- Comando recibido por **downlink LoRaWAN** desde la plataforma (modo Auto/Manual).

## 8. Lista de verificación de puesta en marcha
1. Calibrar ADC del sensor capacitivo (valores seco/húmedo en el firmware).
2. Configurar `VINEDO_ID` único por nodo y banda 915 MHz.
3. Verificar pull-up 4.7 kΩ en DS18B20.
4. Confirmar orientación/inclinación del panel y carga de batería inicial.
5. Validar recepción en el gateway (RSSI) y POST exitoso a `/api/v1/telemetria/ingest`.
6. Sellar gabinete y fijar a poste/espaldera.

---
*Documento técnico de referencia. Los valores de consumo son típicos y deben verificarse con medición en banco. Ingeniería: Puma-Code.com.*
