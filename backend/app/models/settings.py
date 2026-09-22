"""
app/models/settings.py
-------------------------
General application settings (Settings & RBAC page - left panel).
Designed as a singleton table: only one row is expected to exist
(id=1). Use Settings.get_or_create() instead of querying directly.
"""

from datetime import datetime
from app.extensions import db


class Settings(db.Model):
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)

    depot_name = db.Column(db.String(150), default="Main Depot")
    currency = db.Column(db.String(10), default="INR")  # e.g. INR, USD, EUR
    distance_unit = db.Column(db.String(20), default="Kilometers")  # Kilometers | Miles

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @classmethod
    def get_or_create(cls):
        """Fetch the single settings row, creating it with defaults if absent."""
        settings = cls.query.first()
        if not settings:
            settings = cls()
            db.session.add(settings)
            db.session.commit()
        return settings

    def to_dict(self) -> dict:
        return {
            "depot_name": self.depot_name,
            "currency": self.currency,
            "distance_unit": self.distance_unit,
        }

    def __repr__(self):
        return f"<Settings depot={self.depot_name}>"
