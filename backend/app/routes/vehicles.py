"""
app/routes/vehicles.py
-------------------------
Vehicle Registry module.

Business rules enforced here:
  - registration_number must be unique (DB unique constraint + explicit check
    for a clean error message instead of a raw IntegrityError)
  - Retired or In Shop vehicles are excluded from the "dispatch pool"
    endpoint used by the Trip Dispatcher's vehicle dropdown
  - Status may only be one of: Available, On Trip, In Shop, Retired
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.vehicle import Vehicle
from app.utils.csv_export import rows_to_csv_response

vehicles_bp = Blueprint("vehicles", __name__, url_prefix="/api/vehicles")

VALID_STATUSES = ("Available", "On Trip", "In Shop", "Retired")


@vehicles_bp.route("", methods=["GET"])
@jwt_required()
def list_vehicles():
    """List all vehicles, with optional filters: type, status, region, search."""
    query = Vehicle.query

    vehicle_type = request.args.get("type")
    status = request.args.get("status")
    region = request.args.get("region")
    search = request.args.get("search")

    if vehicle_type:
        query = query.filter_by(vehicle_type=vehicle_type)
    if status:
        query = query.filter_by(status=status)
    if region:
        query = query.filter_by(region=region)
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Vehicle.registration_number.ilike(like), Vehicle.name_model.ilike(like))
        )

    vehicles = query.order_by(Vehicle.created_at.desc()).all()
    return jsonify([v.to_dict() for v in vehicles]), 200


@vehicles_bp.route("/dispatch-pool", methods=["GET"])
@jwt_required()
def dispatch_pool():
    """
    Vehicles eligible for trip dispatch: excludes Retired and In Shop,
    and any vehicle already On Trip. Used by the Trip Dispatcher's
    Vehicle dropdown (only Available Vehicles).
    """
    vehicles = Vehicle.query.filter_by(status="Available").all()
    return jsonify([v.to_dict() for v in vehicles]), 200


@vehicles_bp.route("/<int:vehicle_id>", methods=["GET"])
@jwt_required()
def get_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    return jsonify(vehicle.to_dict()), 200


@vehicles_bp.route("", methods=["POST"])
@jwt_required()
def create_vehicle():
    """Register a new vehicle. registration_number must be unique."""
    data = request.get_json() or {}

    required = ["registration_number", "name_model", "vehicle_type", "max_load_capacity_kg"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    if Vehicle.query.filter_by(registration_number=data["registration_number"]).first():
        return jsonify({"message": "A vehicle with this registration number already exists."}), 409

    status = data.get("status", "Available")
    if status not in VALID_STATUSES:
        return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400

    vehicle = Vehicle(
        registration_number=data["registration_number"],
        name_model=data["name_model"],
        vehicle_type=data["vehicle_type"],
        max_load_capacity_kg=data["max_load_capacity_kg"],
        odometer_km=data.get("odometer_km", 0),
        acquisition_cost=data.get("acquisition_cost", 0),
        status=status,
        region=data.get("region"),
        document_url=data.get("document_url"),
    )
    db.session.add(vehicle)
    db.session.commit()

    return jsonify({"message": "Vehicle registered successfully", "vehicle": vehicle.to_dict()}), 201


@vehicles_bp.route("/<int:vehicle_id>", methods=["PUT"])
@jwt_required()
def update_vehicle(vehicle_id):
    """Update vehicle details. Registration number uniqueness re-checked if changed."""
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    data = request.get_json() or {}

    new_reg = data.get("registration_number")
    if new_reg and new_reg != vehicle.registration_number:
        if Vehicle.query.filter_by(registration_number=new_reg).first():
            return jsonify({"message": "A vehicle with this registration number already exists."}), 409
        vehicle.registration_number = new_reg

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400
        vehicle.status = data["status"]

    for field in ["name_model", "vehicle_type", "max_load_capacity_kg", "odometer_km",
                  "acquisition_cost", "region", "document_url"]:
        if field in data:
            setattr(vehicle, field, data[field])

    db.session.commit()
    return jsonify({"message": "Vehicle updated successfully", "vehicle": vehicle.to_dict()}), 200


@vehicles_bp.route("/<int:vehicle_id>", methods=["DELETE"])
@jwt_required()
def delete_vehicle(vehicle_id):
    """
    Delete a vehicle. In practice, retiring (status=Retired) is usually
    preferred over hard delete since trips/maintenance/fuel logs
    reference the vehicle; hard delete is blocked if related records exist.
    """
    vehicle = Vehicle.query.get_or_404(vehicle_id)

    if vehicle.trips or vehicle.maintenance_logs or vehicle.fuel_logs:
        return jsonify({
            "message": "This vehicle has linked trips/maintenance/fuel records. "
                       "Set status to Retired instead of deleting."
        }), 409

    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle deleted successfully"}), 200


@vehicles_bp.route("/export", methods=["GET"])
@jwt_required()
def export_vehicles():
    """Download the full vehicle registry as a CSV file."""
    vehicles = Vehicle.query.order_by(Vehicle.created_at.desc()).all()
    rows = [v.to_dict() for v in vehicles]
    return rows_to_csv_response(rows, filename="vehicles_export.csv")
