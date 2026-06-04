"""Endpoints comerciales de AgroTech Mendoza:
- POST /contacto    -> guarda la consulta y la envía por mail a info@puma-code.com
- POST /presupuesto -> analiza el chat, calcula el dólar del día, arma el
                       presupuesto del SaaS y envía el mail (igual que puma-code).
"""
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings
from app.services.mailer import send_mail
import html as _html

router = APIRouter(prefix="", tags=["Comercial"])

# --- Recargos de financiación (igual que puma-code) ---
RECARGO_3 = 0.16
RECARGO_6 = 0.32
RAILWAY_USD_MES = 5
OPENAI_CARGA_INICIAL, OPENAI_UMBRAL, OPENAI_RECARGA = 10, 5, 5


# ---------- Helpers de dinero ----------
def esc(v):
    return _html.escape(str(v if v is not None else ""))


def fmt_usd(n):
    return f"US$ {round(float(n or 0)):,}".replace(",", ".")


def fmt_ars(n):
    return f"$ {round(float(n or 0)):,}".replace(",", ".")


def get_dollar_rate():
    """Dólar del día desde dolarapi.com; si falla, usa el valor de respaldo."""
    try:
        import requests
        r = requests.get(f"https://dolarapi.com/v1/dolares/{settings.DOLAR_TIPO}", timeout=5)
        d = r.json()
        venta = float(d.get("venta"))
        if venta > 0:
            return {"value": venta, "fallback": False,
                    "fecha": d.get("fechaActualizacion", "")}
    except Exception as e:
        print(f"[DOLAR] No se pudo obtener, usando fallback: {e}")
    return {"value": settings.DOLAR_FALLBACK, "fallback": True, "fecha": ""}


def build_planes(total_ars):
    return {
        "contado": total_ars,
        "plan3": {"total": total_ars * (1 + RECARGO_3), "cuota": total_ars * (1 + RECARGO_3) / 3},
        "plan6": {"total": total_ars * (1 + RECARGO_6), "cuota": total_ars * (1 + RECARGO_6) / 6},
    }


# ============================================================
#  CONTACTO
# ============================================================
class ContactoIn(BaseModel):
    nombre: str
    bodega: str | None = None
    email: str
    telefono: str | None = None
    mensaje: str | None = None


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
#  PRESUPUESTO
# ============================================================
class PresupuestoIn(BaseModel):
    chatHistory: list
    userData: dict  # {name, email, bodega?}


def _analizar_con_ia(historial):
    """Usa OpenAI para extraer los datos del presupuesto. Devuelve dict o None."""
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        sys = """Eres el CTO Analista de AgroTech Mendoza (by puma-code.com), plataforma de
agricultura de precisión para viñedos y bodegas. Analizá el chat y armá los datos para un
presupuesto EXACTO en USD del SaaS (un único monto, sin rangos), según los módulos pedidos
y la escala de la finca.

MÉTODO DE PRECIO — SaaS AgroTech (USD, pago único de desarrollo):
- BASE: USD 1500 (dashboard + telemetría en vivo + 1 cuartel).
- Sumá por módulo: predicción de heladas IA +500/900; optimización de cosecha IA +400/800;
  riego inteligente +400/700; pronóstico de clima/granizo +300/600; monitoreo fitosanitario IA +600/1200;
  análisis anual/mensual +300/500; multiusuario/roles +200/400; app móvil +600/1500.
HARDWARE (USD, pago único, estimado por escala): por cada cuartel ~USD 85 (nodo ESP32+LoRa+sensores+solar
y actuador de riego) y ~USD 140 por la finca (gateway LoRaWAN). hardware_usd = nodos*85 + 140.
Si el cliente no quiere hardware todavía, hardware_usd = 0.

PERFIL: "Local Mendoza" si es de Argentina/Mendoza o pagaría en pesos; "Global Estándar" si es del exterior.
TIEMPO: tiempo_entrega en SEMANAS, entero 2 a 8.
COSTOS RECURRENTES: costo_openai_usd_mensual (5-40 si usa IA, si no 0), costo_dominio_usd_anual (12-20).

Respondé SOLO en JSON:
{"nombre_proyecto":"string","perfil_cliente":"Local Mendoza|Global Estándar","hectareas":0,"cuarteles":0,
"resumen_pactado":"resumen claro para el cliente, en español","tecnologias":["lista"],
"presupuesto_usd":1500,"hardware_usd":0,"tiempo_entrega":4,
"costo_openai_usd_mensual":15,"costo_dominio_usd_anual":15,
"estrategia_crecimiento":"texto en segunda persona, dirigido al cliente, en español"}"""
        comp = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "system", "content": sys},
                      {"role": "user", "content": f"Analiza este historial: {historial}"}],
            response_format={"type": "json_object"}, temperature=0.3)
        import json
        return json.loads(comp.choices[0].message.content)
    except Exception as e:
        print(f"[PRESUPUESTO] Falló OpenAI: {e}")
        return None


