"""
extensions.py
--------------
Flask extensions are instantiated here (without an app instance) and then
bound to the app inside the `create_app()` factory using `.init_app(app)`.

This pattern avoids circular imports between app/__init__.py and the
model/route modules that need access to `db` or `jwt`.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# SQLAlchemy ORM instance - used by every model in app/models
db = SQLAlchemy()

# JWT manager - handles access/refresh token creation & verification
jwt = JWTManager()

# Alembic-based migration tool, tracks schema changes over time
migrate = Migrate()
