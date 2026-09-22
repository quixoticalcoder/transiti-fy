"""
config.py
----------
Centralized application configuration.
All values are pulled from environment variables (.env file) so that
secrets and environment-specific values never get hard-coded.
"""

import os
from datetime import timedelta


class Config:
    """Base configuration shared across all environments."""

    # Flask secret key - used for session/signing
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # ------------------------------------------------------------------
    # Database (PostgreSQL via SQLAlchemy)
    # ------------------------------------------------------------------
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/transiti_fy"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # disable event system overhead

    # ------------------------------------------------------------------
    # JWT Authentication
    # ------------------------------------------------------------------
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 60))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 7))
    )
    # Where JWT should be looked for in incoming requests
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # ------------------------------------------------------------------
    # Cloudinary (image / document uploads)
    # ------------------------------------------------------------------
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

    # ------------------------------------------------------------------
    # Brevo (transactional email API)
    # ------------------------------------------------------------------
    BREVO_API_KEY = os.getenv("BREVO_API_KEY")
    BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "no-reply@transiti-fy.example")
    BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "transiti-fy")

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


# Map env name -> config class, selected in app/__init__.py
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}
