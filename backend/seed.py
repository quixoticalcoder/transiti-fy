"""
seed.py
---------
Populates the database with rich, varied demo data covering every page,
filter, and status the frontend renders: multiple vehicle types/regions/
statuses, drivers across every license category and status (including
expired/soon-to-expire licenses), trips in every lifecycle stage spread
across the last 6 months (so the Analytics revenue chart has real shape),
maintenance history, fuel logs, expenses, varied user accounts (active/
inactive/locked), general settings, and the RBAC permission matrix.

Usage:
    python seed.py            # inserts seed data (skips if already present)
    python seed.py --reset    # drops all tables, recreates them, then seeds
"""

import sys
import random
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.maintenance import MaintenanceLog
from app.models.fuel import FuelLog
from app.models.expense import Expense
from app.models.settings import Settings
from app.models.role_permission import RolePermission
from app.routes.settings import _default_matrix

random.seed(42)  # deterministic "randomness" so re-seeding is reproducible

TODAY = date.today()
NOW = datetime.utcnow()


def d_ago(days: int) -> date:
    return TODAY - timedelta(days=days)


def dt_ago(days: int, hour: int = 10) -> datetime:
    base = NOW - timedelta(days=days)
    return base.replace(hour=hour, minute=random.choice([5, 15, 30, 45]), second=0, microsecond=0)


# ----------------------------------------------------------------------
# Users - every account state the Settings > User Management table shows
# ----------------------------------------------------------------------

def seed_users():
    users = [
        {"name": "Fleet Manager", "email": "fleet.manager@transiti-fy.example",
         "role": "fleet_manager", "is_active": True, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Dispatch Operator", "email": "dispatcher@transiti-fy.example",
         "role": "dispatcher", "is_active": True, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Safety Officer", "email": "safety.officer@transiti-fy.example",
         "role": "safety_officer", "is_active": True, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Financial Analyst", "email": "finance.analyst@transiti-fy.example",
         "role": "financial_analyst", "is_active": True, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Rohan Dispatcher", "email": "rohan.dispatch@transiti-fy.example",
         "role": "dispatcher", "is_active": True, "is_locked": False, "failed_login_attempts": 2},
        {"name": "Kavita Rao", "email": "kavita.safety@transiti-fy.example",
         "role": "safety_officer", "is_active": True, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Former Analyst", "email": "former.analyst@transiti-fy.example",
         "role": "financial_analyst", "is_active": False, "is_locked": False, "failed_login_attempts": 0},
        {"name": "Locked Out User", "email": "locked.user@transiti-fy.example",
         "role": "dispatcher", "is_active": True, "is_locked": True, "failed_login_attempts": 5},
    ]
    count = 0
    for u in users:
        if not User.query.filter_by(email=u["email"]).first():
            user = User(
                name=u["name"], email=u["email"], role=u["role"],
                is_active=u["is_active"], is_locked=u["is_locked"],
                failed_login_attempts=u["failed_login_attempts"],
            )
            user.set_password("Password@123")  # demo password for all seed accounts
            db.session.add(user)
            count += 1
    db.session.commit()
    print(f"Seeded {count} users (default password: Password@123)")


# ----------------------------------------------------------------------
# Vehicles - every type x every status, spread across 5 regions
# ----------------------------------------------------------------------

