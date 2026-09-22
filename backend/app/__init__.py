"""
app/__init__.py
------------------
Application factory. `create_app()` is the single entry point that:
  1. Loads configuration (config.py)
  2. Initializes extensions (db, jwt, migrate) from extensions.py
  3. Enables CORS for the React frontend
  4. Registers all route blueprints
  5. Imports models so SQLAlchemy is aware of every table

Import order matters here: extensions must be initialized BEFORE models
are imported, and models must be imported BEFORE blueprints that use
them are registered.
"""

import os
from flask import Flask
from flask_cors import CORS

from app.config import config_by_name
from app.extensions import db, jwt, migrate


def create_app():
    app = Flask(__name__)

    # ------------------------------------------------------------------
    # 1. Load config based on FLASK_ENV (defaults to development)
    # ------------------------------------------------------------------
    env = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_by_name.get(env, config_by_name["development"]))

    # ------------------------------------------------------------------
    # 2. Initialize extensions
    # ------------------------------------------------------------------
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    # ------------------------------------------------------------------
    # 3. CORS - allow the Vite/React frontend origin, with credentials
    #    support for the Authorization header
    # ------------------------------------------------------------------
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("FRONTEND_URL", "*")}},
        supports_credentials=True,
    )

    # ------------------------------------------------------------------
    # 4. Import models so they register with SQLAlchemy metadata
    # ------------------------------------------------------------------
    with app.app_context():
        from app import models  # noqa: F401

    # ------------------------------------------------------------------
    # 5. Register blueprints
    # ------------------------------------------------------------------
    from app.routes.health import health_bp
    from app.routes.auth import auth_bp
    from app.routes.vehicles import vehicles_bp
    from app.routes.drivers import drivers_bp
    from app.routes.trips import trips_bp
    from app.routes.maintenance import maintenance_bp
    from app.routes.fuel_expense import fuel_expense_bp
    from app.routes.analytics import analytics_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(vehicles_bp)
    app.register_blueprint(drivers_bp)
    app.register_blueprint(trips_bp)
    app.register_blueprint(maintenance_bp)
    app.register_blueprint(fuel_expense_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(settings_bp)

    return app
