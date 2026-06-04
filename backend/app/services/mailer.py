"""Envío de correo vía Gmail Workspace (SMTP + App Password), igual que puma-code.
Variables de entorno:
  GMAIL_USER          = info@puma-code.com  (cuenta que envía)
  GMAIL_APP_PASSWORD  = App Password de 16 caracteres
  EMAIL_INFO          = info@puma-code.com  (recibe cotizaciones/contactos)
  EMAIL_SECURITY      = security@puma-code.com
"""
import ssl
import smtplib
from email.message import EmailMessage
from app.core.config import settings


def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    """Envía un mail HTML. `to` puede ser str o lista. Devuelve True si se envió."""
    if not settings.GMAIL_APP_PASSWORD:
        print("[MAILER] Falta GMAIL_APP_PASSWORD en el .env; no se envió el correo.")
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

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=20) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg, to_addrs=recipients)
        print(f"[MAILER] Correo enviado a {recipients}")
        return True
    except Exception as e:
        print(f"[MAILER] Error al enviar: {e}")
        return False