def seed_vehicles():
    vehicles = [
        {"registration_number": "GJ-01-AB-1001", "name_model": "Van-05", "vehicle_type": "Van",
         "max_load_capacity_kg": 500, "odometer_km": 12000, "acquisition_cost": 800000,
         "status": "Available", "region": "Ahmedabad"},
        {"registration_number": "GJ-01-AB-1002", "name_model": "Truck-11", "vehicle_type": "Truck",
         "max_load_capacity_kg": 3000, "odometer_km": 45000, "acquisition_cost": 2200000,
         "status": "Available", "region": "Ahmedabad"},
        {"registration_number": "GJ-01-AB-1003", "name_model": "Bike-02", "vehicle_type": "Bike",
         "max_load_capacity_kg": 50, "odometer_km": 8000, "acquisition_cost": 90000,
         "status": "In Shop", "region": "Surat"},
        {"registration_number": "GJ-01-AB-1004", "name_model": "Truck-07", "vehicle_type": "Truck",
         "max_load_capacity_kg": 5000, "odometer_km": 98000, "acquisition_cost": 3000000,
         "status": "Retired", "region": "Vadodara"},
        {"registration_number": "GJ-05-CD-2011", "name_model": "Van-12", "vehicle_type": "Van",
         "max_load_capacity_kg": 800, "odometer_km": 21000, "acquisition_cost": 950000,
         "status": "On Trip", "region": "Surat"},
        {"registration_number": "GJ-05-CD-2012", "name_model": "Truck-19", "vehicle_type": "Truck",
         "max_load_capacity_kg": 4000, "odometer_km": 67000, "acquisition_cost": 2600000,
         "status": "On Trip", "region": "Rajkot"},
        {"registration_number": "GJ-05-CD-2013", "name_model": "Bike-08", "vehicle_type": "Bike",
         "max_load_capacity_kg": 60, "odometer_km": 15000, "acquisition_cost": 110000,
         "status": "Available", "region": "Ahmedabad"},
        {"registration_number": "GJ-06-EF-3001", "name_model": "Van-21", "vehicle_type": "Van",
         "max_load_capacity_kg": 600, "odometer_km": 33000, "acquisition_cost": 880000,
         "status": "In Shop", "region": "Vadodara"},
        {"registration_number": "GJ-06-EF-3002", "name_model": "Truck-25", "vehicle_type": "Truck",
         "max_load_capacity_kg": 3500, "odometer_km": 52000, "acquisition_cost": 2450000,
         "status": "Available", "region": "Surat"},
        {"registration_number": "GJ-06-EF-3003", "name_model": "Bike-14", "vehicle_type": "Bike",
         "max_load_capacity_kg": 55, "odometer_km": 9000, "acquisition_cost": 95000,
         "status": "On Trip", "region": "Rajkot"},
        {"registration_number": "GJ-06-EF-3004", "name_model": "Van-30", "vehicle_type": "Van",
         "max_load_capacity_kg": 700, "odometer_km": 5000, "acquisition_cost": 920000,
         "status": "Available", "region": "Rajkot"},
        {"registration_number": "GJ-07-GH-4001", "name_model": "Truck-33", "vehicle_type": "Truck",
         "max_load_capacity_kg": 6000, "odometer_km": 112000, "acquisition_cost": 3200000,
         "status": "Retired", "region": "Bhavnagar"},
        {"registration_number": "GJ-07-GH-4002", "name_model": "Bike-19", "vehicle_type": "Bike",
         "max_load_capacity_kg": 45, "odometer_km": 3000, "acquisition_cost": 85000,
         "status": "Available", "region": "Bhavnagar"},
    ]
    created = 0
    for v in vehicles:
        if not Vehicle.query.filter_by(registration_number=v["registration_number"]).first():
            db.session.add(Vehicle(**v))
            created += 1
    db.session.commit()
    print(f"Seeded {created} vehicles")
    return Vehicle.query.order_by(Vehicle.id).all()


# ----------------------------------------------------------------------
# Drivers - every license category x every status, incl. expiring/expired
# ----------------------------------------------------------------------

