"""Endpoints comerciales de AgroTech Mendoza:
- POST /contacto    -> guarda la consulta y la envía por mail a info@puma-code.com
- POST /presupuesto -> registra el pedido (chat + datos del cliente) y lo envía por mail
                       a ventas. NO calcula ni muestra precios: un asesor humano analiza
                       el caso y responde manualmente. El cliente solo recibe un acuse en
                       el chat de que será contactado a la brevedad.
"""
from fastapi import APIRouter
from pydantic import BaseModel, field_validator
from app.core.config import settings
from app.services.mailer import send_mail
import html as _html

router = APIRouter(prefix="", tags=["Comercial"])

# --- Límites de seguridad ---
MAX_FIELD_LEN = 200       # nombre / email / bodega
MAX_HISTORY = 20          # mensajes del chat que se adjuntan al mail
MAX_MSG_LEN = 1500        # caracteres por mensaje del chat


# ---------- Helpers ----------
def esc(v):
    return _html.escape(str(v if v is not None else ""))


# ============================================================
#  CONTACTO
# ============================================================
class ContactoIn(BaseModel):
    nombre: str
    bodega: str | None = None
    email: str
    telefono: str | None = None
    mensaje: str | None = None

    @field_validator("nombre", "bodega", "email", "telefono", "mensaje")
    @classmethod
    def _trim(cls, v):
        if v is None:
            return v
        return str(v).strip()[:2000]


@router.post("/contacto")
def contacto(body: ContactoIn):
    # Guardar en la base (si está configurada)
    if settings.DATABASE_URL:
        try:
            from app.db.database import get_session
            from app.db import models
            s = get_session()
            try:
                s.add(models.Contacto(nombre=body.nombre, bodega=body.bodega,
                                      email=body.email, telefono=body.telefono,
                                      mensaje=body.mensaje))
                s.commit()
            finally:
                s.close()
        except Exception as e:
            print(f"[CONTACTO] No se pudo guardar en DB: {e}")

    # Enviar mail a info@puma-code.com
    htmlmail = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
      <div style="background:linear-gradient(135deg,#7ba32f,#9bcc44);padding:22px;border-radius:16px 16px 0 0;">
        <p style="margin:0;color:#ecfccb;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">🍇 AgroTech Mendoza · by puma-code</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:20px;">Nueva consulta desde la web</h1>
      </div>
      <div style="padding:22px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;width:35%;">Nombre</td><td style="padding:8px 0;font-weight:bold;">{esc(body.nombre)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Bodega / Finca</td><td style="padding:8px 0;font-weight:bold;">{esc(body.bodega)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;font-weight:bold;">{esc(body.email)}</td></tr>
          <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Teléfono</td><td style="padding:8px 0;font-weight:bold;">{esc(body.telefono)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Mensaje</td><td style="padding:8px 0;">{esc(body.mensaje)}</td></tr>
        </table>
        <p style="margin:20px 0 0;text-align:center;color:#9ca3af;font-size:11px;">AgroTech Mendoza · Agricultura de precisión · Mendoza, Argentina — info@puma-code.com</p>
      </div>
    </div>"""
    enviado = send_mail(settings.EMAIL_INFO, f"🍇 Consulta AgroTech · {body.nombre}",
                        htmlmail, reply_to=body.email)
    return {"success": True, "email_enviado": enviado}


# ============================================================
#  PRESUPUESTO  (solicitud — sin cálculo de precios)
# ============================================================
class PresupuestoIn(BaseModel):
    chatHistory: list
    userData: dict  # {name, email, bodega?}


def _safe_user_data(data: dict):
    name = str(data.get("name", "")).strip()[:MAX_FIELD_LEN]
    email = str(data.get("email", "")).strip()[:MAX_FIELD_LEN]
    bodega = str(data.get("bodega", "") or "").strip()[:MAX_FIELD_LEN]
    return name, email, bodega


def _safe_history(history):
    out = []
    if not isinstance(history, list):
        return out
    for m in history[-MAX_HISTORY:]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        content = str(m.get("content", ""))[:MAX_MSG_LEN]
        out.append({"role": role, "content": content})
    return out


@router.post("/presupuesto")
def presupuesto(body: PresupuestoIn):
    name, email, bodega = _safe_user_data(body.userData)
    if not name or "@" not in email:
        return {"success": False, "error": "Datos de contacto inválidos (nombre y email)."}

    history = _safe_history(body.chatHistory)

    # Render del chat para que ventas tenga contexto (texto escapado).
    chat_html = "".join(
        f'<div style="margin-bottom:8px;padding:10px;border-radius:8px;'
        f'background:{"#f0f9ff" if m["role"]=="user" else "#f3f4f6"};">'
        f'<small style="color:#6b7280;font-size:10px;">'
        f'{esc(name) if m["role"]=="user" else "AgroTech IA"}</small>'
        f'<p style="margin:4px 0;font-size:13px;">{esc(m["content"])}</p></div>'
        for m in history
    ) or '<p style="color:#9ca3af;font-size:13px;">El cliente no escribió en el chat antes de pedir el presupuesto.</p>'

    # Mail interno para el equipo de ventas (NO se envía precio a nadie).
    mail_html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
      <div style="background:linear-gradient(135deg,#7ba32f,#9bcc44);padding:24px;border-radius:16px 16px 0 0;">
        <p style="margin:0;color:#ecfccb;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">🍇 AgroTech Mendoza · by puma-code</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:22px;">Nueva solicitud de presupuesto</h1>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
        <p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.6;">
          Un visitante pidió un presupuesto desde el chat de la web. Analizá la conversación y
          contactá al cliente para enviarle la cotización a medida.
        </p>
        <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 18px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;width:35%;">Nombre</td><td style="padding:8px 0;font-weight:bold;">{esc(name)}</td></tr>
            <tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;font-weight:bold;">{esc(email)}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Bodega / Finca</td><td style="padding:8px 0;font-weight:bold;">{esc(bodega) or '—'}</td></tr>
          </table>
        </div>
        <h4 style="margin:0 0 10px;color:#9ca3af;font-size:13px;">💬 Conversación con el asistente</h4>
        {chat_html}
        <p style="margin:24px 0 0;text-align:center;color:#9ca3af;font-size:11px;">AgroTech Mendoza · by puma-code.com · Mendoza, Argentina — info@puma-code.com</p>
      </div>
    </div>"""

    enviado = send_mail(settings.EMAIL_INFO,
                        f"📤 Solicitud de presupuesto AgroTech · {name}"
                        + (f" · {bodega}" if bodega else ""),
                        mail_html, reply_to=email)

    # Guardar lead en contactos
    if settings.DATABASE_URL:
        try:
            from app.db.database import get_session
            from app.db import models
            s = get_session()
            try:
                s.add(models.Contacto(
                    nombre=name, bodega=bodega, email=email,
                    mensaje="[SOLICITUD DE PRESUPUESTO desde el chat]"))
                s.commit()
            finally:
                s.close()
        except Exception as e:
            print(f"[PRESUPUESTO] No se pudo guardar lead: {e}")

    # Acuse para el cliente: SIN precios, solo confirmación.
    resumen_cliente = (
        f"¡Gracias por enviarnos la solicitud, {name}! 🍇\n\n"
        "En breve una persona del área de ventas estará comunicándose con usted "
        "para darle una propuesta a medida para su viñedo."
    )

    return {"success": True, "email_enviado": enviado, "resumen_cliente": resumen_cliente}