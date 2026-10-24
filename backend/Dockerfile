# Backend FastAPI de AgroTech Mendoza (Python 3.11, igual que runtime.txt).
# Build context = carpeta backend/  (en Coolify: Base Directory = /backend).
# No instala ultralytics/torch (igual que en Railway): el detector de plagas
# usa su modo de respaldo y no consume la RAM de la VPS.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
