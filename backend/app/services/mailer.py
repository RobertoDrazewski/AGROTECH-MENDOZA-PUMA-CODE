import ssl
import smtplib
import certifi
from email.message import EmailMessage
from app.core.config import settings

def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    recipients = [to] if isinstance(to, str) else list(to)
    msg = EmailMessage()
    msg["From"] = f"AgroTech Mendoza <{settings.GMAIL_USER}>"
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content("Tu cliente de correo no soporta HTML.")
    msg.add_alternative(html, subtype="html")

    # Intentar primero SSL (465) y fallback a TLS (587)
    configs = [
        {"host": "smtp.gmail.com", "port": 465, "ssl": True},
        {"host": "smtp.gmail.com", "port": 587, "ssl": False}
    ]

    for cfg in configs:
        try:
            if cfg["ssl"]:
                ctx = ssl.create_default_context(cafile=certifi.where())
                with smtplib.SMTP_SSL(cfg["host"], cfg["port"], context=ctx, timeout=10) as server:
                    server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
                    server.send_message(msg, to_addrs=recipients)
            else:
                with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
                    server.starttls(context=ssl.create_default_context(cafile=certifi.where()))
                    server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
                    server.send_message(msg, to_addrs=recipients)
            
            print(f"[MAILER] Correo enviado exitosamente vía puerto {cfg['port']}")
            return True
        except Exception as e:
            print(f"[MAILER] Falló intento por puerto {cfg['port']}: {e}")
            continue

    return False