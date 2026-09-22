"""
app/models/driver.py
----------------------
Driver profile & compliance data.
Status lifecycle: Available <-> On Trip, Off Duty, Suspended
Suspended is also auto-applied when license_expiry_date has passed.
"""

from datetime import datetime, date
from app.extensions import db


class Driver(db.Model):
    __tablename__ = "drivers"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    license_category = db.Column(db.String(20), nullable=False)  # LMV, HMV, etc.
    license_expiry_date = db.Column(db.Date, nullable=False)

    contact_number = db.Column(db.String(20), nullable=False)

    safety_score = db.Column(db.Float, default=100.0)  # 0-100

    # Available | On Trip | Off Duty | Suspended
    status = db.Column(db.String(20), default="Available", nullable=False)

    # Optional Cloudinary URL for driver photo / license scan
    photo_url = db.Column(db.String(500), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    trips = db.relationship("Trip", backref="driver", lazy=True)

    @property
    def is_license_expired(self) -> bool:
        """True if the driver's license expiry date is in the past."""
        return self.license_expiry_date < date.today()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "license_number": self.license_number,
            "license_category": self.license_category,
            "license_expiry_date": self.license_expiry_date.isoformat(),
            "contact_number": self.contact_number,
            "safety_score": self.safety_score,
            "status": self.status,
            "photo_url": self.photo_url,
            "is_license_expired": self.is_license_expired,
        }

    def __repr__(self):
        return f"<Driver {self.name} ({self.status})>"
