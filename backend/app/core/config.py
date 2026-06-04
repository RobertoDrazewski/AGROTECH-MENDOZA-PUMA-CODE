"""Configuración central de AgroTech Mendoza by puma-code.com"""
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgroTech Mendoza by puma-code.com"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    ENV: str = Field(default="development", validation_alias="ENV")

    # Seguridad (firma de tokens del panel de administración)
    SECRET_KEY: str = Field(
        default="AGROTECH_PUMACODE_SECRET_CAMBIAR_EN_PRODUCCION_2026",
        validation_alias="SECRET_KEY",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días

    # Admin raíz por defecto (se puede sobreescribir por .env)
    ROOT_ADMIN_USER: str = Field(default="roberto", validation_alias="ROOT_ADMIN_USER")
    ROOT_ADMIN_PASSWORD: str = Field(default="agrotech2026", validation_alias="ROOT_ADMIN_PASSWORD")

    # Simulación
    SIMULATION_SPEED_SECONDS: float = 2.0  # 1 ciclo (1 hora simulada) cada 2s reales

    # Umbrales agronómicos
    THRESHOLD_FROST_ALERT_C: float = 2.0
    THRESHOLD_LOW_SOIL_MOISTURE: float = 20.0
    THRESHOLD_HEAT_STRESS_C: float = 35.0

    # Base de datos (Railway MySQL). Formato: mysql+pymysql://user:pass@host:port/db
    DATABASE_URL: str | None = Field(default=None, validation_alias="DATABASE_URL")

    # Integraciones externas
    OPENWEATHER_API_KEY: str | None = Field(default=None, validation_alias="OPENWEATHER_API_KEY")
    OPENAI_API_KEY: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")

    # Correo (Gmail Workspace / App Password) — mismo sistema que puma-code
    GMAIL_USER: str = Field(default="info@puma-code.com", validation_alias="GMAIL_USER")
    GMAIL_APP_PASSWORD: str | None = Field(default=None, validation_alias="GMAIL_APP_PASSWORD")
    EMAIL_INFO: str = Field(default="info@puma-code.com", validation_alias="EMAIL_INFO")
    EMAIL_SECURITY: str = Field(default="security@puma-code.com", validation_alias="EMAIL_SECURITY")

    # Dólar / financiación (para el presupuesto)
    DOLAR_TIPO: str = Field(default="blue", validation_alias="DOLAR_TIPO")
    DOLAR_FALLBACK: float = Field(default=1450.0, validation_alias="DOLAR_FALLBACK")

    # Coordenadas de referencia (Luján de Cuyo, Mendoza)
    LAT: float = -33.0386
    LON: float = -68.8920

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
