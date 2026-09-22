"""
app/models/expense.py
------------------------
Other Expenses (tolls / miscellaneous) tied to a trip and vehicle.
Total Cost = Fuel Cost + Toll Charges + Other Expenses + Maintenance Cost
(the aggregation itself happens at the route/service layer, pulling from
FuelLog and MaintenanceLog as needed).
"""

from datetime import datetime, date
from app.extensions import db


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey("trips.id"), nullable=True)

    toll_charges = db.Column(db.Float, default=0)
    other_expenses = db.Column(db.Float, default=0)
    expense_date = db.Column(db.Date, default=date.today)
    remarks = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "trip_id": self.trip_id,
            "toll_charges": self.toll_charges,
            "other_expenses": self.other_expenses,
            "expense_date": self.expense_date.isoformat(),
            "remarks": self.remarks,
        }

    def __repr__(self):
        return f"<Expense vehicle={self.vehicle_id} trip={self.trip_id}>"
