"""
app/models/trip.py
--------------------
Trip Management - lifecycle: Draft -> Dispatched -> Completed -> Cancelled

Business rules enforced at the service/route layer (not here):
 - cargo_weight_kg must not exceed vehicle.max_load_capacity_kg
 - vehicle & driver must be Available before dispatch
 - dispatch sets vehicle & driver status to "On Trip"
 - complete/cancel restores vehicle & driver status to "Available"
"""

from datetime import datetime
from app.extensions import db


class Trip(db.Model):
    __tablename__ = "trips"

    id = db.Column(db.Integer, primary_key=True)

    source = db.Column(db.String(150), nullable=False)
    destination = db.Column(db.String(150), nullable=False)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True)
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=True)

    cargo_weight_kg = db.Column(db.Float, nullable=False)
    planned_distance_km = db.Column(db.Float, nullable=False)
    actual_distance_km = db.Column(db.Float, nullable=True)
    fuel_consumed_liters = db.Column(db.Float, nullable=True)

    # Draft | Dispatched | Completed | Cancelled
    status = db.Column(db.String(20), default="Draft", nullable=False)

    eta = db.Column(db.DateTime, nullable=True)

    # Revenue earned from this trip (used in ROI calculation)
    revenue = db.Column(db.Float, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    fuel_logs = db.relationship("FuelLog", backref="trip", lazy=True)
    expenses = db.relationship("Expense", backref="trip", lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "source": self.source,
            "destination": self.destination,
            "vehicle_id": self.vehicle_id,
            "driver_id": self.driver_id,
            "cargo_weight_kg": self.cargo_weight_kg,
            "planned_distance_km": self.planned_distance_km,
            "actual_distance_km": self.actual_distance_km,
            "fuel_consumed_liters": self.fuel_consumed_liters,
            "status": self.status,
            "eta": self.eta.isoformat() if self.eta else None,
            "revenue": self.revenue,
        }

    def __repr__(self):
        return f"<Trip {self.id}: {self.source} -> {self.destination} ({self.status})>"