def seed_drivers():
    drivers = [
        {"name": "Alex Fernandes", "license_number": "DL-001", "license_category": "LMV",
         "license_expiry_date": d_ago(-365), "contact_number": "9990001111",
         "safety_score": 92, "status": "Available"},
        {"name": "Priya Sharma", "license_number": "DL-002", "license_category": "HMV",
         "license_expiry_date": d_ago(-200), "contact_number": "9990002222",
         "safety_score": 88, "status": "Available"},
        {"name": "Ravi Kumar", "license_number": "DL-003", "license_category": "HMV",
         "license_expiry_date": d_ago(10), "contact_number": "9990003333",
         "safety_score": 75, "status": "Suspended"},  # expired license
        {"name": "Meera Joshi", "license_number": "DL-004", "license_category": "LMV",
         "license_expiry_date": d_ago(-45), "contact_number": "9990004444",
         "safety_score": 95, "status": "On Trip"},
        {"name": "Sanjay Patel", "license_number": "DL-005", "license_category": "HMV",
         "license_expiry_date": d_ago(-120), "contact_number": "9990005555",
         "safety_score": 81, "status": "On Trip"},
        {"name": "Karan Mehta", "license_number": "DL-006", "license_category": "MCWG",
         "license_expiry_date": d_ago(-300), "contact_number": "9990006666",
         "safety_score": 90, "status": "Available"},
        {"name": "Neha Desai", "license_number": "DL-007", "license_category": "LMV",
         "license_expiry_date": d_ago(-5), "contact_number": "9990007777",
         "safety_score": 68, "status": "Off Duty"},  # expiring soon
        {"name": "Vikram Rathod", "license_number": "DL-008", "license_category": "HMV",
         "license_expiry_date": d_ago(40), "contact_number": "9990008888",
         "safety_score": 55, "status": "Suspended"},  # expired license, low safety score
        {"name": "Anjali Nair", "license_number": "DL-009", "license_category": "MCWG",
         "license_expiry_date": d_ago(-250), "contact_number": "9990009999",
         "safety_score": 97, "status": "On Trip"},
        {"name": "Deepak Solanki", "license_number": "DL-010", "license_category": "LMV",
         "license_expiry_date": d_ago(-180), "contact_number": "9990010000",
         "safety_score": 73, "status": "Off Duty"},
    ]
    created = 0
    for d in drivers:
        if not Driver.query.filter_by(license_number=d["license_number"]).first():
            db.session.add(Driver(**d))
            created += 1
    db.session.commit()
    print(f"Seeded {created} drivers")
    return Driver.query.order_by(Driver.id).all()


# ----------------------------------------------------------------------
# Trips - Draft / Dispatched / Completed / Cancelled, spread over 6 months
# so Analytics' Monthly Revenue chart has real month-over-month shape.
# ----------------------------------------------------------------------

ROUTES = [
    ("Ahmedabad Depot", "Surat Warehouse"),
    ("Surat Warehouse", "Vadodara Hub"),
    ("Vadodara Hub", "Rajkot Depot"),
    ("Rajkot Depot", "Bhavnagar Port"),
    ("Ahmedabad Depot", "Rajkot Depot"),
    ("Bhavnagar Port", "Ahmedabad Depot"),
    ("Surat Warehouse", "Bhavnagar Port"),
    ("Vadodara Hub", "Ahmedabad Depot"),
    ("Ahmedabad Depot", "Vadodara Hub"),
    ("Rajkot Depot", "Surat Warehouse"),
]

# approximate km/l by vehicle type, used to derive believable fuel_consumed_liters
EFFICIENCY_KM_PER_L = {"Bike": 35, "Van": 12, "Truck": 6}
# approximate revenue per km by vehicle type
REVENUE_PER_KM = {"Bike": 18, "Van": 35, "Truck": 60}


