/**
 * src/store/slices/permissionsSlice.js
 * ---------------------------------------
 * Holds the live RBAC permission matrix (GET /api/settings/rbac) so the
 * whole app can answer "can the current role view/edit this module?"
 * without every page re-fetching it.
 *
 * Shape returned by the backend:
 *   { fleet_manager: { Fleet: "Full Access", Drivers: "View Only", ... }, ... }
 *
 * Because /api/settings/rbac is read live from the DB on the backend,
 * simply re-fetching this slice (see Settings.jsx after a save) is enough
 * for permission changes to take effect immediately, per the spec.
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../configs/api";

// Fetch the full RBAC matrix from the backend.
export const fetchPermissions = createAsyncThunk(
  "permissions/fetch",
  async () => {
    const { data } = await api.get("/api/settings/rbac");
    return data;
  }
);

const initialState = {
  matrix: {}, // { role: { module: "No Access" | "View Only" | "Full Access" } }
  status: "idle", // idle | loading | succeeded | failed
};

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.matrix = action.payload;
      })
      .addCase(fetchPermissions.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default permissionsSlice.reducer;