def _analisis_fallback(historial):
    """Estimación por palabras clave si no hay OpenAI."""
    texto = " ".join(m.get("content", "") for m in historial if isinstance(m, dict)).lower()
    usd = 1500
    tec = ["Telemetría IoT", "Dashboard en vivo"]
    if any(k in texto for k in ["helada", "granizo", "clima"]):
        usd += 700; tec.append("IA heladas/clima")
    if any(k in texto for k in ["cosecha", "vendimia", "brix"]):
        usd += 600; tec.append("IA cosecha")
    if any(k in texto for k in ["riego", "agua"]):
        usd += 550; tec.append("Riego inteligente")
    if any(k in texto for k in ["plaga", "fitosanitar", "lobesia"]):
        usd += 900; tec.append("Sanidad IA (plagas)")
    import re
    m = re.search(r"(\d+)\s*cuartel", texto)
    cuarteles = int(m.group(1)) if m else 4
    return {
        "nombre_proyecto": "Sistema AgroTech para su bodega",
        "perfil_cliente": "Local Mendoza", "hectareas": 0, "cuarteles": cuarteles,
        "resumen_pactado": "Plataforma de monitoreo del viñedo con telemetría IoT, dashboards y "
                           "los módulos de IA conversados (heladas, cosecha, riego y/o sanidad).",
        "tecnologias": tec, "presupuesto_usd": usd, "hardware_usd": cuarteles * 85 + 140,
        "tiempo_entrega": 5, "costo_openai_usd_mensual": 15, "costo_dominio_usd_anual": 15,
        "estrategia_crecimiento": "Con datos en tiempo real protegés tu cosecha de heladas y granizo, "
                                 "ahorrás agua y decidís la vendimia en el punto justo: menos pérdidas y "
                                 "más calidad, con información para escalar tu bodega.",
    }


