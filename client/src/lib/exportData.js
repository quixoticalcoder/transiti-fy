/**
 * src/lib/exportData.js
 * ------------------------
 * Shared helpers for the "Export data (CSV, Excel, PDF)" bonus feature.
 * Kept framework-agnostic (plain arrays/objects in, file download out) so
 * any page (Vehicles, Drivers, Trips, Analytics) can reuse the same
 * three functions.
 *
 * Dependencies to add when implementing the full export feature:
 *   npm install xlsx jspdf jspdf-autotable
 */

/** Export an array of flat objects to a CSV file and trigger a download. */
export function exportToCSV(rows, filename = "export.csv") {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((field) => JSON.stringify(row[field] ?? "")).join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

/**
 * Export rows to an Excel (.xlsx) file.
 * NOTE: requires the `xlsx` package - import lazily so this file has no
 * hard dependency until the feature is wired up.
 */
export async function exportToExcel(rows, filename = "export.xlsx") {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filename);
}

/**
 * Export rows to a simple tabular PDF.
 * NOTE: requires `jspdf` + `jspdf-autotable` - imported lazily.
 */
export async function exportToPDF(rows, filename = "export.pdf", title = "transiti-fy Export") {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.text(title, 14, 15);

  if (rows && rows.length > 0) {
    const headers = [Object.keys(rows[0])];
    const body = rows.map((row) => Object.values(row));
    autoTable(doc, { head: headers, body, startY: 20 });
  }

  doc.save(filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
