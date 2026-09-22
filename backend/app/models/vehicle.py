"""
app/models/vehicle.py
-----------------------
Vehicle Registry - master list of fleet vehicles.
Status lifecycle: Available -> On Trip -> Available
                              -> In Shop -> Available
                  Retired (terminal state)
"""

from datetime import datetime
from app.extensions import db


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)

    # Unique registration number, e.g. "GJ-01-AB-1234"
    registration_number = db.Column(db.String(50), unique=True, nullable=False, index=True)

    name_model = db.Column(db.String(120), nullable=False)      # e.g. "Van-05"
    vehicle_type = db.Column(db.String(50), nullable=False)     # e.g. Van, Truck, Bike

    max_load_capacity_kg = db.Column(db.Float, nullable=False)
    odometer_km = db.Column(db.Float, default=0)
    acquisition_cost = db.Column(db.Float, default=0)

    # Available | On Trip | In Shop | Retired
    status = db.Column(db.String(20), default="Available", nullable=False)

    region = db.Column(db.String(100), nullable=True)

    # Optional Cloudinary URL for vehicle document/photo
    document_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trips = db.relationship("Trip", backref="vehicle", lazy=True)
    maintenance_logs = db.relationship("MaintenanceLog", backref="vehicle", lazy=True)
    fuel_logs = db.relationship("FuelLog", backref="vehicle", lazy=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "registration_number": self.registration_number,
            "name_model": self.name_model,
            "vehicle_type": self.vehicle_type,
            "max_load_capacity_kg": self.max_load_capacity_kg,
            "odometer_km": self.odometer_km,
            "acquisition_cost": self.acquisition_cost,
            "status": self.status,
            "region": self.region,
            "document_url": self.document_url,
        }

    def __repr__(self):
        return f"<Vehicle {self.registration_number} ({self.status})>"
