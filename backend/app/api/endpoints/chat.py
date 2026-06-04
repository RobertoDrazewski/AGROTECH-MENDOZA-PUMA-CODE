"""Asesor comercial IA especializado en vender AgroTech Mendoza a bodegas.
Usa OpenAI si OPENAI_API_KEY está presente; si no, responde con un motor de
reglas que conoce la propuesta de valor del producto."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["Asesor Comercial IA"])

SYSTEM_PROMPT = """Eres el Asesor Comercial de AgroTech Mendoza, la división de agricultura
de precisión de Puma-Code.com (software factory de Mendoza, Argentina; CEO: Roberto).
Tu objetivo es explicar y VENDER la plataforma a bodegas y viñedos.

PROPUESTA DE VALOR (explícala con claridad y orientada a beneficios):
- Telemetría IoT en campo con nodos ESP32 + LoRaWAN (temperatura, humedad de aire y suelo,
  presión, Brix y pH estimados). Bajo consumo, alcance de varios km, alimentación solar.
- Dashboards en tiempo real con KPIs por cuartel y análisis histórico por mes y por año.
- IA: predicción de cosecha (ventana óptima de vendimia por curva Brix/pH), detección de
  estrés hídrico y predicción de heladas (punto de rocío + tendencia de enfriamiento).
- API de clima conectada para pronosticar heladas, granizo, golpe de calor y viento Zonda.
- Integración con el sistema de riego existente de la bodega: automatización y comandos
  (regar / no regar) según humedad de suelo real.
- Reportes de ingeniería y tableros listos para decisiones.

REGLAS:
- Trato de USTED, español neutro, tono profesional y cálido. Nada de voseo ni modismos.
- Sé concreto, breve y orientado a resolver el problema de la bodega (perder cosecha por
  heladas/granizo, gastar agua de más, decidir el momento de vendimia).
- Si preguntan quién desarrolla el software, responda: Puma-Code.com, CEO Roberto.
- Cierra invitando a una demo o a dejar sus datos de contacto.
"""


class ChatMsg(BaseModel):
    message: str
    lang: str | None = "es"
    history: list | None = None


def _fallback(msg: str) -> str:
    m = msg.lower()
    if any(k in m for k in ["helada", "granizo", "clima", "frío", "frost"]):
        return ("Nuestra plataforma combina sensores en campo con una API de clima para "
                "anticipar heladas, granizo y golpes de calor. Calculamos el punto de rocío "
                "y la tendencia de enfriamiento para avisarle horas antes y activar su defensa "
                "(aspersores, calefactores o ventiladores). ¿Desea que coordinemos una demo "
                "para su finca?")
    if any(k in m for k in ["riego", "agua", "hídric", "humedad"]):
        return ("Medimos la humedad de suelo en tiempo real y la cruzamos con el clima para "
                "decirle exactamente cuándo regar y cuándo no, evitando estrés hídrico y "
                "ahorrando agua. Si ya cuenta con riego por goteo, lo integramos para "
                "automatizar las electroválvulas. ¿Cuántas hectáreas maneja?")
    if any(k in m for k in ["plaga", "insecto", "lobesia", "polilla", "fitosanitar", "trampa"]):
        return ("Sumamos monitoreo fitosanitario con IA: trampas inteligentes con cámara y un "
                "modelo de visión (tipo YOLOv8) que detecta y cuenta plagas clave de la vid como "
                "Lobesia botrana. Le avisamos cuando se supera el umbral de acción para que aplique "
                "el tratamiento en el momento justo, reduciendo costos y producto. ¿Quiere verlo en una demo?")
    if any(k in m for k in ["cosecha", "vendimia", "brix", "madurez", "ph"]):
        return ("La IA analiza la curva de azúcar (Brix) y pH de cada cuartel y le sugiere la "
                "ventana óptima de vendimia para el perfil de vino que busca. Así cosecha en el "
                "punto justo de equilibrio. ¿Para qué variedades lo necesita?")
    if any(k in m for k in ["precio", "costo", "cuánto", "presupuesto", "plan"]):
        return ("El proyecto se arma a medida según hectáreas y cantidad de nodos. Incluye "
                "hardware (ESP32/LoRaWAN), instalación, dashboard y soporte. Le preparamos una "
                "propuesta sin cargo: déjenos su contacto y coordinamos una visita técnica.")
    if any(k in m for k in ["quién", "puma", "desarrolla", "empresa", "roberto"]):
        return ("AgroTech Mendoza es la división de agro de Puma-Code.com (CEO: Roberto), una "
                "fábrica de software de Mendoza. Desarrollamos todo a medida: hardware, IA y "
                "tableros. ¿Le gustaría ver una demo en vivo?")
    return ("Soy el asesor de AgroTech Mendoza by Puma-Code.com. Ayudamos a las bodegas a "
            "proteger su cosecha con sensores IoT, IA para heladas y cosecha, y riego "
            "inteligente. ¿Sobre qué tema le gustaría saber más: heladas, riego o cosecha?")


@router.post("")
def chat(body: ChatMsg):
    if not body.message:
        return {"response": "¿En qué puedo ayudarle con su viñedo?"}

    if settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            for h in (body.history or [])[-6:]:
                if h.get("role") in ("user", "assistant"):
                    messages.append({"role": h["role"], "content": h.get("content", "")})
            messages.append({"role": "user", "content": body.message})
            completion = client.chat.completions.create(
                model="gpt-4o-mini", messages=messages, temperature=0.3)
            return {"response": completion.choices[0].message.content.strip(),
                    "fuente": "openai"}
        except Exception as e:
            print(f"[CHAT] Falló OpenAI, usando fallback: {e}")

    return {"response": _fallback(body.message), "fuente": "reglas"}
