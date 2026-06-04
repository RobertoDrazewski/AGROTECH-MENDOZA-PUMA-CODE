#!/usr/bin/env python3
"""Genera el informe comercial + de ingeniería de AgroTech Mendoza (PDF)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, Image, HRFlowable)

OUT = "/home/claude/agrotech-mendoza/docs/AgroTech_Mendoza_Informe.pdf"
LOGO = "/home/claude/agrotech-mendoza/frontend/public/logo-puma.png"

NIGHT = colors.HexColor("#0e1512")
PANEL = colors.HexColor("#18211b")
VINE  = colors.HexColor("#7ba32f")
VINE_L = colors.HexColor("#9bcc44")
WINE  = colors.HexColor("#8b2e4a")
MUTED = colors.HexColor("#5d6f5a")
TEXT  = colors.HexColor("#222a24")
LINE  = colors.HexColor("#cfd8c8")

styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=styles['Title'], fontSize=24, textColor=NIGHT, spaceAfter=4, leading=27)
SUB = ParagraphStyle('SUB', parent=styles['Normal'], fontSize=11, textColor=VINE, spaceAfter=2)
H2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=VINE, spaceBefore=14, spaceAfter=6)
BODY = ParagraphStyle('BODY', parent=styles['Normal'], fontSize=10.5, textColor=TEXT, leading=15, alignment=TA_JUSTIFY, spaceAfter=6)
SMALL = ParagraphStyle('SMALL', parent=styles['Normal'], fontSize=8.5, textColor=MUTED, leading=12)
BULLET = ParagraphStyle('BULLET', parent=BODY, leftIndent=12, spaceAfter=3)
CELL = ParagraphStyle('CELL', parent=styles['Normal'], fontSize=9, textColor=TEXT, leading=12)
CELLH = ParagraphStyle('CELLH', parent=styles['Normal'], fontSize=9, textColor=colors.white, leading=12, fontName='Helvetica-Bold')

story = []

# ---------- PORTADA ----------
if os.path.exists(LOGO):
    try:
        story.append(Spacer(1, 30*mm))
        img = Image(LOGO, width=42*mm, height=42*mm)
        img.hAlign = 'CENTER'
        story.append(img)
    except Exception:
        story.append(Spacer(1, 50*mm))
else:
    story.append(Spacer(1, 60*mm))

story.append(Spacer(1, 8*mm))
story.append(Paragraph("AgroTech Mendoza", H1))
story.append(Paragraph("by puma-code.com", SUB))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("Agricultura de precisión para viñedos y bodegas", ParagraphStyle('p', parent=BODY, alignment=TA_CENTER, fontSize=13, textColor=TEXT)))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("Telemetría IoT · Inteligencia Artificial · Riego inteligente · Sanidad vegetal", ParagraphStyle('p2', parent=SMALL, alignment=TA_CENTER, fontSize=10)))
story.append(Spacer(1, 30*mm))
story.append(HRFlowable(width="60%", color=VINE_L, thickness=2))
story.append(Spacer(1, 4*mm))
story.append(Paragraph("Propuesta comercial e informe técnico de ingeniería", ParagraphStyle('p3', parent=SMALL, alignment=TA_CENTER, fontSize=10)))
story.append(Paragraph("Mendoza, Argentina · " + "Rev. 2.0", ParagraphStyle('p4', parent=SMALL, alignment=TA_CENTER)))
story.append(PageBreak())

# ---------- 1. RESUMEN ----------
story.append(Paragraph("1. Resumen ejecutivo", H2))
story.append(Paragraph(
    "AgroTech Mendoza es la plataforma de agricultura 4.0 de Puma-Code.com para viñedos y "
    "bodegas. Conectamos el campo con la nube mediante sensores IoT de bajo consumo y "
    "convertimos esos datos en decisiones: cuándo proteger contra una helada, cuándo regar y "
    "cuánto, cuándo cosechar cada cuartel y cómo controlar las plagas en el momento justo. "
    "Todo en tableros claros, accesibles desde la computadora o el celular.", BODY))
story.append(Paragraph(
    "La provincia de Mendoza es referente nacional en gestión hídrica, vitivinicultura de "
    "precisión y monitoreo de plagas con inteligencia artificial. Nuestra solución se integra a "
    "ese ecosistema con tecnología propia, escalable desde unas pocas hectáreas hasta redes de "
    "decenas de sensores, sin depender de proveedores externos.", BODY))

# ---------- 2. PROBLEMA / VALOR ----------
story.append(Paragraph("2. Qué resolvemos para la bodega", H2))
for t in [
    "<b>Heladas y granizo:</b> aviso anticipado para activar la defensa y no perder la cosecha.",
    "<b>Agua:</b> riego según humedad real del suelo, reduciendo consumo y estrés hídrico.",
    "<b>Vendimia:</b> ventana óptima de cosecha por curva de azúcar (Brix) y acidez (pH).",
    "<b>Plagas:</b> trampas inteligentes con visión por IA que detectan y cuentan insectos clave.",
    "<b>Gestión:</b> reportes mensuales y anuales por cuartel para decidir y presentar a socios.",
]:
    story.append(Paragraph("• " + t, BULLET))

# ---------- 3. ARQUITECTURA ----------
story.append(Paragraph("3. Arquitectura de la solución", H2))
story.append(Paragraph(
    "Nodos sensores en campo (ESP32 + LoRa/LoRaWAN, alimentación solar) miden temperatura de aire "
    "y suelo, humedad de aire y suelo, y presión. Un gateway recibe los paquetes por radio y los "
    "envía al servidor (API FastAPI), que aplica los modelos de IA y publica todo en el panel web. "
    "El mismo panel permite enviar comandos de riego de vuelta al campo.", BODY))
arch = [
    [Paragraph("Capa", CELLH), Paragraph("Componente", CELLH), Paragraph("Función", CELLH)],
    [Paragraph("Campo", CELL), Paragraph("Nodo ESP32 + LoRa + sensores + solar", CELL), Paragraph("Captura y transmite telemetría", CELL)],
    [Paragraph("Enlace", CELL), Paragraph("Gateway LoRaWAN", CELL), Paragraph("Recibe y reenvía al servidor (km de alcance)", CELL)],
    [Paragraph("Servidor", CELL), Paragraph("API FastAPI + modelos IA", CELL), Paragraph("Heladas, cosecha, riego, plagas, clima", CELL)],
    [Paragraph("Aplicación", CELL), Paragraph("Panel web React", CELL), Paragraph("Dashboards, alertas, comandos y reportes", CELL)],
]
t = Table(arch, colWidths=[28*mm, 62*mm, 75*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VINE),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f3f7ec")]),
    ('GRID', (0,0), (-1,-1), 0.5, LINE),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)

# ---------- 4. MÓDULOS IA ----------
story.append(Paragraph("4. Módulos de inteligencia artificial", H2))
for t in [
    "<b>Predicción de heladas:</b> calcula punto de rocío (Magnus-Tetens) y tendencia de "
    "enfriamiento para anticipar el evento y clasificar el riesgo (Bajo/Medio/Crítico).",
    "<b>Optimización de cosecha:</b> analiza la curva Brix/pH de cada cuartel y estima los días "
    "a la ventana óptima y el potencial cualitativo del vino.",
    "<b>Riego inteligente:</b> decide regar/no regar según humedad de suelo y umbral agronómico; "
    "opera en modo automático o manual.",
    "<b>Sanidad vegetal:</b> modelo de visión (tipo YOLOv8) sobre trampas con cámara para detectar "
    "y contar plagas clave de la vid (p. ej. Lobesia botrana) y disparar el aviso al superar el umbral.",
]:
    story.append(Paragraph("• " + t, BULLET))
story.append(PageBreak())

# ---------- 5. HARDWARE / BOM ----------
story.append(Paragraph("5. Hardware del nodo sensor (lista de materiales)", H2))
bom = [
    [Paragraph("Componente", CELLH), Paragraph("Especificación", CELLH), Paragraph("USD", CELLH)],
]
rows = [
    ("ESP32-WROOM-32", "MCU WiFi/BLE dual-core", "7.00"),
    ("LoRa SX1276/RFM95", "915 MHz (AR/AU)", "9.00"),
    ("Antena 915 MHz", "SMA 3 dBi", "4.00"),
    ("DS18B20", "Temp. suelo (sonda inox)", "3.50"),
    ("SHT31 / DHT22", "Temp/Hum aire", "6.00"),
    ("Capacitivo v2.0", "Humedad de suelo", "3.00"),
    ("BMP280", "Presión + temp (I2C)", "2.50"),
    ("Panel solar", "6V / 2W", "8.00"),
    ("TP4056 + DW01", "Cargador Li-Ion protegido", "1.50"),
    ("Batería 18650", "3.7V 3000 mAh", "5.00"),
    ("LDO MCP1700", "Regulador 3.3V", "1.00"),
    ("Gabinete IP65", "100x68x50 + prensacables", "6.00"),
    ("Cableado / PCB / varios", "Borneras, AWG22, PCB", "5.00"),
]
for r in rows:
    bom.append([Paragraph(r[0], CELL), Paragraph(r[1], CELL), Paragraph(r[2], CELL)])
bom.append([Paragraph("<b>Subtotal por nodo</b>", CELL), Paragraph("", CELL), Paragraph("<b>61.50</b>", CELL)])
t = Table(bom, colWidths=[55*mm, 75*mm, 25*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VINE),
    ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, colors.HexColor("#f3f7ec")]),
    ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#e6efd6")),
    ('GRID', (0,0), (-1,-1), 0.5, LINE),
    ('ALIGN', (2,0), (2,-1), 'RIGHT'),
    ('TOPPADDING', (0,0), (-1,-1), 4), ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "Finca tipo de 4 cuarteles (4 nodos + actuadores de riego + 1 gateway + instalación): "
    "<b>≈ USD 626</b> en hardware (orientativo). El software, servidor y soporte se cotizan como "
    "servicio. Brix y pH se obtienen por muestreo + refractómetro/pH-metro o estimación por modelo.", SMALL))

# ---------- 6. INGENIERÍA ELÉCTRICA ----------
story.append(Paragraph("6. Balance de energía y autonomía", H2))
story.append(Paragraph(
    "El nodo opera con energía solar de forma autosuficiente. Con lecturas cada 15 minutos, el "
    "consumo medio es de unos pocos mAh por día, mientras que un panel de 6V/2W con 2-3 horas de "
    "sol efectivo genera un excedente amplio. La batería 18650 garantiza más de 10 días de "
    "respaldo ante días nublados.", BODY))
energy = [
    [Paragraph("Estado", CELLH), Paragraph("Corriente", CELLH), Paragraph("Duración/ciclo", CELLH)],
    [Paragraph("Deep sleep", CELL), Paragraph("~0.05 mA", CELL), Paragraph("~15 min", CELL)],
    [Paragraph("Lectura sensores", CELL), Paragraph("~40 mA", CELL), Paragraph("~2 s", CELL)],
    [Paragraph("Transmisión LoRa", CELL), Paragraph("~120 mA", CELL), Paragraph("~0.5 s", CELL)],
    [Paragraph("Consumo diario estimado", CELL), Paragraph("~5-12 mAh/día", CELL), Paragraph("96 ciclos/día", CELL)],
]
t = Table(energy, colWidths=[60*mm, 50*mm, 45*mm])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), VINE),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f3f7ec")]),
    ('GRID', (0,0), (-1,-1), 0.5, LINE),
    ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 6),
]))
story.append(t)
story.append(Spacer(1, 3*mm))
story.append(Paragraph(
    "Consideraciones: banda 915 MHz (normativa AR), gabinete IP65, panel orientado al norte con "
    "inclinación ~33°, y para zonas de heladas severas se sugiere batería LiFePO4 (no cargar "
    "Li-Ion por debajo de 0 °C). Detalle completo en el informe de ingeniería eléctrica.", SMALL))

# ---------- 7. CONTACTO ----------
story.append(Paragraph("7. Próximo paso", H2))
story.append(Paragraph(
    "Coordinamos una visita técnica sin cargo para relevar su finca y preparar una propuesta a "
    "medida según hectáreas y objetivos. AgroTech Mendoza es desarrollado íntegramente por "
    "Puma-Code.com (CEO: Roberto).", BODY))
story.append(Spacer(1, 4*mm))
story.append(HRFlowable(width="100%", color=VINE_L, thickness=1.5))
story.append(Spacer(1, 2*mm))
story.append(Paragraph("Puma-Code.com · www.puma-code.com · Mendoza, Argentina", ParagraphStyle('c', parent=SMALL, fontSize=10, textColor=VINE)))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(20*mm, 12*mm, "AgroTech Mendoza · by puma-code.com")
    canvas.drawRightString(190*mm, 12*mm, "Página %d" % doc.page)
    canvas.setStrokeColor(LINE)
    canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=20*mm, rightMargin=20*mm,
                        topMargin=18*mm, bottomMargin=20*mm,
                        title="AgroTech Mendoza - Informe", author="Puma-Code.com")
doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=footer)
print("PDF generado:", OUT)
