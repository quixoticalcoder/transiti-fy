"""
app/models/maintenance.py
---------------------------
Maintenance Log - creating an "In Shop" record automatically flips the
linked vehicle's status to In Shop; marking it "Completed" restores the
vehicle to Available (unless the vehicle has been Retired).
"""

from datetime import datetime, date
from app.extensions import db


class MaintenanceLog(db.Model):
    __tablename__ = "maintenance_logs"

    id = db.Column(db.Integer, primary_key=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)

    # Oil Change, Engine Repair, Tyre Replacement, General Service, etc.
    service_type = db.Column(db.String(100), nullable=False)
    cost = db.Column(db.Float, nullable=False)
    service_date = db.Column(db.Date, default=date.today)

    # In Shop | Completed
    status = db.Column(db.String(20), default="In Shop", nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "service_type": self.service_type,
            "cost": self.cost,
            "service_date": self.service_date.isoformat(),
            "status": self.status,
        }

    def __repr__(self):
        return f"<MaintenanceLog vehicle={self.vehicle_id} {self.service_type} ({self.status})>"
