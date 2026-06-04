# AgroTech Mendoza · by puma-code.com 🍇

Plataforma de **agricultura de precisión para viñedos y bodegas**: telemetría IoT, dashboards con KPIs, IA (predicción de cosecha, heladas y estrés hídrico), pronóstico agroclimático (heladas/granizo/golpe de calor/Zonda), **riego inteligente** y **monitoreo fitosanitario con IA**.

Desarrollado por **Puma-Code.com** (CEO: Roberto) · Mendoza, Argentina.

---

## 🗂 Estructura
```
agrotech-mendoza/
├── backend/      API FastAPI + simulador + IA + auth (Python)
├── frontend/     Landing comercial + panel admin (React + Vite)
├── hardware/     BOM, firmware ESP32/LoRa, diagrama y informe eléctrico
└── docs/         Informe comercial/ingeniería (PDF)
```

## 🚀 Puesta en marcha (desarrollo)

### 1) Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # opcional: editar claves
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- API: http://127.0.0.1:8000  ·  Docs interactivos: http://127.0.0.1:8000/docs
- El **simulador** arranca solo y genera telemetría de 4 cuarteles (Malbec, Cabernet, Chardonnay, Syrah).

### 2) Frontend (React)
```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_URL=http://127.0.0.1:8000
npm run dev
```
- Sitio: http://localhost:5173
- Panel bodega: http://localhost:5173/login

## 🔐 Acceso al panel
- Usuario demo: **roberto** · Contraseña: **agrotech2026** (definidos en `backend/.env`).
- Para invitar operadores: pestaña **Staff & Accesos** → genera un enlace `/setup-password` para que cada uno cree su contraseña.

## 🧠 Funcionalidades
| Módulo | Endpoint | Descripción |
|--------|----------|-------------|
| Telemetría | `GET /api/v1/telemetria/{id}` | Lecturas por cuartel |
| Heladas (IA) | `GET /api/v1/analisis/helada/{id}` | Punto de rocío + tendencia |
| Cosecha (IA) | `GET /api/v1/analisis/cosecha/{id}` | Ventana óptima Brix/pH |
| Histórico | `GET /api/v1/analisis/historico/{id}?periodo=anual\|mensual` | Series para reportes |
| Clima | `GET /api/v1/clima/{id}` | Pronóstico 5 días + riesgos |
| Riego | `GET/POST /api/v1/riego/{id}` | Estado y comandos |
| Fitosanitario (IA) | `GET /api/v1/fitosanitario/{id}` | Plagas detectadas + confianza |
| Chat comercial | `POST /api/v1/chat` | Asesor de ventas para bodegas |
| Ingesta hardware | `POST /api/v1/telemetria/ingest` | Datos reales del ESP32/LoRaWAN |

## 🔌 Conectar hardware real
Cuando instales los nodos, el gateway hace `POST /api/v1/telemetria/ingest` con el mismo JSON que produce el simulador (claves `temp_aire`, `humedad_aire`, `presion_atm`, `humedad_suelo`, ...). Ver `hardware/`.

## 🔑 Integraciones opcionales (sin obligación)
- **OpenWeather**: definí `OPENWEATHER_API_KEY` en `.env` para pronóstico real (si no, usa uno simulado).
- **OpenAI**: definí `OPENAI_API_KEY` y descomentá `openai` en `requirements.txt` para que el chat use IA generativa (si no, usa un motor de reglas que ya vende el producto).

## ✏️ Personalizar antes de publicar
- **WhatsApp / Email**: en `frontend/src/components/landing/Contact.jsx` (`WHATSAPP`, `EMAIL`).
- **Video**: en `frontend/src/components/landing/VideoSection.jsx` (`VIDEO_URL`) o subí `frontend/public/promo.mp4`.
- **Clave admin**: cambiá `ROOT_ADMIN_PASSWORD` y `SECRET_KEY` en `backend/.env`.

---
© Puma-Code.com · AgroTech Mendoza — Agricultura 4.0