def seed_trips_fuel_maintenance_expenses(vehicles, drivers):
    if Trip.query.first():
        print("Trips already seeded, skipping trips/fuel/expenses")
        return

    non_retired_vehicles = [v for v in vehicles if v.status != "Retired"]
    all_drivers = drivers

    trips_created = []

    # --- Completed trips: 3 per month for the last 6 months (18 total) ---
    for month_offset in range(6, 0, -1):
        for i in range(3):
            vehicle = non_retired_vehicles[(month_offset * 3 + i) % len(non_retired_vehicles)]
            driver = all_drivers[(month_offset * 3 + i) % len(all_drivers)]
            source, destination = ROUTES[(month_offset * 3 + i) % len(ROUTES)]

            planned_distance = round(random.uniform(80, 420), 1)
            actual_distance = round(planned_distance + random.uniform(-8, 15), 1)
            efficiency = EFFICIENCY_KM_PER_L.get(vehicle.vehicle_type, 10)
            fuel_used = round(actual_distance / efficiency, 1)
            rate = REVENUE_PER_KM.get(vehicle.vehicle_type, 30)
            revenue = round(actual_distance * rate * random.uniform(0.9, 1.3), 2)
            cargo_weight = round(min(vehicle.max_load_capacity_kg * random.uniform(0.4, 0.95), vehicle.max_load_capacity_kg), 1)

            trip_day_offset = month_offset * 30 - random.randint(0, 25)
            created_at = dt_ago(trip_day_offset)
            updated_at = created_at + timedelta(hours=random.randint(4, 30))

            trip = Trip(
                source=source, destination=destination,
                vehicle_id=vehicle.id, driver_id=driver.id,
                cargo_weight_kg=cargo_weight,
                planned_distance_km=planned_distance,
                actual_distance_km=actual_distance,
                fuel_consumed_liters=fuel_used,
                status="Completed",
                eta=updated_at,
                revenue=revenue,
            )
            trip.created_at = created_at
            trip.updated_at = updated_at
            db.session.add(trip)
            db.session.flush()  # get trip.id without full commit
            trips_created.append((trip, vehicle, fuel_used, created_at))

    # --- Currently Dispatched trips: matches the vehicles/drivers that
    #     are seeded as "On Trip" so the Live Trip Board / Dashboard line up ---
    on_trip_vehicles = [v for v in vehicles if v.status == "On Trip"]
    on_trip_drivers = [d for d in all_drivers if d.status == "On Trip"]
    for i, vehicle in enumerate(on_trip_vehicles):
        driver = on_trip_drivers[i % len(on_trip_drivers)] if on_trip_drivers else None
        source, destination = ROUTES[i % len(ROUTES)]
        planned_distance = round(random.uniform(100, 350), 1)
        cargo_weight = round(min(vehicle.max_load_capacity_kg * random.uniform(0.5, 0.9), vehicle.max_load_capacity_kg), 1)
        created_at = dt_ago(random.randint(0, 2))
        trip = Trip(
            source=source, destination=destination,
            vehicle_id=vehicle.id, driver_id=driver.id if driver else None,
            cargo_weight_kg=cargo_weight,
            planned_distance_km=planned_distance,
            actual_distance_km=None,
            fuel_consumed_liters=None,
            status="Dispatched",
            eta=NOW + timedelta(hours=random.randint(3, 48)),
            revenue=0,
        )
        trip.created_at = created_at
        trip.updated_at = created_at
        db.session.add(trip)

    # --- Draft trips awaiting vehicle/driver assignment (recent, unassigned) ---
    for i in range(3):
        source, destination = ROUTES[(i + 4) % len(ROUTES)]
        created_at = dt_ago(random.randint(0, 3))
        trip = Trip(
            source=source, destination=destination,
            vehicle_id=None, driver_id=None,
            cargo_weight_kg=round(random.uniform(100, 2000), 1),
            planned_distance_km=round(random.uniform(60, 300), 1),
            actual_distance_km=None,
            fuel_consumed_liters=None,
            status="Draft",
            eta=None,
            revenue=0,
        )
        trip.created_at = created_at
        trip.updated_at = created_at
        db.session.add(trip)

    # --- Cancelled trips (a couple, for status-badge coverage) ---
    for i in range(2):
        vehicle = non_retired_vehicles[i]
        driver = all_drivers[i]
        source, destination = ROUTES[(i + 6) % len(ROUTES)]
        created_at = dt_ago(random.randint(5, 45))
        trip = Trip(
            source=source, destination=destination,
            vehicle_id=vehicle.id, driver_id=driver.id,
            cargo_weight_kg=round(random.uniform(100, 1500), 1),
            planned_distance_km=round(random.uniform(80, 250), 1),
            actual_distance_km=None,
            fuel_consumed_liters=None,
            status="Cancelled",
            eta=None,
            revenue=0,
        )
        trip.created_at = created_at
        trip.updated_at = created_at + timedelta(hours=2)
        db.session.add(trip)

    db.session.commit()
    print(f"Seeded {len(trips_created)} completed trips + dispatched/draft/cancelled trips "
          f"({Trip.query.count()} total)")

    # --- Fuel logs + expenses tied to each completed trip ---
    fuel_count, expense_count = 0, 0
    for trip, vehicle, fuel_used, created_at in trips_created:
        fuel_price_per_l = round(random.uniform(92, 105), 2)
        fuel_log = FuelLog(
            vehicle_id=vehicle.id,
            trip_id=trip.id,
            liters=fuel_used,
            cost=round(fuel_used * fuel_price_per_l, 2),
            log_date=created_at.date(),
        )
        db.session.add(fuel_log)
        fuel_count += 1

        # Not every trip has a toll/misc expense - keeps the table realistic
        if random.random() < 0.75:
            db.session.add(Expense(
                vehicle_id=vehicle.id,
                trip_id=trip.id,
                toll_charges=round(random.uniform(0, 600), 2),
                other_expenses=round(random.uniform(0, 400), 2),
                expense_date=created_at.date(),
                remarks=random.choice([
                    "Toll + parking", "Toll charges", "Loading/unloading labour",
                    "Parking fee", "Toll + misc.", None,
                ]),
            ))
            expense_count += 1

    # A few extra standalone fuel logs / expenses not tied to any trip
    # (routine top-ups, depot-level misc costs) for realism.
    for vehicle in non_retired_vehicles[:6]:
        db.session.add(FuelLog(
            vehicle_id=vehicle.id,
            trip_id=None,
            liters=round(random.uniform(15, 60), 1),
            cost=round(random.uniform(1500, 6000), 2),
            log_date=d_ago(random.randint(1, 20)),
        ))
        fuel_count += 1

    for vehicle in non_retired_vehicles[:4]:
        db.session.add(Expense(
            vehicle_id=vehicle.id,
            trip_id=None,
            toll_charges=round(random.uniform(0, 300), 2),
            other_expenses=round(random.uniform(50, 500), 2),
            expense_date=d_ago(random.randint(1, 30)),
            remarks=random.choice(["Depot maintenance fee", "Cleaning & wash", "Permit renewal"]),
        ))
        expense_count += 1

    db.session.commit()
    print(f"Seeded {fuel_count} fuel logs and {expense_count} expense records")


