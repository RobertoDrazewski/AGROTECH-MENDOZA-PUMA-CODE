# AgroTech Mendoza
### Telemetría IoT, inteligencia artificial y datos satelitales para la viticultura de precisión

**Por Puma-Code.com · Mendoza, Argentina**

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat&logo=scikit-learn&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32--S3-E7352C?style=flat&logo=espressif&logoColor=white)
![NASA POWER](https://img.shields.io/badge/NASA_POWER-0B3D91?style=flat&logo=nasa&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

---

## Qué es

AgroTech Mendoza es una plataforma que combina **sensores de campo de bajo costo**,
**datos climáticos satelitales** y un **modelo de machine learning** para anticipar
los dos riesgos que más afectan la rentabilidad de un viñedo: las **heladas** y el
**estrés hídrico**. Todo se centraliza en un panel web con alertas en tiempo real.

El sistema fue diseñado para las condiciones específicas de Mendoza —clima semiárido,
amplitud térmica marcada y heladas tardías de primavera— y validado con datos reales
de las cinco zonas vitivinícolas principales: Maipú, Luján de Cuyo, Agrelo, Tunuyán
y Tupungato.

---

## Las tres capas del sistema

**1. Sensado de campo (hardware propio)**
Nodos sensores solares construidos sobre la placa Heltec Wireless Tracker (ESP32-S3 +
LoRa + GPS). Cada nodo mide temperatura y humedad de aire, presión atmosférica,
temperatura y humedad de suelo, y reporta su posición por GPS. Autónomos, alimentados
por panel solar, pensados para vivir a la intemperie en la espaldera. El diseño,
despiece y manual de construcción son íntegramente de Puma-Code (costo de prototipo:
USD 234).

**2. Base de datos climática real (satelital)**
Cada cuartel se inicializa con el **histórico climático real de NASA POWER** para sus
coordenadas exactas: dos años de datos horarios (más de 17.500 registros por cuartel,
87.720 en total). Sobre esa base real, el sistema proyecta la evolución en vivo. Esto
significa que el modelo no aprende de datos inventados, sino del clima efectivamente
ocurrido en cada parcela.

**3. Inteligencia artificial**
Dos motores complementarios trabajan sobre esos datos:

- **Detección de anomalías climáticas** — un modelo *Isolation Forest* (scikit-learn),
  entrenado de forma no supervisada sobre el histórico real. Aprende cuál es el patrón
  climático normal de cada zona y marca como anomalía las condiciones que se desvían:
  típicamente, las heladas y los descensos térmicos bruscos.

- **Predicción de riesgo de helada** — un motor híbrido que combina **física**
  (cálculo del punto de rocío por la ecuación de Magnus-Tetens y la tasa de
  enfriamiento) con la **señal del modelo de ML**. La física explica *por qué* hay
  riesgo; el Isolation Forest confirma si el patrón es efectivamente anómalo. Cuando
  ambos coinciden, la alerta sube de nivel.

---

## Resultado del modelo (datos reales)

Entrenado sobre las 87.720 lecturas horarias reales de NASA POWER para los cinco
cuarteles:

| Métrica | Valor |
|---|---|
| Muestras de entrenamiento | 87.720 (2 años, 5 zonas) |
| Anomalías detectadas | 5.264 (6,0%) |
| Anomalías que son heladas (≤ 2 °C) | 40% |

El dato relevante: **el modelo identificó las heladas sin que se le indicara qué era
una helada**. Aprendió a reconocerlas como desviación del patrón normal, de forma
completamente no supervisada. Esto valida que el enfoque de detección de anomalías es
aplicable a la prevención de daño por frío en viñedos.

---

## Por qué importa para una bodega

- **Menos pérdidas por helada**: aviso temprano para activar defensa pasiva
  (quemadores, aspersión, riego) antes de que la temperatura cruce el umbral de daño.
- **Riego más eficiente**: seguimiento de humedad de suelo para regar cuando hace
  falta, ahorrando agua y energía.
- **Decisiones con datos reales**: cada cuartel tiene su propio historial climático y
  su propia línea de base, no un promedio genérico.
- **Escalable**: el mismo nodo se replica cuartel por cuartel; el panel los centraliza
  a todos.

---

## Estado de desarrollo

- ✅ Plataforma web y panel de control operativos en producción.
- ✅ Integración de histórico climático real de NASA POWER por cuartel.
- ✅ Modelo de ML (Isolation Forest) entrenado y validado con datos reales.
- ✅ Motor híbrido de predicción de heladas (física + ML).
- ✅ Hardware del nodo sensor diseñado, documentado y en fase de prototipo de campo.
- 🔄 Despliegue del primer nodo físico en viñedo (en curso).

---

## Stack técnico

Backend FastAPI (Python) · MySQL · scikit-learn · datos satelitales NASA POWER ·
frontend React + Vite + Tailwind · hardware ESP32-S3 / LoRa / GPS · desplegado en
Railway.

---

# Guía para desarrolladores

## Estructura del proyecto

```
backend/                  API FastAPI
  main.py                 entrypoint (uvicorn main:app)
  app/
    core/config.py        configuración y variables de entorno
    api/endpoints/        rutas: telemetría, predicciones, riego, etc.
    ml_models/
      anomaly_detector.py Isolation Forest (entrenamiento + inferencia)
      frost_isoforest.pkl modelo entrenado (versionado en el repo)
      frost_predictor.py  predictor físico de heladas (punto de rocío)
      harvest_optimizer.py curva de maduración Brix/pH
    simulator/            generador de telemetría en vivo
    db/
      nasa_loader.py      descarga del histórico de NASA POWER
      database.py         conexión MySQL (SQLAlchemy)
  scripts/fetch_nasa_power.py   script de descarga de datos NASA
  data/                   CSV histórico + caché NASA
frontend/                 React + Vite + Tailwind
```

## Requisitos

- Python 3.10+
- Node.js 18+
- MySQL (o una instancia en Railway)

## Backend — puesta en marcha

```bash
cd backend
python -m venv venv
source venv/bin/activate          # en Mac/Linux
pip install -r requirements.txt
```

Creá un archivo `.env` en `backend/` con al menos:

```env
DATABASE_URL=mysql+pymysql://usuario:password@host:puerto/basededatos
SECRET_KEY=una_clave_larga_y_secreta
ENV=development
# Opcionales (según funciones que uses):
OPENAI_API_KEY=...
ROOT_ADMIN_USER=...
ROOT_ADMIN_PASSWORD=...
```

Levantá el servidor:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Documentación interactiva de la API en `http://localhost:8000/docs`.

### Qué pasa al arrancar

1. Sincroniza los cuarteles en MySQL.
2. Siembra el histórico real de NASA **en segundo plano** (no bloquea el arranque).
   La siembra es **idempotente**: solo ocurre la primera vez; en reinicios no
   duplica datos. Si NASA no responde, el sistema usa un historial sintético y
   sigue funcionando.
3. Arranca el simulador, que continúa la serie en vivo desde el último dato real.

## Modelo de Machine Learning

El repo incluye un modelo ya entrenado (`frost_isoforest.pkl`). Para regenerarlo
con datos reales actualizados de NASA POWER para las coordenadas de los cuarteles:

```bash
cd backend
# 1. Descargar el histórico real (crea data/clima_historico_mendoza.csv)
python scripts/fetch_nasa_power.py --start 2023-01-01 --end 2024-12-31
# 2. Entrenar y serializar el modelo (imprime las métricas)
python -m app.ml_models.anomaly_detector --train
```

Si NASA no está disponible, agregá `--synthetic` al primer comando para usar un
respaldo realista.

### Endpoints de IA

- `GET /api/v1/analisis/anomalia/{vinedo_id}` — score de anomalía climática
  (Isolation Forest puro).
- `GET /api/v1/analisis/helada/{vinedo_id}` — riesgo de helada (física +
  Isolation Forest combinados).
- `POST /api/v1/telemetria/ingest` — ingreso de telemetría del nodo físico
  (Heltec). Auto-registra el cuartel a partir del GPS la primera vez.

## Frontend — puesta en marcha

```bash
cd frontend
npm install
npm run dev
```

Para apuntar el frontend a un backend local, creá `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Sin esa variable, el frontend usa la URL de producción por defecto.

Build de producción:

```bash
npm run build       # genera dist/
npm run preview     # previsualiza el build
```

## Despliegue (Railway)

El backend se despliega con el `Procfile` incluido:

```
web: python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Configurá las variables de entorno (`DATABASE_URL`, `SECRET_KEY`, etc.) en el
panel de Railway. El push a la rama `main` dispara el redeploy automático.

> **Nota:** `scikit-learn` es una dependencia pesada; el primer build puede
> tardar. Verificá que el plan de Railway tenga RAM suficiente.

---

*AgroTech Mendoza es un desarrollo de Puma-Code.com. Las métricas del modelo son
reproducibles a partir del histórico de NASA POWER incluido en el proyecto.*
