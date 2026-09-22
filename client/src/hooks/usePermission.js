/**
 * src/hooks/usePermission.js
 * ------------------------------
 * Reads the RBAC matrix (permissionsSlice) for the logged-in user's role
 * and exposes simple booleans a page can branch on:
 *
 *   const { canView, canEdit, level } = usePermission("Fleet");
 *   if (!canView) return <NoAccess />;
 *   {canEdit && <button>+ Add Vehicle</button>}
 *
 * "fleet_manager" is always treated as full access everywhere, mirroring
 * the backend's ADMIN_ROLE constant in routes/settings.py.
 */

import { useSelector } from "react-redux";

const ADMIN_ROLE = "fleet_manager";

export default function usePermission(moduleName) {
  const role = useSelector((state) => state.auth.role);
  const matrix = useSelector((state) => state.permissions.matrix);

  if (role === ADMIN_ROLE) {
    return { canView: true, canEdit: true, level: "Full Access" };
  }

  const level = matrix?.[role]?.[moduleName] || "No Access";

  return {
    canView: level === "View Only" || level === "Full Access",
    canEdit: level === "Full Access",
    level,
  };
}