/**
 * src/components/ProtectedRoute.jsx
 * -------------------------------------
 * Route guard that redirects to /login if there is no authenticated
 * session in Redux (authSlice). Wrap any route element that requires
 * a logged-in user with this component.
 *
 * Extend `allowedRoles` usage once per-module RBAC (Settings page
 * permission matrix) is implemented, to block access by role as well.
 */

import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
