"""Envío de correo vía Gmail Workspace (SMTP + App Password), igual que puma-code.
Variables de entorno (definirlas en Railway/Render, NUNCA en el código):
  GMAIL_USER          = info@puma-code.com
  GMAIL_APP_PASSWORD  = (App Password de Google, secreta)
  EMAIL_INFO          = info@puma-code.com
  EMAIL_SECURITY      = security@puma-code.com
"""
import ssl
import smtplib
import certifi  # Necesario para validar certificados SSL en entornos de producción
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

    ctx = ssl.create_default_context(cafile=certifi.where())

    # Muchos hosts (Render, a veces Railway) bloquean el puerto 465 saliente.
    # Probamos primero 587 con STARTTLS (suele estar permitido) y si falla,
    # caemos a 465 SSL. Así funciona tanto en local como en producción.
    intentos = [
        ("587/STARTTLS", lambda: _send_starttls(msg, recipients, ctx)),
        ("465/SSL",      lambda: _send_ssl(msg, recipients, ctx)),
    ]
    ultimo_error = None
    for nombre, fn in intentos:
        try:
            fn()
            print(f"[MAILER] Correo enviado a {recipients} vía {nombre}")
            return True
        except Exception as e:
            ultimo_error = e
            print(f"[MAILER] Falló {nombre}: {e}")
    print(f"[MAILER] No se pudo enviar por ningún método. Último error: {ultimo_error}")
    return False


def _send_starttls(msg, recipients, ctx):
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        server.send_message(msg, to_addrs=recipients)


def _send_ssl(msg, recipients, ctx):
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=20) as server:
        server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        server.send_message(msg, to_addrs=recipients)