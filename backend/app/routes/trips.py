"""
app/routes/trips.py
----------------------
Trip Management module - the heart of the mandatory business rules:

  - Cargo Weight must not exceed the vehicle's max_load_capacity_kg
  - Retired/In Shop vehicles never appear in the dispatch pool
  - Drivers with expired licenses or Suspended status cannot be assigned
  - A vehicle/driver already On Trip cannot be assigned to another trip
  - Dispatching a trip -> vehicle & driver become On Trip
  - Completing a trip -> vehicle & driver become Available
  - Cancelling a dispatched trip -> vehicle & driver restored to Available

Trip lifecycle: Draft -> Dispatched -> Completed
                Draft -> Dispatched -> Cancelled
"""

from datetime import date, datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.utils.csv_export import rows_to_csv_response

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


@trips_bp.route("", methods=["GET"])
@jwt_required()
def list_trips():
    """List all trips, optionally filtered by status."""
    query = Trip.query
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    trips = query.order_by(Trip.created_at.desc()).all()
    return jsonify([_trip_with_relations(t) for t in trips]), 200


@trips_bp.route("/<int:trip_id>", methods=["GET"])
@jwt_required()
def get_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    return jsonify(_trip_with_relations(trip)), 200


@trips_bp.route("", methods=["POST"])
@jwt_required()
def create_trip():
    """
    Create a trip in Draft status. Vehicle/driver assignment is optional
    at creation time; validation for dispatch-readiness happens in the
    /dispatch endpoint, but we still block obviously-invalid combinations
    up front (unavailable vehicle/driver, over-capacity cargo) so the UI
    can surface errors immediately, per the mockup's live validation box.
    """
    data = request.get_json() or {}

    required = ["source", "destination", "cargo_weight_kg", "planned_distance_km"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    vehicle_id = data.get("vehicle_id")
    driver_id = data.get("driver_id")
    cargo_weight = data["cargo_weight_kg"]

    if vehicle_id:
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            return jsonify({"message": "Selected vehicle not found."}), 404
        if vehicle.status != "Available":
            return jsonify({"message": f"Vehicle is currently {vehicle.status} and cannot be assigned."}), 400
        if cargo_weight > vehicle.max_load_capacity_kg:
            over_by = cargo_weight - vehicle.max_load_capacity_kg
            return jsonify({
                "message": f"Capacity exceeded by {over_by} kg — Dispatch Blocked.",
                "vehicle_capacity": vehicle.max_load_capacity_kg,
                "cargo_weight": cargo_weight,
            }), 400

    if driver_id:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({"message": "Selected driver not found."}), 404
        if driver.status != "Available":
            return jsonify({"message": f"Driver is currently {driver.status} and cannot be assigned."}), 400
        if driver.license_expiry_date < date.today():
            return jsonify({"message": "Driver's license has expired and cannot be assigned."}), 400

    trip = Trip(
        source=data["source"],
        destination=data["destination"],
        vehicle_id=vehicle_id,
        driver_id=driver_id,
        cargo_weight_kg=cargo_weight,
        planned_distance_km=data["planned_distance_km"],
        status="Draft",
        revenue=data.get("revenue", 0),
    )
    db.session.add(trip)
    db.session.commit()

    return jsonify({"message": "Trip created as Draft", "trip": _trip_with_relations(trip)}), 201


@trips_bp.route("/<int:trip_id>/dispatch", methods=["POST"])
@jwt_required()
def dispatch_trip(trip_id):
    """
    Dispatch a Draft trip: re-validates every business rule (vehicle/driver
    availability, license, capacity) at the moment of dispatch - since
    time may have passed since the trip was drafted - then flips the
    trip to Dispatched and both resources to On Trip.
    """
    trip = Trip.query.get_or_404(trip_id)

    if trip.status != "Draft":
        return jsonify({"message": f"Only Draft trips can be dispatched (current status: {trip.status})."}), 400

    if not trip.vehicle_id or not trip.driver_id:
        return jsonify({"message": "A vehicle and driver must be assigned before dispatch."}), 400

    vehicle = Vehicle.query.get(trip.vehicle_id)
    driver = Driver.query.get(trip.driver_id)

    if vehicle.status in ("Retired", "In Shop"):
        return jsonify({"message": f"Vehicle is {vehicle.status} and cannot be dispatched."}), 400
    if vehicle.status == "On Trip":
        return jsonify({"message": "Vehicle is already assigned to another trip."}), 400

    if driver.status == "Suspended" or driver.license_expiry_date < date.today():
        return jsonify({"message": "Driver is suspended or license has expired."}), 400
    if driver.status == "On Trip":
        return jsonify({"message": "Driver is already assigned to another trip."}), 400

    if trip.cargo_weight_kg > vehicle.max_load_capacity_kg:
        over_by = trip.cargo_weight_kg - vehicle.max_load_capacity_kg
        return jsonify({"message": f"Capacity exceeded by {over_by} kg — Dispatch Blocked."}), 400

    # All checks passed - dispatch
    trip.status = "Dispatched"
    trip.eta = datetime.utcnow()  # placeholder ETA; refine with route/distance calc later
    vehicle.status = "On Trip"
    driver.status = "On Trip"
    db.session.commit()

    return jsonify({"message": "Trip dispatched successfully", "trip": _trip_with_relations(trip)}), 200


@trips_bp.route("/<int:trip_id>/complete", methods=["POST"])
@jwt_required()
def complete_trip(trip_id):
    """
    Complete a Dispatched trip: records final odometer/fuel consumed,
    restores vehicle & driver to Available, and updates the vehicle's
    odometer reading.
    """
    trip = Trip.query.get_or_404(trip_id)
    data = request.get_json() or {}

    if trip.status != "Dispatched":
        return jsonify({"message": f"Only Dispatched trips can be completed (current status: {trip.status})."}), 400

    trip.actual_distance_km = data.get("actual_distance_km", trip.planned_distance_km)
    trip.fuel_consumed_liters = data.get("fuel_consumed_liters")
    if "revenue" in data:
        trip.revenue = data["revenue"]
    trip.status = "Completed"

    vehicle = Vehicle.query.get(trip.vehicle_id)
    driver = Driver.query.get(trip.driver_id)

    if vehicle:
        vehicle.status = "Available"
        if trip.actual_distance_km:
            vehicle.odometer_km = (vehicle.odometer_km or 0) + trip.actual_distance_km
    if driver:
        driver.status = "Available"

    db.session.commit()
    return jsonify({"message": "Trip marked as Completed", "trip": _trip_with_relations(trip)}), 200


@trips_bp.route("/<int:trip_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_trip(trip_id):
    """
    Cancel a trip. If it was Dispatched, restores vehicle & driver to
    Available. Draft trips can also be cancelled with no side effects.
    """
    trip = Trip.query.get_or_404(trip_id)

    if trip.status not in ("Draft", "Dispatched"):
        return jsonify({"message": f"Cannot cancel a trip that is already {trip.status}."}), 400

    was_dispatched = trip.status == "Dispatched"
    trip.status = "Cancelled"

    if was_dispatched:
        vehicle = Vehicle.query.get(trip.vehicle_id)
        driver = Driver.query.get(trip.driver_id)
        if vehicle and vehicle.status == "On Trip":
            vehicle.status = "Available"
        if driver and driver.status == "On Trip":
            driver.status = "Available"

    db.session.commit()
    return jsonify({"message": "Trip cancelled", "trip": _trip_with_relations(trip)}), 200


@trips_bp.route("/export", methods=["GET"])
@jwt_required()
def export_trips():
    """Download all trips as a CSV file."""
    trips = Trip.query.order_by(Trip.created_at.desc()).all()
    rows = [t.to_dict() for t in trips]
    return rows_to_csv_response(rows, filename="trips_export.csv")


def _trip_with_relations(trip: Trip) -> dict:
    """Serialize a trip along with a light snapshot of its vehicle/driver,
    so the Live Board can render route/vehicle/driver info in one call."""
    data = trip.to_dict()
    vehicle = Vehicle.query.get(trip.vehicle_id) if trip.vehicle_id else None
    driver = Driver.query.get(trip.driver_id) if trip.driver_id else None
    data["vehicle"] = vehicle.to_dict() if vehicle else None
    data["driver"] = driver.to_dict() if driver else None
    return data
