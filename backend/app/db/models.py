"""Modelos SQLAlchemy que reflejan el esquema MySQL de AgroTech Mendoza."""
from datetime import datetime
from sqlalchemy import (Column, String, Integer, BigInteger, Boolean, Numeric,
                        DateTime, Text, ForeignKey)
from app.db.database import Base


class Cuartel(Base):
    __tablename__ = "cuarteles"
    vinedo_id = Column(String(64), primary_key=True)
    variedad = Column(String(80), nullable=False)
    hectareas = Column(Numeric(6, 2))
    lat = Column(Numeric(9, 6))
    lon = Column(Numeric(9, 6))
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Telemetria(Base):
    __tablename__ = "telemetria"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vinedo_id = Column(String(64), ForeignKey("cuarteles.vinedo_id", ondelete="CASCADE"), nullable=False, index=True)
    leido_en = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    temp_aire = Column(Numeric(5, 2))
    humedad_aire = Column(Numeric(5, 2))
    presion_atm = Column(Numeric(6, 2))
    humedad_suelo = Column(Numeric(5, 2))
    uva_brix = Column(Numeric(5, 2))
    uva_ph = Column(Numeric(4, 3))
    bateria = Column(Integer)
    alerta_helada = Column(Boolean, nullable=False, default=False)


class Admin(Base):
    __tablename__ = "admins"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    nombre = Column(String(120))
    email = Column(String(190), unique=True, nullable=False)
    password_hash = Column(String(255))
    rol = Column(String(20), nullable=False, default="operador")
    activo = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class RiegoEstado(Base):
    __tablename__ = "riego_estado"
    vinedo_id = Column(String(64), ForeignKey("cuarteles.vinedo_id", ondelete="CASCADE"), primary_key=True)
    modo = Column(String(10), nullable=False, default="auto")
    valvula_abierta = Column(Boolean, nullable=False, default=False)
    actualizado_en = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiegoComando(Base):
    __tablename__ = "riego_comandos"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vinedo_id = Column(String(64), ForeignKey("cuarteles.vinedo_id", ondelete="CASCADE"), nullable=False)
    accion = Column(String(10), nullable=False)
    origen = Column(String(100), nullable=False, default="sistema")
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class FitosanitarioDeteccion(Base):
    __tablename__ = "fitosanitario_detecciones"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    vinedo_id = Column(String(64), ForeignKey("cuarteles.vinedo_id", ondelete="CASCADE"), nullable=False, index=True)
    especie = Column(String(120), nullable=False)
    nombre_comun = Column(String(160))
    capturas_semana = Column(Integer, nullable=False, default=0)
    umbral_accion = Column(Integer)
    confianza_ia = Column(Numeric(4, 3))
    nivel = Column(String(10))
    detectado_en = Column(DateTime, nullable=False, default=datetime.utcnow)


class Contacto(Base):
    __tablename__ = "contactos"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nombre = Column(String(120))
    bodega = Column(String(160))
    email = Column(String(190))
    telefono = Column(String(60))
    mensaje = Column(Text)
    creado_en = Column(DateTime, nullable=False, default=datetime.utcnow)
