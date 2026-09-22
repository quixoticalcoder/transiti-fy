"""
app/models/role_permission.py
--------------------------------
Stores the RBAC permission matrix shown on the Settings page:
one row per (role, module) pair, with an access_level of
"No Access" | "View Only" | "Full Access".

Reading this table at request time (rather than hard-coding role
checks) is what allows "updates to role permissions to immediately
affect user access without requiring changes to application logic",
per the spec.
"""

from datetime import datetime
from app.extensions import db

ACCESS_LEVELS = ("No Access", "View Only", "Full Access")

ROLES = ("fleet_manager", "dispatcher", "safety_officer", "financial_analyst")

MODULES = ("Fleet", "Drivers", "Trips", "Fuel & Expenses", "Analytics")


class RolePermission(db.Model):
    __tablename__ = "role_permissions"
    __table_args__ = (
        db.UniqueConstraint("role", "module", name="uq_role_module"),
    )

    id = db.Column(db.Integer, primary_key=True)

    role = db.Column(db.String(50), nullable=False)      # one of ROLES
    module = db.Column(db.String(50), nullable=False)    # one of MODULES
    access_level = db.Column(db.String(20), default="View Only", nullable=False)

    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "role": self.role,
            "module": self.module,
            "access_level": self.access_level,
        }

    def __repr__(self):
        return f"<RolePermission {self.role}:{self.module}={self.access_level}>"
