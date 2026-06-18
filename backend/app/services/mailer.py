import httpx
from app.core.config import settings

def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    """Envía un mail HTML usando API REST (puerto 443) para evadir bloqueos SMTP de Render."""
    
    # settings.RESEND_API_KEY debe estar en tus variables de entorno
    if not hasattr(settings, 'RESEND_API_KEY') or not settings.RESEND_API_KEY:
        print("[MAILER] Falta RESEND_API_KEY; no se enviará el correo.")
        return False

    recipients = [to] if isinstance(to, str) else list(to)
    
    payload = {
        "from": f"AgroTech Mendoza <{settings.EMAIL_INFO}>",
        "to": recipients,
        "subject": subject,
        "html": html,
    }
    
    if reply_to:
        payload["reply_to"] = reply_to

    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        # Petición HTTPS (puerto 443) - Render no bloquea esto
        response = httpx.post(
            "https://api.resend.com/emails",
            json=payload,
            headers=headers,
            timeout=10.0
        )
        
        if response.status_code == 200:
            print(f"[MAILER] Correo enviado exitosamente vía API REST a {recipients}")
            return True
        else:
            print(f"[MAILER] Error de la API de correo: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"[MAILER] Error crítico de red al enviar por API REST: {e}")
        return False