"""Envío de correo vía Resend API (HTTP REST).
Reemplaza la configuración SMTP para evadir el bloqueo de puertos de Render.
Variables de entorno requeridas:
  RESEND_API_KEY      = re_AtU9Sx1D_9dgmPgmW6meX7RYC4g6n3k7m
  EMAIL_INFO          = info@puma-code.com
"""
import json
import urllib.request
import ssl
import certifi
from app.core.config import settings

def send_mail(to, subject: str, html: str, reply_to: str | None = None) -> bool:
    """Envía un mail HTML. `to` puede ser str o lista. Devuelve True si se envió."""
    
    # 1. Validamos que la API Key exista en las configuraciones
    if not getattr(settings, "RESEND_API_KEY", None):
        print("[MAILER] Falta RESEND_API_KEY; no se envió el correo.")
        return False

    recipients = [to] if isinstance(to, str) else list(to)
    
    # 2. El remitente debe usar el dominio que verificaste en Resend (ej: info@puma-code.com)
    sender = f"AgroTech Mendoza <{settings.EMAIL_INFO}>"
    
    # 3. Construimos el cuerpo de la petición para Resend
    payload = {
        "from": sender,
        "to": recipients,
        "subject": subject,
        "html": html
    }
    if reply_to:
        payload["reply_to"] = reply_to

    data = json.dumps(payload).encode('utf-8')
    
    # 4. Preparamos la petición HTTP al puerto 443 inyectando el User-Agent
    req = urllib.request.Request(
        "https://api.resend.com/emails", 
        data=data, 
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        method="POST"
    )

    # 5. Creamos un contexto SSL seguro usando certifi
    ctx = ssl.create_default_context(cafile=certifi.where())

    # 6. Ejecutamos la petición pasando el contexto
    try:
        with urllib.request.urlopen(req, timeout=10.0, context=ctx) as response:
            # Resend devuelve 200 OK cuando el correo se encola exitosamente
            if response.status in [200, 201]:
                print(f"[MAILER] Correo enviado exitosamente vía Resend API a {recipients}")
                return True
            else:
                print(f"[MAILER] Error de Resend: Código HTTP {response.status}")
                return False
                
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        print(f"[MAILER] Falló la petición a Resend. Código HTTP {e.code}: {error_msg}")
        return False
    except Exception as e:
        print(f"[MAILER] Error crítico de red al enviar por Resend: {e}")
        return False