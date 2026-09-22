"""
app/routes/fuel_expense.py
-----------------------------
Fuel & Expense Management module.

Business rule:
  - Total operational cost per vehicle = Fuel Cost + Maintenance Cost
    (+ Toll/Other Expenses when computing full trip-level Total Cost)
  - Total Cost (per expense record) = Fuel Cost + Toll Charges +
    Other Expenses + Maintenance Cost (linked via vehicle)
"""

from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.fuel import FuelLog
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.maintenance import MaintenanceLog
from app.utils.csv_export import rows_to_csv_response

fuel_expense_bp = Blueprint("fuel_expense", __name__, url_prefix="/api")


# ----------------------------------------------------------------------
# Fuel Logs
# ----------------------------------------------------------------------

@fuel_expense_bp.route("/fuel-logs", methods=["GET"])
@jwt_required()
def list_fuel_logs():
    query = FuelLog.query
    vehicle_id = request.args.get("vehicle_id")
    trip_id = request.args.get("trip_id")

    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)

    logs = query.order_by(FuelLog.created_at.desc()).all()
    return jsonify([log.to_dict() for log in logs]), 200


@fuel_expense_bp.route("/fuel-logs", methods=["POST"])
@jwt_required()
def create_fuel_log():
    data = request.get_json() or {}

    required = ["vehicle_id", "liters", "cost"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"message": "Selected vehicle not found."}), 404

    log_date = date.today()
    if data.get("log_date"):
        try:
            log_date = date.fromisoformat(data["log_date"])
        except ValueError:
            return jsonify({"message": "log_date must be in YYYY-MM-DD format"}), 400

    log = FuelLog(
        vehicle_id=vehicle.id,
        trip_id=data.get("trip_id"),
        liters=data["liters"],
        cost=data["cost"],
        log_date=log_date,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Fuel log recorded", "fuel_log": log.to_dict()}), 201


@fuel_expense_bp.route("/fuel-logs/<int:log_id>", methods=["DELETE"])
@jwt_required()
def delete_fuel_log(log_id):
    log = FuelLog.query.get_or_404(log_id)
    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Fuel log deleted"}), 200


# ----------------------------------------------------------------------
# Other Expenses (Toll / Miscellaneous)
# ----------------------------------------------------------------------

@fuel_expense_bp.route("/expenses", methods=["GET"])
@jwt_required()
def list_expenses():
    """
    List expense records, each enriched with Maintenance Cost (linked via
    vehicle's most recent maintenance) and a computed Total Cost =
    Fuel Cost (for the same trip) + Toll + Other Expenses + Maintenance Cost.
    """
    query = Expense.query
    vehicle_id = request.args.get("vehicle_id")
    trip_id = request.args.get("trip_id")

    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if trip_id:
        query = query.filter_by(trip_id=trip_id)

    expenses = query.order_by(Expense.created_at.desc()).all()
    return jsonify([_expense_with_totals(e) for e in expenses]), 200


@fuel_expense_bp.route("/expenses", methods=["POST"])
@jwt_required()
def create_expense():
    data = request.get_json() or {}

    if data.get("vehicle_id") is None:
        return jsonify({"message": "vehicle_id is required"}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"message": "Selected vehicle not found."}), 404

    expense_date = date.today()
    if data.get("expense_date"):
        try:
            expense_date = date.fromisoformat(data["expense_date"])
        except ValueError:
            return jsonify({"message": "expense_date must be in YYYY-MM-DD format"}), 400

    expense = Expense(
        vehicle_id=vehicle.id,
        trip_id=data.get("trip_id"),
        toll_charges=data.get("toll_charges", 0),
        other_expenses=data.get("other_expenses", 0),
        expense_date=expense_date,
        remarks=data.get("remarks"),
    )
    db.session.add(expense)
    db.session.commit()

    return jsonify({"message": "Expense recorded", "expense": _expense_with_totals(expense)}), 201


@fuel_expense_bp.route("/expenses/<int:expense_id>", methods=["DELETE"])
@jwt_required()
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"message": "Expense deleted"}), 200


# ----------------------------------------------------------------------
# Aggregated operational cost
# ----------------------------------------------------------------------

@fuel_expense_bp.route("/operational-cost", methods=["GET"])
@jwt_required()
def total_operational_cost():
    """
    Total Operational Cost across the fleet (or for one vehicle, if
    ?vehicle_id= is passed) = sum of all Fuel Costs + Maintenance Costs
    + Toll Charges + Other Expenses.
    """
    vehicle_id = request.args.get("vehicle_id")

    fuel_query = FuelLog.query
    maintenance_query = MaintenanceLog.query
    expense_query = Expense.query

    if vehicle_id:
        fuel_query = fuel_query.filter_by(vehicle_id=vehicle_id)
        maintenance_query = maintenance_query.filter_by(vehicle_id=vehicle_id)
        expense_query = expense_query.filter_by(vehicle_id=vehicle_id)

    total_fuel_cost = sum(f.cost for f in fuel_query.all())
    total_maintenance_cost = sum(m.cost for m in maintenance_query.all())
    total_toll = sum(e.toll_charges for e in expense_query.all())
    total_other = sum(e.other_expenses for e in expense_query.all())

    grand_total = total_fuel_cost + total_maintenance_cost + total_toll + total_other

    return jsonify({
        "fuel_cost": total_fuel_cost,
        "maintenance_cost": total_maintenance_cost,
        "toll_charges": total_toll,
        "other_expenses": total_other,
        "total_operational_cost": grand_total,
    }), 200


@fuel_expense_bp.route("/fuel-logs/export", methods=["GET"])
@jwt_required()
def export_fuel_logs():
    logs = FuelLog.query.order_by(FuelLog.created_at.desc()).all()
    rows = [log.to_dict() for log in logs]
    return rows_to_csv_response(rows, filename="fuel_logs_export.csv")


@fuel_expense_bp.route("/expenses/export", methods=["GET"])
@jwt_required()
def export_expenses():
    expenses = Expense.query.order_by(Expense.created_at.desc()).all()
    rows = [_expense_with_totals(e) for e in expenses]
    return rows_to_csv_response(rows, filename="expenses_export.csv")


def _expense_with_totals(expense: Expense) -> dict:
    """Enrich an expense record with linked maintenance cost, fuel cost,
    and a computed grand Total Cost for that trip/vehicle."""
    data = expense.to_dict()

    maintenance_cost = sum(
        m.cost for m in MaintenanceLog.query.filter_by(vehicle_id=expense.vehicle_id).all()
    )

    fuel_cost = 0
    if expense.trip_id:
        fuel_cost = sum(
            f.cost for f in FuelLog.query.filter_by(trip_id=expense.trip_id).all()
        )

    data["maintenance_cost"] = maintenance_cost
    data["fuel_cost"] = fuel_cost
    data["total_cost"] = fuel_cost + expense.toll_charges + expense.other_expenses + maintenance_cost
    return data
