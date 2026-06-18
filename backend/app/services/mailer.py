"""Envío de correo vía Gmail Workspace (SMTP + App Password).
Misma configuración que Puma-Code (puerto 465 SSL), que funciona en Railway.
Variables de entorno (definirlas en Railway, NUNCA en el código):
  GMAIL_USER          = info@puma-code.com
  GMAIL_APP_PASSWORD  = (App Password de Google de 16 caracteres, sin espacios)
  EMAIL_INFO          = info@puma-code.com
  EMAIL_SECURITY      = security@puma-code.com
"""
import ssl
import smtplib
import certifi
from email.message import EmailMessage
from app.core.config import settings


def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    """Envía un mail HTML. `to` puede ser str o lista. Devuelve True si se envió."""
    if not settings.GMAIL_APP_PASSWORD:
        print("[MAILER] Falta GMAIL_APP_PASSWORD; no se envió el correo.")
        return False

    recipients = [to] if isinstance(to, str) else list(to)
    msg = EmailMessage()
    msg["From"] = f"AgroTech Mendoza <{settings.GMAIL_USER}>"
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content("Tu cliente de correo no soporta HTML.")
    msg.add_alternative(html, subtype="html")

    # Puerto 465 con SSL - misma config que Puma-Code, que funciona en Railway.
    ctx = ssl.create_default_context(cafile=certifi.where())
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=30) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg, to_addrs=recipients)
        print(f"[MAILER] Correo enviado a {recipients} via 465/SSL")
        return True
    except Exception as e:
        print(f"[MAILER] Error al enviar por 465/SSL: {e}")
        return False