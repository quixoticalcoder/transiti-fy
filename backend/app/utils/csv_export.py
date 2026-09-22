"""
app/utils/csv_export.py
--------------------------
Generic CSV export helper. Any route that wants a "download as CSV"
endpoint can call `rows_to_csv_response(rows, filename)` with a list of
dicts and get back a ready-to-return Flask Response with the correct
headers for a file download.
"""

import csv
import io
from flask import Response


def rows_to_csv_response(rows: list, filename: str = "export.csv") -> Response:
    """
    Convert a list of dicts into a downloadable CSV Flask Response.

    Args:
        rows: list of dicts (e.g. [vehicle.to_dict(), ...]) - all dicts
              should share the same keys, taken from the first row.
        filename: suggested filename for the browser download.
    """
    buffer = io.StringIO()

    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        buffer.write("No data available\n")

    response = Response(buffer.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
