"""
app/models/user.py
--------------------
User account model used for authentication (email + password) and
Role-Based Access Control (RBAC).

Roles map directly to the four personas defined in the spec:
Fleet Manager, Dispatcher, Safety Officer, Financial Analyst.
"""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    # Basic identity fields
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # RBAC role - kept as a plain string column (not FK) for simplicity;
    # allowed values enforced at the application layer.
    # One of: fleet_manager, dispatcher, safety_officer, financial_analyst, admin
    role = db.Column(db.String(50), nullable=False, default="dispatcher")

    # Account lock support (5 failed attempts -> temporary lock, per spec)
    failed_login_attempts = db.Column(db.Integer, default=0)
    is_locked = db.Column(db.Boolean, default=False)

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ------------------------------------------------------------------
    # Password helpers
    # ------------------------------------------------------------------
    def set_password(self, raw_password: str) -> None:
        """Hash and store the given plain-text password."""
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Verify a plain-text password against the stored hash."""
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self) -> dict:
        """Serialize user for API responses (never include password_hash)."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