# ----------------------------------------------------------------------
# Maintenance - service history spread over months, plus open records for
# every vehicle currently "In Shop"
# ----------------------------------------------------------------------

SERVICE_TYPES = [
    "Oil Change", "Engine Repair", "Tyre Replacement", "General Service",
    "Brake Inspection", "Battery Replacement", "AC Service", "Clutch Repair",
]


def seed_maintenance(vehicles):
    if MaintenanceLog.query.first():
        print("Maintenance already seeded, skipping")
        return

    count = 0
    for vehicle in vehicles:
        if vehicle.status == "Retired":
            # retired vehicles still have historical service records
            num_records = 2
        else:
            num_records = random.randint(1, 3)

        for i in range(num_records):
            days_back = random.randint(15, 200)
            cost = round(random.uniform(1200, 45000), 2)
            db.session.add(MaintenanceLog(
                vehicle_id=vehicle.id,
                service_type=random.choice(SERVICE_TYPES),
                cost=cost,
                service_date=d_ago(days_back),
                status="Completed",
            ))
            count += 1

        if vehicle.status == "In Shop":
            # the open record that put this vehicle into "In Shop"
            db.session.add(MaintenanceLog(
                vehicle_id=vehicle.id,
                service_type=random.choice(["Engine Repair", "General Service", "Tyre Replacement"]),
                cost=round(random.uniform(2000, 15000), 2),
                service_date=d_ago(random.randint(0, 4)),
                status="In Shop",
            ))
            count += 1

    db.session.commit()
    print(f"Seeded {count} maintenance logs")


def seed_settings():
    Settings.get_or_create()
    print("Seeded default general settings")


def seed_rbac_matrix():
    if RolePermission.query.first():
        print("RBAC matrix already seeded, skipping")
        return

    matrix = _default_matrix()
    for role, modules in matrix.items():
        for module, access_level in modules.items():
            db.session.add(RolePermission(role=role, module=module, access_level=access_level))
    db.session.commit()
    print("Seeded default RBAC permission matrix")


def run_seed():
    seed_users()
    vehicles = seed_vehicles()
    drivers = seed_drivers()
    seed_trips_fuel_maintenance_expenses(vehicles, drivers)
    seed_maintenance(vehicles)
    seed_settings()
    seed_rbac_matrix()
    print("\n✅ Database seeding complete.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        if "--reset" in sys.argv:
            print("Dropping and recreating all tables...")
            db.drop_all()
            db.create_all()
        else:
            db.create_all()

        run_seed()