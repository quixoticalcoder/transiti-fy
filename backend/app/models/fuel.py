"""
app/models/fuel.py
--------------------
Fuel Log - records fuel purchases per vehicle (optionally tied to a trip).
Used to compute Fuel Efficiency (distance / fuel) and operational cost.
"""

from datetime import datetime, date
from app.extensions import db


class FuelLog(db.Model):
    __tablename__ = "fuel_logs"

    id = db.Column(db.Integer, primary_key=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=True)

    liters = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    log_date = db.Column(db.Date, default=date.today)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "trip_id": self.trip_id,
            "liters": self.liters,
            "cost": self.cost,
            "log_date": self.log_date.isoformat(),
        }

    def __repr__(self):
        return f"<FuelLog vehicle={self.vehicle_id} {self.liters}L>"
