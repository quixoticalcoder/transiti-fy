"""
app/models/__init__.py
------------------------
Importing every model here ensures that when `app` (and therefore
`app.models`) is imported, all model classes register themselves with
SQLAlchemy's metadata. This is required for `db.create_all()` and for
Flask-Migrate to detect tables correctly.
"""

from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog
from app.models.fuel import FuelLog
from app.models.expense import Expense
from app.models.settings import Settings
from app.models.role_permission import RolePermission

__all__ = [
    "User",
    "Vehicle",
    "Driver",
    "Trip",
    "MaintenanceLog",
    "FuelLog",
    "Expense",
    "Settings",
    "RolePermission",
]
