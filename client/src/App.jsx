/**
 * src/App.jsx
 * -------------
 * Top-level route definitions. Also owns two app-wide side-effects:
 *   1. Toggling the `dark` class on <html> whenever state.theme.mode
 *      changes (Tailwind's dark: variants key off this class).
 *   2. Fetching the live RBAC permission matrix once the user is
 *      authenticated, so usePermission() has data to read from the
 *      moment any protected page mounts.
 */

import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Fleet from "./pages/Fleet";
import Drivers from "./pages/Drivers";
import Trips from "./pages/Trips";
import Maintenance from "./pages/Maintenance";
import FuelExpenses from "./pages/FuelExpenses";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import MainLayout from "./layout/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { fetchPermissions } from "./store/slices/permissionsSlice";
import { TourProvider } from "./components/tour/TourContext";
import ProductTour from "./components/tour/ProductTour";

function App() {
  const dispatch = useDispatch();
  const themeMode = useSelector((state) => state.theme.mode);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  // Sync Redux theme state -> <html class="dark"> for Tailwind's dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [themeMode]);

  // Load the RBAC matrix as soon as we have a session, and again any
  // time the session changes (e.g. re-login as a different role).
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchPermissions());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <TourProvider>
      <ProductTour />
      <Routes>
      <Route path="/login" element={<Login />} />

      {/* Authenticated routes share MainLayout (sidebar/header/breadcrumb) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/fuel-expenses" element={<FuelExpenses />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </TourProvider>
  );
}

export default App;