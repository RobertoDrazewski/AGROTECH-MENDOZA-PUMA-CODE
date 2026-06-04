"""Seguridad ligera del panel admin (solo librería estándar de Python).
Hash de contraseñas con PBKDF2-HMAC-SHA256 y tokens firmados con HMAC.
Almacén de administradores en un archivo JSON local (admins.json)."""
import os
import json
import hmac
import time
import base64
import hashlib
from app.core.config import settings

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADMINS_FILE = os.path.join(_BASE, "admins.json")


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


# ---------- Almacén de administradores ----------
def _load() -> dict:
    if not os.path.exists(ADMINS_FILE):
        return {}
    try:
        with open(ADMINS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save(data: dict):
    with open(ADMINS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_admin(username: str):
    return _load().get(username.lower())


def list_admins():
    return [{"username": u, "nombre": v.get("nombre"), "email": v.get("email"),
             "activo": v.get("password_hash") is not None}
            for u, v in _load().items()]


def create_invite(nombre: str, email: str) -> str:
    """Crea un admin SIN contraseña (pendiente de activación). Devuelve el username."""
    data = _load()
    username = email.split("@")[0].lower().replace(" ", ".")
    data[username] = {"nombre": nombre, "email": email.lower(), "password_hash": None}
    _save(data)
    return username


def set_password(email_or_user: str, password: str):
    data = _load()
    key = email_or_user.lower()
    # buscar por username o por email
    target = key.split("@")[0] if "@" in key else key
    if target not in data:
        # crear si no existía (auto-registro del primer admin)
        data[target] = {"nombre": target, "email": key if "@" in key else f"{target}@bodega.com"}
    data[target]["password_hash"] = hash_password(password)
    _save(data)
    return target