@router.post("/presupuesto")
def presupuesto(body: PresupuestoIn):
    name = str(body.userData.get("name", "")).strip()
    email = str(body.userData.get("email", "")).strip()
    bodega = str(body.userData.get("bodega", "") or "")
    if not name or "@" not in email:
        return {"success": False, "error": "Datos de contacto inválidos (nombre y email)."}

    a = _analizar_con_ia(body.chatHistory) or _analisis_fallback(body.chatHistory)
    perfil = str(a.get("perfil_cliente", "Local Mendoza"))
    es_local = "local" in perfil.lower()
    proyecto = a.get("nombre_proyecto", "tu proyecto AgroTech")
    tecnologias = a.get("tecnologias", []) or []

    usd_saas = max(1500, round(float(a.get("presupuesto_usd") or 1500)))
    usd_hw = max(0, round(float(a.get("hardware_usd") or 0)))
    usd_total = usd_saas + usd_hw
    weeks = min(8, max(2, int(a.get("tiempo_entrega") or 5)))

    railway = RAILWAY_USD_MES
    openai_m = float(a.get("costo_openai_usd_mensual") or 15)
    dominio_a = float(a.get("costo_dominio_usd_anual") or 15)
    total_mensual = railway + openai_m + dominio_a / 12

    dolar = get_dollar_rate() if es_local else None

    def dual(u):
        if es_local and dolar:
            return f"{fmt_usd(u)} ({fmt_ars(u * dolar['value'])})"
        return fmt_usd(u)

    # ---- Bloque inversión ----
    if es_local and dolar:
        ars_total = usd_total * dolar["value"]
        planes = build_planes(ars_total)
        anticipo = ars_total * 0.5
        precio_html = f"""
          <div style="margin-top:14px;">
            <span style="font-size:24px;font-weight:900;color:#059669;">{esc(fmt_ars(ars_total))}</span>
            <span style="margin-left:8px;color:#64748b;font-size:13px;">| Contado · Plazo: {weeks} semanas</span>
          </div>
          <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Equivale a {esc(fmt_usd(usd_total))} · Tipo de cambio (dólar {esc(settings.DOLAR_TIPO)}): {esc(fmt_ars(dolar['value']))}{' (referencia)' if dolar['fallback'] else ''}</p>
          <div style="margin-top:14px;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
            <p style="margin:0 0 8px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;">Planes en pesos (sobre {esc(fmt_ars(ars_total))})</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px 0;"><b>Contado</b></td><td style="padding:6px 0;text-align:right;color:#059669;font-weight:bold;">{esc(fmt_ars(planes['contado']))}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:6px 0;">3 cuotas <span style="color:#94a3b8;">(+16%)</span></td><td style="padding:6px 0;text-align:right;">3 × {esc(fmt_ars(planes['plan3']['cuota']))}</td></tr>
              <tr><td style="padding:6px 0;">6 cuotas <span style="color:#94a3b8;">(+32%)</span></td><td style="padding:6px 0;text-align:right;">6 × {esc(fmt_ars(planes['plan6']['cuota']))}</td></tr>
            </table>
            <p style="margin:10px 0 0;font-size:12px;color:#475569;">Forma de pago: <b>50% ({esc(fmt_ars(anticipo))}) para arrancar</b> y <b>50% al entregar</b>.</p>
          </div>"""
    else:
        anticipo = usd_total * 0.5
        precio_html = f"""
          <div style="margin-top:14px;">
            <span style="font-size:26px;font-weight:900;color:#059669;">{esc(fmt_usd(usd_total))}</span>
            <span style="margin-left:10px;color:#64748b;font-size:13px;">| Plazo: {weeks} semanas</span>
          </div>
          <p style="margin:10px 0 0;font-size:12px;color:#475569;">Forma de pago: <b>50% ({esc(fmt_usd(anticipo))}) para arrancar</b> y <b>50% al entregar</b>.</p>"""

    chat_html = "".join(
        f'<div style="margin-bottom:8px;padding:10px;border-radius:8px;background:{"#f0f9ff" if m.get("role")=="user" else "#f3f4f6"};">'
        f'<small style="color:#6b7280;font-size:10px;">{esc(name) if m.get("role")=="user" else "AgroTech IA"}</small>'
        f'<p style="margin:4px 0;font-size:13px;">{esc(m.get("content",""))}</p></div>'
        for m in body.chatHistory if isinstance(m, dict)
    )

    hw_line = (f'<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px 0;">Hardware (nodos ESP32/LoRa + gateway)</td>'
               f'<td style="padding:7px 0;text-align:right;font-weight:bold;">{dual(usd_hw)}</td></tr>') if usd_hw > 0 else ""

    mail_html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;color:#111827;">
      <div style="background:linear-gradient(135deg,#7ba32f,#9bcc44);padding:24px;border-radius:16px 16px 0 0;">
        <p style="margin:0;color:#ecfccb;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">🍇 AgroTech Mendoza · by puma-code</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:22px;">Propuesta & Presupuesto</h1>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;">
        <h2 style="margin:0 0 6px;font-size:20px;">Hola {esc(name)} 👋</h2>
        <p style="margin:0 0 6px;color:#64748b;font-size:13px;">Bodega/Finca: <b>{esc(bodega) or '—'}</b> · Perfil: {esc(perfil)}</p>
        <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.6;">Este es el presupuesto detallado para <b>{esc(proyecto)}</b>: qué construimos, cuánto sale, cómo se paga y qué necesitás para que el sistema funcione de forma independiente.</p>

        <h3 style="margin:0 0 6px;color:#7ba32f;font-size:15px;">🧩 Qué vamos a construir</h3>
        <p style="margin:0 0 12px;line-height:1.6;font-size:14px;">{esc(a.get('resumen_pactado','-'))}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#64748b;"><b>🛠 Tecnologías:</b> {' • '.join(esc(t) for t in tecnologias)}</p>

        <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:18px 0;">
          <p style="margin:0;font-weight:bold;font-size:15px;">💰 Inversión — pago único</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
            <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px 0;">Desarrollo del SaaS</td><td style="padding:7px 0;text-align:right;font-weight:bold;">{dual(usd_saas)}</td></tr>
            {hw_line}
          </table>
          {precio_html}
          <p style="margin:12px 0 0;font-size:11px;color:#64748b;">✅ Incluye el primer consumo de Railway y OpenAI durante el desarrollo y las pruebas.</p>
        </div>

        <div style="padding:16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;margin:18px 0;">
          <p style="margin:0 0 10px;color:#047857;font-weight:bold;font-size:15px;">🔑 Tu sistema es 100% tuyo</p>
          <ul style="margin:0;padding-left:18px;color:#065f46;font-size:13px;line-height:1.7;">
            <li>Pagás <b>una sola vez</b> el desarrollo y se entrega <b>100% funcional</b>. Sin mensualidad a puma-code.</li>
            <li>El código y todas las cuentas (servidor, IA, dominio) quedan <b>a tu nombre</b>.</li>
            <li>Lo que pagás cada mes mantiene tu sistema vivo con tus propias API keys; va directo a los proveedores.</li>
          </ul>
        </div>

        <div style="padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin:18px 0;">
          <p style="margin:0 0 8px;color:#1d4ed8;font-weight:bold;font-size:15px;">⚙️ Servicios mensuales (tu sistema independiente)</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr style="border-bottom:1px solid #dbeafe;"><td style="padding:7px 0;">Railway — servidor y base de datos</td><td style="padding:7px 0;text-align:right;font-weight:bold;">{dual(railway)} <span style="color:#94a3b8;font-weight:normal;">/mes</span></td></tr>
            <tr style="border-bottom:1px solid #dbeafe;"><td style="padding:7px 0;">OpenAI — funciones de IA</td><td style="padding:7px 0;text-align:right;font-weight:bold;">{dual(openai_m) if openai_m>0 else 'No aplica'} <span style="color:#94a3b8;font-weight:normal;">{'/mes' if openai_m>0 else ''}</span></td></tr>
            <tr><td style="padding:7px 0;">Dominio (.com)</td><td style="padding:7px 0;text-align:right;font-weight:bold;">{dual(dominio_a)} <span style="color:#94a3b8;font-weight:normal;">/año</span></td></tr>
            <tr style="border-top:2px solid #1d4ed8;"><td style="padding:9px 0 0;color:#1d4ed8;font-weight:900;">💳 Total estimado/mes</td><td style="padding:9px 0 0;text-align:right;color:#1d4ed8;font-weight:900;font-size:16px;">{dual(total_mensual)}</td></tr>
          </table>
        </div>

        <div style="padding:16px;background:#fff7ed;border:1px solid #ffedd5;border-radius:10px;margin:18px 0;">
          <p style="margin:0 0 6px;color:#c2410c;font-weight:bold;font-size:15px;">📈 Por qué te conviene</p>
          <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.6;">{esc(a.get('estrategia_crecimiento','-'))}</p>
        </div>

        <hr style="border:none;border-top:1px solid #eee;margin:26px 0;">
        <h4 style="margin:0 0 10px;color:#9ca3af;font-size:13px;">💬 Conversación con el asistente</h4>
        {chat_html}
        <p style="margin:24px 0 0;text-align:center;color:#9ca3af;font-size:11px;">AgroTech Mendoza · by puma-code.com · Mendoza, Argentina — info@puma-code.com</p>
      </div>
    </div>"""

    enviado = send_mail(settings.EMAIL_INFO,
                        f"📤 Presupuesto AgroTech · {proyecto} · {name} ({perfil})",
                        mail_html, reply_to=email)

    # Guardar lead en contactos
    if settings.DATABASE_URL:
        try:
            from app.db.database import get_session
            from app.db import models
            s = get_session()
            try:
                s.add(models.Contacto(nombre=name, bodega=bodega, email=email,
                                      mensaje=f"[PRESUPUESTO] {proyecto} — {fmt_usd(usd_total)}"))
                s.commit()
            finally:
                s.close()
        except Exception as e:
            print(f"[PRESUPUESTO] No se pudo guardar lead: {e}")

    # Resumen para mostrarle al cliente en el chat
    resumen_cliente = (
        f"¡Listo, {name}! Te preparé el presupuesto de *{proyecto}*.\n\n"
        f"💰 Inversión (pago único): {dual(usd_total)}"
        + (f" — desarrollo {fmt_usd(usd_saas)}" + (f" + hardware {fmt_usd(usd_hw)}" if usd_hw > 0 else "") + ".")
        + f"\n📅 Plazo estimado: {weeks} semanas.\n"
        f"⚙️ Servicios mensuales (a tu nombre): {dual(total_mensual)} aprox. (Railway + OpenAI + dominio).\n"
        + (f"💵 Dólar {settings.DOLAR_TIPO} de hoy: {fmt_ars(dolar['value'])}.\n" if (es_local and dolar) else "")
        + "El sistema queda 100% tuyo, sin mensualidad a puma-code. "
        + "Te envié el detalle completo por mail; nuestro equipo te contacta para coordinar. 🍇"
    )

    return {"success": True, "email_enviado": enviado, "resumen_cliente": resumen_cliente,
            "presupuesto_usd_total": usd_total, "perfil": perfil}
