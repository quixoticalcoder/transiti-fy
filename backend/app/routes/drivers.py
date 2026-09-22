"""
app/routes/drivers.py
------------------------
Driver Management & Safety Profiles module.

Business rules enforced here:
  - license_number must be unique
  - Any driver whose license_expiry_date has passed is automatically
    treated as Suspended (checked live on every read via
    `_sync_expired_licenses`, so it self-heals even if a cron job isn't
    running)
  - Suspended / expired-license drivers can never be assigned to a trip
    (enforced again in routes/trips.py at dispatch time, as a second
    line of defense)
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import date
from app.extensions import db
from app.models.driver import Driver
from app.utils.csv_export import rows_to_csv_response

drivers_bp = Blueprint("drivers", __name__, url_prefix="/api/drivers")

VALID_STATUSES = ("Available", "On Trip", "Off Duty", "Suspended")


def _sync_expired_licenses():
    """
    Auto-suspend any driver whose license has expired but who is not
    already marked Suspended. Called at the top of list/get endpoints
    so the "Current Status" the user sees is always accurate.
    """
    expired_drivers = Driver.query.filter(
        Driver.license_expiry_date < date.today(),
        Driver.status != "Suspended",
    ).all()

    for driver in expired_drivers:
        driver.status = "Suspended"

    if expired_drivers:
        db.session.commit()


@drivers_bp.route("", methods=["GET"])
@jwt_required()
def list_drivers():
    """List all drivers with optional filters: status, license_category, search."""
    _sync_expired_licenses()

    query = Driver.query

    status = request.args.get("status")
    license_category = request.args.get("license_category")
    search = request.args.get("search")

    if status:
        query = query.filter_by(status=status)
    if license_category:
        query = query.filter_by(license_category=license_category)
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(Driver.name.ilike(like), Driver.license_number.ilike(like), Driver.contact_number.ilike(like))
        )

    drivers = query.order_by(Driver.created_at.desc()).all()
    return jsonify([d.to_dict() for d in drivers]), 200


@drivers_bp.route("/dispatch-pool", methods=["GET"])
@jwt_required()
def dispatch_pool():
    """
    Drivers eligible for trip dispatch: excludes Suspended, Off Duty, On Trip,
    and expired licenses. Used by the Trip Dispatcher's Driver dropdown.
    """
    _sync_expired_licenses()
    drivers = Driver.query.filter_by(status="Available").all()
    return jsonify([d.to_dict() for d in drivers]), 200


@drivers_bp.route("/<int:driver_id>", methods=["GET"])
@jwt_required()
def get_driver(driver_id):
    _sync_expired_licenses()
    driver = Driver.query.get_or_404(driver_id)
    return jsonify(driver.to_dict()), 200


@drivers_bp.route("", methods=["POST"])
@jwt_required()
def create_driver():
    """Register a new driver. license_number must be unique."""
    data = request.get_json() or {}

    required = ["name", "license_number", "license_category", "license_expiry_date", "contact_number"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    if Driver.query.filter_by(license_number=data["license_number"]).first():
        return jsonify({"message": "A driver with this license number already exists."}), 409

    try:
        expiry_date = date.fromisoformat(data["license_expiry_date"])
    except ValueError:
        return jsonify({"message": "license_expiry_date must be in YYYY-MM-DD format"}), 400

    status = data.get("status", "Available")
    if status not in VALID_STATUSES:
        return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400

    # A driver registered with an already-expired license is immediately Suspended
    if expiry_date < date.today():
        status = "Suspended"

    driver = Driver(
        name=data["name"],
        license_number=data["license_number"],
        license_category=data["license_category"],
        license_expiry_date=expiry_date,
        contact_number=data["contact_number"],
        safety_score=data.get("safety_score", 100.0),
        status=status,
        photo_url=data.get("photo_url"),
    )
    db.session.add(driver)
    db.session.commit()

    return jsonify({"message": "Driver registered successfully", "driver": driver.to_dict()}), 201


@drivers_bp.route("/<int:driver_id>", methods=["PUT"])
@jwt_required()
def update_driver(driver_id):
    """Update driver details, including manual status toggle."""
    driver = Driver.query.get_or_404(driver_id)
    data = request.get_json() or {}

    new_license = data.get("license_number")
    if new_license and new_license != driver.license_number:
        if Driver.query.filter_by(license_number=new_license).first():
            return jsonify({"message": "A driver with this license number already exists."}), 409
        driver.license_number = new_license

    if "license_expiry_date" in data:
        try:
            driver.license_expiry_date = date.fromisoformat(data["license_expiry_date"])
        except ValueError:
            return jsonify({"message": "license_expiry_date must be in YYYY-MM-DD format"}), 400

    if "status" in data:
        if data["status"] not in VALID_STATUSES:
            return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400
        # Block manually un-suspending a driver whose license is still expired
        if data["status"] != "Suspended" and driver.license_expiry_date < date.today():
            return jsonify({"message": "Cannot change status: driver's license is expired."}), 400
        driver.status = data["status"]

    for field in ["name", "license_category", "contact_number", "safety_score", "photo_url"]:
        if field in data:
            setattr(driver, field, data[field])

    db.session.commit()
    return jsonify({"message": "Driver updated successfully", "driver": driver.to_dict()}), 200


@drivers_bp.route("/<int:driver_id>/status", methods=["PATCH"])
@jwt_required()
def toggle_status(driver_id):
    """Quick status-toggle endpoint (Available / On Trip / Off Duty / Suspended)."""
    driver = Driver.query.get_or_404(driver_id)
    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in VALID_STATUSES:
        return jsonify({"message": f"Invalid status. Must be one of {VALID_STATUSES}"}), 400

    if new_status != "Suspended" and driver.license_expiry_date < date.today():
        return jsonify({"message": "Cannot activate driver: license has expired."}), 400

    driver.status = new_status
    db.session.commit()
    return jsonify({"message": "Driver status updated", "driver": driver.to_dict()}), 200


@drivers_bp.route("/<int:driver_id>", methods=["DELETE"])
@jwt_required()
def delete_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id)

    if driver.trips:
        return jsonify({
            "message": "This driver has linked trip records and cannot be deleted. "
                       "Set status to Off Duty or Suspended instead."
        }), 409

    db.session.delete(driver)
    db.session.commit()
    return jsonify({"message": "Driver deleted successfully"}), 200


@drivers_bp.route("/export", methods=["GET"])
@jwt_required()
def export_drivers():
    """Download all driver profiles as a CSV file."""
    _sync_expired_licenses()
    drivers = Driver.query.order_by(Driver.created_at.desc()).all()
    rows = [d.to_dict() for d in drivers]
    return rows_to_csv_response(rows, filename="drivers_export.csv")


@drivers_bp.route("/<int:driver_id>/send-reminder", methods=["POST"])
@jwt_required()
def send_reminder(driver_id):
    """
    Bonus feature: email reminders for expiring/expired licenses, sent via
    Brevo. The Driver model doesn't store an email address (only a phone
    contact_number, per the spec's field list), so the caller supplies the
    recipient email in the request body - the frontend's "Send Reminder"
    button on the Drivers page prompts a Safety Officer for it inline.
    """
    from app.utils.brevo_mailer import send_license_expiry_reminder

    driver = Driver.query.get_or_404(driver_id)
    data = request.get_json() or {}
    email = data.get("email")

    if not email:
        return jsonify({"message": "A recipient email is required."}), 400

    result = send_license_expiry_reminder(
        driver_email=email,
        driver_name=driver.name,
        expiry_date=driver.license_expiry_date.isoformat(),
    )

    if isinstance(result, dict) and result.get("error"):
        return jsonify({"message": f"Failed to send reminder email: {result['error']}"}), 502

    return jsonify({"message": f"Reminder email sent to {email}"}), 200