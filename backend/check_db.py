"""Chequeo rápido de la conexión a la base de datos.
Uso:  python check_db.py
"""
import sys

try:
    from sqlalchemy import create_engine, text
except ImportError:
    print("❌ Falta SQLAlchemy. Ejecutá:  pip install sqlalchemy pymysql")
    sys.exit(1)

from app.core.config import settings

if not settings.DATABASE_URL:
    print("❌ DATABASE_URL no está en el .env.")
    print("   Agregá: DATABASE_URL=mysql+pymysql://root:PASS@HOST.proxy.rlwy.net:PUERTO/railway")
    sys.exit(1)

url = settings.DATABASE_URL
if url.startswith("mysql://"):
    url = url.replace("mysql://", "mysql+pymysql://", 1)

print(f"→ Conectando a: {url.split('@')[-1]}")
try:
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        tablas = [r[0] for r in conn.execute(text("SHOW TABLES")).fetchall()]
    print("✅ Conexión EXITOSA.")
    if tablas:
        print(f"   Tablas encontradas ({len(tablas)}): {', '.join(tablas)}")
    else:
        print("   La base está vacía (sin tablas). Podés crearlas con POST /api/v1/db/init")
except Exception as e:
    print("❌ No se pudo conectar:")
    print("  ", e)
    sys.exit(1)
