/**
 * src/components/StatusBadge.jsx
 * ----------------------------------
 * Small colored pill used everywhere a status enum is rendered:
 * vehicle status, driver status, trip lifecycle stage, maintenance
 * status, safety status, RBAC access level, etc.
 *
 * Pass any string; unrecognized values fall back to a neutral gray pill
 * so new/unexpected status values never crash the UI.
 */

import React from "react";

// Central color map - covers every status value used across the spec.
const COLOR_MAP = {
  // Vehicle / general availability
  Available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  "On Trip": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "In Shop": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Retired: "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",

  // Driver
  "Off Duty": "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",

  // Trip lifecycle
  Draft: "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
  Dispatched: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",

  // Safety
  Safe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "At Risk": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",

  // RBAC access levels
  "No Access": "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400",
  "View Only": "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  "Full Access": "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

const FALLBACK = "bg-gray-200 text-gray-600 dark:bg-gray-700/40 dark:text-gray-400";

const StatusBadge = ({ status, className = "" }) => {
  const color = COLOR_MAP[status] || FALLBACK;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${color} ${className}`}
    >
      {status ?? "Unknown"}
    </span>
  );
};

export default StatusBadge;