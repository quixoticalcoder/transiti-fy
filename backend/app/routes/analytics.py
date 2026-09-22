"""
app/routes/analytics.py
--------------------------
Reports & Analytics module.

Formulas implemented (as per spec section 3.8):
  - Fuel Efficiency (km/l) = total distance / total fuel consumed
  - Fleet Utilization (%) = (vehicles On Trip / total non-retired vehicles) * 100
  - Operational Cost = Fuel Cost + Maintenance Cost (+ tolls/other expenses)
  - Vehicle ROI (%) = (Revenue - (Maintenance + Fuel)) / Acquisition Cost * 100
"""

from collections import defaultdict
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.fuel import FuelLog
from app.models.maintenance import MaintenanceLog
from app.models.expense import Expense

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    """Four top-line KPI cards: Fuel Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI."""
    vehicles = Vehicle.query.all()
    completed_trips = Trip.query.filter_by(status="Completed").all()
    fuel_logs = FuelLog.query.all()
    maintenance_logs = MaintenanceLog.query.all()
    expenses = Expense.query.all()

    # --- Fuel Efficiency (km/l) ---
    total_distance = sum(t.actual_distance_km or 0 for t in completed_trips)
    total_fuel = sum(f.liters for f in fuel_logs)
    fuel_efficiency = round(total_distance / total_fuel, 2) if total_fuel else 0

    # --- Fleet Utilization (%) ---
    active_vehicles = [v for v in vehicles if v.status != "Retired"]
    on_trip_vehicles = [v for v in active_vehicles if v.status == "On Trip"]
    fleet_utilization = (
        round((len(on_trip_vehicles) / len(active_vehicles)) * 100, 2) if active_vehicles else 0
    )

    # --- Operational Cost ---
    total_fuel_cost = sum(f.cost for f in fuel_logs)
    total_maintenance_cost = sum(m.cost for m in maintenance_logs)
    total_expense_cost = sum(e.toll_charges + e.other_expenses for e in expenses)
    operational_cost = total_fuel_cost + total_maintenance_cost + total_expense_cost

    # --- Vehicle ROI (%) - fleet-wide average ---
    total_revenue = sum(t.revenue or 0 for t in completed_trips)
    total_acquisition_cost = sum(v.acquisition_cost or 0 for v in vehicles) or 1  # avoid div-by-zero
    roi_percent = round(
        ((total_revenue - (total_maintenance_cost + total_fuel_cost)) / total_acquisition_cost) * 100, 2
    )

    return jsonify({
        "fuel_efficiency_km_per_l": fuel_efficiency,
        "fleet_utilization_percent": fleet_utilization,
        "operational_cost": operational_cost,
        "vehicle_roi_percent": roi_percent,
        "roi_formula": "ROI = (Revenue - (Maintenance Cost + Fuel Cost)) / Acquisition Cost",
    }), 200


@analytics_bp.route("/monthly-revenue", methods=["GET"])
@jwt_required()
def monthly_revenue():
    """Revenue generated per month, from Completed trips, for the bar chart."""
    completed_trips = Trip.query.filter_by(status="Completed").all()

    monthly_totals = defaultdict(float)
    for trip in completed_trips:
        if trip.updated_at:
            key = trip.updated_at.strftime("%Y-%m")
            monthly_totals[key] += trip.revenue or 0

    data = [{"month": month, "revenue": total} for month, total in sorted(monthly_totals.items())]
    return jsonify(data), 200


@analytics_bp.route("/top-costliest-vehicles", methods=["GET"])
@jwt_required()
def top_costliest_vehicles():
    """
    Vehicles ranked by total operational cost (fuel + maintenance + tolls
    + other expenses), descending - for the "Top Costliest Vehicles" panel.
    """
    limit = int(request.args.get("limit", 5))
    vehicles = Vehicle.query.all()

    results = []
    for vehicle in vehicles:
        fuel_cost = sum(f.cost for f in FuelLog.query.filter_by(vehicle_id=vehicle.id).all())
        maintenance_cost = sum(m.cost for m in MaintenanceLog.query.filter_by(vehicle_id=vehicle.id).all())
        expense_cost = sum(
            e.toll_charges + e.other_expenses
            for e in Expense.query.filter_by(vehicle_id=vehicle.id).all()
        )
        total_cost = fuel_cost + maintenance_cost + expense_cost

        results.append({
            "vehicle_id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "name_model": vehicle.name_model,
            "total_operational_cost": total_cost,
        })

    results.sort(key=lambda r: r["total_operational_cost"], reverse=True)
    return jsonify(results[:limit]), 200


@analytics_bp.route("/vehicle-roi/<int:vehicle_id>", methods=["GET"])
@jwt_required()
def vehicle_roi(vehicle_id):
    """Per-vehicle ROI breakdown: ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost."""
    vehicle = Vehicle.query.get_or_404(vehicle_id)

    revenue = sum(
        t.revenue or 0 for t in Trip.query.filter_by(vehicle_id=vehicle.id, status="Completed").all()
    )
    fuel_cost = sum(f.cost for f in FuelLog.query.filter_by(vehicle_id=vehicle.id).all())
    maintenance_cost = sum(m.cost for m in MaintenanceLog.query.filter_by(vehicle_id=vehicle.id).all())

    acquisition_cost = vehicle.acquisition_cost or 1  # avoid div-by-zero
    roi_percent = round(((revenue - (maintenance_cost + fuel_cost)) / acquisition_cost) * 100, 2)

    return jsonify({
        "vehicle_id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "revenue": revenue,
        "fuel_cost": fuel_cost,
        "maintenance_cost": maintenance_cost,
        "acquisition_cost": vehicle.acquisition_cost,
        "roi_percent": roi_percent,
    }), 200
