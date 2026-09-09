"""Acceso al panel de administración: login, creación de contraseña e invitación.

SEGURIDAD (revisado 09/2026): el login de demo público (ROOT_ADMIN_USER, el
usuario/clave que se muestra en la pantalla de login para que cualquiera
pruebe el panel) NUNCA es super admin, sin importar nada. Crear nuevos
accesos de administrador (/auth/invite) y ver la lista de accesos
(/auth/admins) requiere ser super admin de verdad (fila en la tabla `admins`
con rol='superadmin'), no simplemente estar logueado."""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.core.config import settings
from app.auth import security

router = APIRouter(prefix="/auth", tags=["Administración"])

ROL_DEMO_PUBLICO = "demo"


class LoginIn(BaseModel):
    username: str
    password: str


class SetupIn(BaseModel):
    email: str
    password: str


class InviteIn(BaseModel):
    nombre: str
    email: str


def _check_token(authorization: str | None) -> str:
    """Valida que haya un token vigente. Devuelve el username (sub)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token requerido.")
    user = security.verify_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(401, "Token inválido o expirado.")
    return user


def _check_superadmin(authorization: str | None) -> str:
    """Valida token Y que sea un super admin real. El login de demo público
    (ROOT_ADMIN_USER) queda excluido siempre, aunque alguien le cambiara el
    rol en algún lado — es defensa en profundidad a propósito."""
    user = _check_token(authorization)
    if user == settings.ROOT_ADMIN_USER.lower():
        raise HTTPException(403, "El acceso de demo público no puede administrar usuarios.")
    admin = security.get_admin(user)
    if not admin or admin.get("rol") != "superadmin":
        raise HTTPException(403, "Esta acción requiere permisos de super administrador.")
    return user


@router.post("/login")
def login(body: LoginIn):
    ident = body.username.strip().lower()
    # 1) Admin raíz por .env / config — ESTE es el login de demo público que
    #    se muestra en la pantalla de acceso. Rol fijo "demo": nunca puede
    #    crear ni ver otros accesos, sin importar lo que diga la DB.
    if ident in (settings.ROOT_ADMIN_USER.lower(),):
        if body.password == settings.ROOT_ADMIN_PASSWORD:
            return {"success": True, "token": security.create_token(ident),
                    "username": ident, "nombre": "Demo público", "rol": ROL_DEMO_PUBLICO}
        raise HTTPException(401, "Contraseña incorrecta.")
    # 2) Admins reales (tabla admins en MySQL)
    admin = security.get_admin(ident)
    if not admin or not admin.get("password_hash"):
        raise HTTPException(401, "Usuario no encontrado o sin contraseña activada.")
    if not security.verify_password(body.password, admin["password_hash"]):
        raise HTTPException(401, "Contraseña incorrecta.")
    return {"success": True, "token": security.create_token(ident),
            "username": ident, "nombre": admin.get("nombre"), "rol": admin.get("rol")}


@router.get("/me")
def me(authorization: str | None = Header(default=None)):
    """Quién soy y qué rol tengo — lo usa el panel para decidir qué mostrar
    (por ej. ocultar 'Staff & Accesos' si no sos super admin)."""
    user = _check_token(authorization)
    if user == settings.ROOT_ADMIN_USER.lower():
        return {"username": user, "nombre": "Demo público", "rol": ROL_DEMO_PUBLICO}
    admin = security.get_admin(user)
    if not admin:
        raise HTTPException(401, "Usuario no encontrado.")
    return {"username": admin.get("username"), "nombre": admin.get("nombre"), "rol": admin.get("rol")}


@router.post("/setup-password")
def setup_password(body: SetupIn):
    if len(body.password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres.")
    username = security.set_password(body.email, body.password)
    return {"status": "success", "success": True, "username": username}


@router.post("/invite")
def invite(body: InviteIn, authorization: str | None = Header(default=None)):
    _check_superadmin(authorization)
    username = security.create_invite(body.nombre, body.email)
    return {"status": "success", "username": username,
            "setup_url": f"/setup-password?email={body.email}"}


@router.get("/admins")
def admins(authorization: str | None = Header(default=None)):
    _check_superadmin(authorization)
    return security.list_admins()
