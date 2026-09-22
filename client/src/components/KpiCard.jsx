/**
 * src/components/KpiCard.jsx
 * ------------------------------
 * Single summary/KPI card - used for the Dashboard's 7 top cards and
 * the Analytics page's 4 KPI cards. Accepts an optional lucide-react
 * icon and a "hint" (e.g. the ROI formula) shown below the value.
 */

import React from "react";

const KpiCard = ({ label, value, icon: Icon, hint, accent = "text-blue-600 dark:text-blue-400" }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
                 rounded-xl p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {Icon && <Icon size={16} className={accent} />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
  );
};

export default React.forwardRef(KpiCard);