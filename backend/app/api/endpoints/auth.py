"""Acceso al panel de administración: login, creación de contraseña e invitación."""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.core.config import settings
from app.auth import security

router = APIRouter(prefix="/auth", tags=["Administración"])


class LoginIn(BaseModel):
    username: str
    password: str


class SetupIn(BaseModel):
    email: str
    password: str


class InviteIn(BaseModel):
    nombre: str
    email: str


def _check_token(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token requerido.")
    user = security.verify_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(401, "Token inválido o expirado.")
    return user


@router.post("/login")
def login(body: LoginIn):
    ident = body.username.strip().lower()
    # 1) Admin raíz por .env / config
    if ident in (settings.ROOT_ADMIN_USER.lower(),):
        if body.password == settings.ROOT_ADMIN_PASSWORD:
            return {"success": True, "token": security.create_token(ident), "username": ident}
        raise HTTPException(401, "Contraseña incorrecta.")
    # 2) Admins del almacén JSON
    admin = security.get_admin(ident)
    if not admin or not admin.get("password_hash"):
        raise HTTPException(401, "Usuario no encontrado o sin contraseña activada.")
    if not security.verify_password(body.password, admin["password_hash"]):
        raise HTTPException(401, "Contraseña incorrecta.")
    return {"success": True, "token": security.create_token(ident),
            "username": ident, "nombre": admin.get("nombre")}


@router.post("/setup-password")
def setup_password(body: SetupIn):
    if len(body.password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres.")
    username = security.set_password(body.email, body.password)
    return {"status": "success", "success": True, "username": username}


@router.post("/invite")
def invite(body: InviteIn, authorization: str | None = Header(default=None)):
    _check_token(authorization)
    username = security.create_invite(body.nombre, body.email)
    return {"status": "success", "username": username,
            "setup_url": f"/setup-password?email={body.email}"}


@router.get("/admins")
def admins(authorization: str | None = Header(default=None)):
    _check_token(authorization)
    return security.list_admins()
