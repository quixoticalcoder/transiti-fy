"""
app/routes/health.py
-----------------------
Simple health-check endpoint used by uptime monitors, load balancers,
or the frontend to verify the API is reachable and the DB connection
is alive.
"""

from flask import Blueprint, jsonify
from app.extensions import db
from sqlalchemy import text

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["GET"])
def health_check():
    """Return API status and DB connectivity status."""
    db_status = "ok"
    try:
        # Lightweight query to confirm the DB connection is alive
        db.session.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - we want to surface any DB error
        db_status = f"error: {str(exc)}"

    return jsonify({
        "status": "ok",
        "service": "transiti-fy API",
        "database": db_status,
    }), 200
