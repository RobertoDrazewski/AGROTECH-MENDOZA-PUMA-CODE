"""Seguridad del panel admin.
- Hash de contraseñas (PBKDF2) y tokens firmados (HMAC): librería estándar.
- Almacén de administradores: tabla `admins` en MySQL (vía SQLAlchemy).
Las importaciones de base de datos son perezosas para no romper el arranque
si faltara la configuración."""
import os
import json
import hmac
import time
import base64
import hashlib
from app.core.config import settings


# ---------- Hash de contraseñas ----------
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False


# ---------- Tokens firmados (mini-JWT) ----------
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def create_token(username: str) -> str:
    exp = int(time.time()) + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    payload = _b64(json.dumps({"sub": username, "exp": exp}).encode())
    sig = _b64(hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify_token(token: str):
    try:
        payload, sig = token.split(".")
        expected = _b64(hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_unb64(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data.get("sub")
    except Exception:
        return None


# ---------- Almacén de administradores (MySQL) ----------
def _session():
    from app.db.database import get_session
    return get_session()


def get_admin(username: str):
    """Devuelve un dict del admin por username, o None."""
    from app.db import models
    s = _session()
    try:
        a = s.query(models.Admin).filter_by(username=username.lower()).first()
        if not a:
            return None
        return {"username": a.username, "nombre": a.nombre, "email": a.email,
                "password_hash": a.password_hash, "rol": a.rol, "activo": a.activo}
    finally:
        s.close()


def list_admins():
    from app.db import models
    s = _session()
    try:
        rows = s.query(models.Admin).order_by(models.Admin.id).all()
        return [{"username": a.username, "nombre": a.nombre, "email": a.email,
                 "rol": a.rol, "activo": bool(a.activo)} for a in rows]
    finally:
        s.close()


def create_invite(nombre: str, email: str) -> str:
    """Crea un admin SIN contraseña (pendiente de activar). Devuelve el username."""
    from app.db import models
    s = _session()
    try:
        username = email.split("@")[0].lower().replace(" ", ".")
        existing = s.query(models.Admin).filter_by(username=username).first()
        if existing:
            return username
        s.add(models.Admin(username=username, nombre=nombre, email=email.lower(),
                           rol="operador", activo=False, password_hash=None))
        s.commit()
        return username
    finally:
        s.close()


def set_password(email_or_user: str, password: str):
    """Activa el acceso de una cuenta que el super admin YA CREÓ con
    /auth/invite. A propósito NO crea cuentas nuevas: si el email no
    corresponde a una invitación pendiente, se rechaza (ValueError
    "NO_INVITADO"). Tampoco permite pisar una contraseña ya activa
    (ValueError "YA_ACTIVA") — para eso el super admin usa "Reenviar
    acceso" (reset_password), que primero invalida la actual.
    Esto es lo que evita que cualquiera se autoregistre desde
    /setup-password con un email inventado."""
    from app.db import models
    s = _session()
    try:
        key = email_or_user.lower()
        if "@" in key:
            admin = s.query(models.Admin).filter_by(email=key).first()
        else:
            admin = s.query(models.Admin).filter_by(username=key).first()
        if not admin:
            raise ValueError("NO_INVITADO")
        if admin.password_hash:
            raise ValueError("YA_ACTIVA")
        admin.password_hash = hash_password(password)
        admin.activo = True
        s.commit()
        return admin.username
    finally:
        s.close()


def reset_password(username: str):
    """Solo para el super admin: invalida la contraseña actual de una
    cuenta para que pueda volver a activarse con /setup-password (por
    ejemplo, si el cliente se olvidó la clave). No borra la cuenta ni
    cambia su rol, solo la deja pendiente de activar de nuevo."""
    from app.db import models
    s = _session()
    try:
        admin = s.query(models.Admin).filter_by(username=username.lower()).first()
        if not admin:
            return None
        admin.password_hash = None
        admin.activo = False
        s.commit()
        return admin.username
    finally:
        s.close()
