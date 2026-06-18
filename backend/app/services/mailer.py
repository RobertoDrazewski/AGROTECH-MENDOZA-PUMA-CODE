"""Envío de correo vía Gmail Workspace (SMTP + App Password)."""
import ssl
import smtplib
import certifi  # Esencial para evitar errores de certificado SSL en producción
from email.message import EmailMessage
from app.core.config import settings

def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    """Envía un mail HTML. 'to' puede ser un string o una lista de strings."""
    # Validación de seguridad
    if not settings.GMAIL_APP_PASSWORD or not settings.GMAIL_USER:
        print("[MAILER] Error: GMAIL_APP_PASSWORD o GMAIL_USER no configurados en .env")
        return False

    recipients = [to] if isinstance(to, str) else list(to)
    
    # Construcción del mensaje
    msg = EmailMessage()
    msg["From"] = f"AgroTech Mendoza <{settings.GMAIL_USER}>"
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    
    if reply_to:
        msg["Reply-To"] = reply_to
        
    msg.set_content("Tu cliente de correo no soporta HTML.")
    msg.add_alternative(html, subtype="html")

    try:
        # Configuración SSL usando certifi para confiar en los certificados raíz
        ctx = ssl.create_default_context(cafile=certifi.where())
        
        # Conexión y envío
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx, timeout=20) as server:
            server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
            server.send_message(msg, to_addrs=recipients)
            
        print(f"[MAILER] Correo enviado exitosamente a: {recipients}")
        return True
    except Exception as e:
        print(f"[MAILER] Error crítico al enviar: {e}")
        return False