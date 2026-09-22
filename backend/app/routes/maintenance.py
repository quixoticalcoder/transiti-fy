"""
app/routes/maintenance.py
----------------------------
Maintenance Log module.

Business rules enforced here:
  - Creating a record with status "In Shop" automatically switches the
    linked vehicle's status to "In Shop", removing it from the dispatch pool
  - Marking a record "Completed" restores the vehicle to "Available",
    UNLESS the vehicle has been separately marked "Retired"
"""

from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.maintenance import MaintenanceLog
from app.models.vehicle import Vehicle
from app.utils.csv_export import rows_to_csv_response

maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/api/maintenance")

VALID_STATUSES = ("In Shop", "Completed")


@maintenance_bp.route("", methods=["GET"])
@jwt_required()
def list_maintenance():
    """List maintenance records, optionally filtered by vehicle or status."""
    query = MaintenanceLog.query

    vehicle_id = request.args.get("vehicle_id")
    status = request.args.get("status")

    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if status:
        query = query.filter_by(status=status)

    logs = query.order_by(MaintenanceLog.created_at.desc()).all()
    return jsonify([_log_with_vehicle(log) for log in logs]), 200


@maintenance_bp.route("/<int:log_id>", methods=["GET"])
@jwt_required()
def get_maintenance(log_id):
    log = MaintenanceLog.query.get_or_404(log_id)
    return jsonify(_log_with_vehicle(log)), 200


@maintenance_bp.route("", methods=["POST"])
@jwt_required()
def create_maintenance():
    """
    Create a maintenance record for a vehicle. If status is "In Shop"
    (the default), the vehicle is immediately pulled from the dispatch
    pool by flipping its status to "In Shop".
    """
    data = request.get_json() or {}

    required = ["vehicle_id", "service_type", "cost"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    if data["cost"] <= 0:
        return jsonify({"message": "Cost must be a positive number."}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"message": "Selected vehicle not found."}), 404

    if vehicle.status == "On Trip":
        return jsonify({"message": "Vehicle is currently on a trip and cannot be sent to maintenance."}), 400

    status = data.get("status", "In Shop")
    if status not in VALID_STATUSES:
        return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400

    service_date = date.today()
    if data.get("service_date"):
        try:
            service_date = date.fromisoformat(data["service_date"])
        except ValueError:
            return jsonify({"message": "service_date must be in YYYY-MM-DD format"}), 400

    log = MaintenanceLog(
        vehicle_id=vehicle.id,
        service_type=data["service_type"],
        cost=data["cost"],
        service_date=service_date,
        status=status,
    )
    db.session.add(log)

    # Business rule: creating an "In Shop" record locks the vehicle out of dispatch
    if status == "In Shop":
        vehicle.status = "In Shop"

    db.session.commit()

    return jsonify({
        "message": "Maintenance record created",
        "maintenance": log.to_dict(),
        "vehicle": vehicle.to_dict(),
    }), 201


@maintenance_bp.route("/<int:log_id>", methods=["PUT"])
@jwt_required()
def update_maintenance(log_id):
    """
    Update a maintenance record. Transitioning status to "Completed"
    restores the vehicle to Available (unless Retired).
    """
    log = MaintenanceLog.query.get_or_404(log_id)
    data = request.get_json() or {}

    for field in ["service_type", "cost", "service_date"]:
        if field in data:
            if field == "service_date":
                try:
                    log.service_date = date.fromisoformat(data["service_date"])
                except ValueError:
                    return jsonify({"message": "service_date must be in YYYY-MM-DD format"}), 400
            else:
                setattr(log, field, data[field])

    if "status" in data:
        new_status = data["status"]
        if new_status not in VALID_STATUSES:
            return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400

        was_in_shop = log.status == "In Shop"
        log.status = new_status

        vehicle = Vehicle.query.get(log.vehicle_id)
        if vehicle:
            if new_status == "Completed" and was_in_shop:
                # Restore to Available unless the vehicle has been Retired
                if vehicle.status != "Retired":
                    vehicle.status = "Available"
            elif new_status == "In Shop":
                vehicle.status = "In Shop"

    db.session.commit()
    return jsonify({"message": "Maintenance record updated", "maintenance": log.to_dict()}), 200


@maintenance_bp.route("/<int:log_id>/complete", methods=["POST"])
@jwt_required()
def complete_maintenance(log_id):
    """Convenience endpoint: mark a maintenance record Completed and free the vehicle."""
    log = MaintenanceLog.query.get_or_404(log_id)

    if log.status == "Completed":
        return jsonify({"message": "This maintenance record is already Completed."}), 400

    log.status = "Completed"
    vehicle = Vehicle.query.get(log.vehicle_id)
    if vehicle and vehicle.status != "Retired":
        vehicle.status = "Available"

    db.session.commit()
    return jsonify({
        "message": "Maintenance completed, vehicle restored to Available",
        "maintenance": log.to_dict(),
        "vehicle": vehicle.to_dict() if vehicle else None,
    }), 200


@maintenance_bp.route("/<int:log_id>", methods=["DELETE"])
@jwt_required()
def delete_maintenance(log_id):
    log = MaintenanceLog.query.get_or_404(log_id)
    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Maintenance record deleted"}), 200


@maintenance_bp.route("/export", methods=["GET"])
@jwt_required()
def export_maintenance():
    """Download all maintenance records as a CSV file."""
    logs = MaintenanceLog.query.order_by(MaintenanceLog.created_at.desc()).all()
    rows = [log.to_dict() for log in logs]
    return rows_to_csv_response(rows, filename="maintenance_export.csv")


def _log_with_vehicle(log: MaintenanceLog) -> dict:
    data = log.to_dict()
    vehicle = Vehicle.query.get(log.vehicle_id)
    data["vehicle"] = vehicle.to_dict() if vehicle else None
    return data
