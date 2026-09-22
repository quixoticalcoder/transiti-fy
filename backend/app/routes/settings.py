"""
app/routes/settings.py
--------------------------
Settings & RBAC module.

- General Settings (Depot Name, Currency, Distance Unit) - single row,
  editable only by fleet_manager (treated as the admin role here).
- RBAC permission matrix - one row per (role, module), editable only by
  fleet_manager. Reading the matrix is open to any authenticated user so
  the frontend can adjust its own UI based on the caller's permissions.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models.settings import Settings
from app.models.role_permission import RolePermission, ROLES, MODULES, ACCESS_LEVELS
from app.utils.rbac import roles_required

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

# Treated as the administrative role for this scaffold - adjust as needed
ADMIN_ROLE = "fleet_manager"


@settings_bp.route("/general", methods=["GET"])
@jwt_required()
def get_general_settings():
    settings = Settings.get_or_create()
    return jsonify(settings.to_dict()), 200


@settings_bp.route("/general", methods=["PUT"])
@roles_required(ADMIN_ROLE)
def update_general_settings():
    """Only fleet_manager (admin) may update Depot Name / Currency / Distance Unit."""
    settings = Settings.get_or_create()
    data = request.get_json() or {}

    if "distance_unit" in data and data["distance_unit"] not in ("Kilometers", "Miles"):
        return jsonify({"message": "distance_unit must be 'Kilometers' or 'Miles'"}), 400

    for field in ["depot_name", "currency", "distance_unit"]:
        if field in data:
            setattr(settings, field, data[field])

    db.session.commit()
    return jsonify({"message": "Settings updated", "settings": settings.to_dict()}), 200


@settings_bp.route("/rbac", methods=["GET"])
@jwt_required()
def get_rbac_matrix():
    """
    Return the full RBAC permission matrix. If no rows exist yet
    (fresh DB before seeding), fall back to a sensible default matrix
    so the frontend always has something to render.
    """
    permissions = RolePermission.query.all()

    if not permissions:
        return jsonify(_default_matrix()), 200

    matrix = {role: {} for role in ROLES}
    for p in permissions:
        matrix.setdefault(p.role, {})[p.module] = p.access_level

    return jsonify(matrix), 200


@settings_bp.route("/rbac", methods=["PUT"])
@roles_required(ADMIN_ROLE)
def update_rbac_matrix():
    """
    Update one or more (role, module) permission cells. Body shape:
    { "updates": [ { "role": "dispatcher", "module": "Fleet", "access_level": "View Only" }, ... ] }

    Changes take effect immediately for all future requests, since
    app/utils/rbac.py reads this table live rather than caching it.
    """
    data = request.get_json() or {}
    updates = data.get("updates", [])

    if not updates:
        return jsonify({"message": "No updates provided"}), 400

    for update in updates:
        role = update.get("role")
        module = update.get("module")
        access_level = update.get("access_level")

        if role not in ROLES:
            return jsonify({"message": f"Invalid role: {role}"}), 400
        if module not in MODULES:
            return jsonify({"message": f"Invalid module: {module}"}), 400
        if access_level not in ACCESS_LEVELS:
            return jsonify({"message": f"Invalid access_level: {access_level}"}), 400

        permission = RolePermission.query.filter_by(role=role, module=module).first()
        if permission:
            permission.access_level = access_level
        else:
            db.session.add(RolePermission(role=role, module=module, access_level=access_level))

    db.session.commit()
    return jsonify({"message": "RBAC permissions updated successfully"}), 200


def _default_matrix() -> dict:
    """Sensible default permission matrix matching the spec's role descriptions."""
    return {
        "fleet_manager": {m: "Full Access" for m in MODULES},
        "dispatcher": {
            "Fleet": "View Only", "Drivers": "View Only", "Trips": "Full Access",
            "Fuel & Expenses": "View Only", "Analytics": "View Only",
        },
        "safety_officer": {
            "Fleet": "View Only", "Drivers": "Full Access", "Trips": "View Only",
            "Fuel & Expenses": "No Access", "Analytics": "View Only",
        },
        "financial_analyst": {
            "Fleet": "View Only", "Drivers": "No Access", "Trips": "View Only",
            "Fuel & Expenses": "Full Access", "Analytics": "Full Access",
        },
    }
