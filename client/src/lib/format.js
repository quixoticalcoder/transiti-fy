/**
 * src/lib/format.js
 * ---------------------
 * Small formatting helpers shared across pages, so currency/date display
 * stays consistent without every page re-implementing Intl calls.
 */

/** Format a number as currency. Defaults to INR (spec's default currency). */
export function formatCurrency(value, currency = "INR") {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if an unsupported currency code ever reaches here
    return `${currency} ${amount.toFixed(0)}`;
  }
}

/** Format an ISO date/datetime string as a short, readable date. */
export function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Format an ISO datetime string as date + time. */
export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Round + suffix a percentage value for display. */
export function formatPercent(value) {
  const n = Number(value) || 0;
  return `${n}%`;
}