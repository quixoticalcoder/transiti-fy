"""
app/routes/dashboard.py
--------------------------
Dashboard module - the 7 KPI summary cards, recent trips table, and
vehicle status distribution panel, all filterable by vehicle type,
status, and region (per the mockup's three filter dropdowns).
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/kpis", methods=["GET"])
@jwt_required()
def kpis():
    """
    Seven KPI cards: Active Vehicles, Available Vehicles, Vehicles in
    Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet
    Utilization (%). Accepts optional ?type=&status=&region= filters,
    applied to the vehicle set the KPIs are computed from.
    """
    vehicle_type = request.args.get("type")
    status = request.args.get("status")
    region = request.args.get("region")

    vehicle_query = Vehicle.query
    if vehicle_type:
        vehicle_query = vehicle_query.filter_by(vehicle_type=vehicle_type)
    if status:
        vehicle_query = vehicle_query.filter_by(status=status)
    if region:
        vehicle_query = vehicle_query.filter_by(region=region)

    vehicles = vehicle_query.all()

    active_vehicles = [v for v in vehicles if v.status != "Retired"]
    available_vehicles = [v for v in vehicles if v.status == "Available"]
    in_maintenance = [v for v in vehicles if v.status == "In Shop"]
    on_trip_vehicles = [v for v in vehicles if v.status == "On Trip"]

    active_trips = Trip.query.filter_by(status="Dispatched").count()
    pending_trips = Trip.query.filter_by(status="Draft").count()

    drivers_on_duty = Driver.query.filter_by(status="On Trip").count()

    fleet_utilization = (
        round((len(on_trip_vehicles) / len(active_vehicles)) * 100, 2) if active_vehicles else 0
    )

    return jsonify({
        "active_vehicles": len(active_vehicles),
        "available_vehicles": len(available_vehicles),
        "vehicles_in_maintenance": len(in_maintenance),
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_on_duty": drivers_on_duty,
        "fleet_utilization_percent": fleet_utilization,
    }), 200


@dashboard_bp.route("/recent-trips", methods=["GET"])
@jwt_required()
def recent_trips():
    """Most recent trips for the Recent Trips table, newest first."""
    limit = int(request.args.get("limit", 10))
    trips = Trip.query.order_by(Trip.created_at.desc()).limit(limit).all()

    result = []
    for trip in trips:
        vehicle = Vehicle.query.get(trip.vehicle_id) if trip.vehicle_id else None
        driver = Driver.query.get(trip.driver_id) if trip.driver_id else None
        result.append({
            "trip_id": trip.id,
            "vehicle": vehicle.name_model if vehicle else "Awaiting Vehicle",
            "driver": driver.name if driver else "Awaiting Driver",
            "status": trip.status,
            "eta": trip.eta.isoformat() if trip.eta else "Awaiting Vehicle",
        })

    return jsonify(result), 200


@dashboard_bp.route("/vehicle-status-distribution", methods=["GET"])
@jwt_required()
def vehicle_status_distribution():
    """Counts of vehicles per status, for the horizontal progress-bar panel."""
    vehicles = Vehicle.query.all()
    total = len(vehicles) or 1  # avoid div-by-zero

    statuses = ("Available", "On Trip", "In Shop", "Retired")
    distribution = []
    for status in statuses:
        count = len([v for v in vehicles if v.status == status])
        distribution.append({
            "status": status,
            "count": count,
            "percent": round((count / total) * 100, 2),
        })

    return jsonify(distribution), 200
