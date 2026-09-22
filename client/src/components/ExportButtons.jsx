/**
 * src/components/ExportButtons.jsx
 * -------------------------------------
 * "Export data (CSV, Excel, PDF)" bonus feature, as a small dropdown
 * button reused across Fleet, Drivers, Trips, Maintenance, Fuel &
 * Expenses, and Analytics. Wraps the framework-agnostic helpers in
 * src/lib/exportData.js.
 */

import React, { useState } from "react";
import { Download } from "lucide-react";
import toast from "react-hot-toast";
import { exportToCSV, exportToExcel, exportToPDF } from "../lib/exportData";

const ExportButtons = ({ rows, filename = "export", title = "transiti-fy Export" }) => {
  const [open, setOpen] = useState(false);

  const handleExport = async (type) => {
    setOpen(false);
    if (!rows || rows.length === 0) {
      toast.error("Nothing to export yet.");
      return;
    }
    try {
      if (type === "csv") exportToCSV(rows, `${filename}.csv`);
      if (type === "excel") await exportToExcel(rows, `${filename}.xlsx`);
      if (type === "pdf") await exportToPDF(rows, `${filename}.pdf`, title);
      toast.success(`Exported as ${type.toUpperCase()}`);
    } catch (err) {
      toast.error("Export failed. Is the export package installed?");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-300
                   dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Download size={16} />
        Export
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200
                     dark:border-gray-800 rounded-lg shadow-lg z-20 overflow-hidden"
        >
          {["csv", "excel", "pdf"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleExport(type)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportButtons;