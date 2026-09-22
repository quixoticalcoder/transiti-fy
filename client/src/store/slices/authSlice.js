/**
 * src/store/slices/authSlice.js
 * ---------------------------------
 * Holds the authenticated user's info, JWT tokens, and role (RBAC).
 * Tokens are mirrored into localStorage so the session survives a page
 * refresh; this is read back in the slice's initial state below.
 */

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: JSON.parse(localStorage.getItem("transiti_fy_user")) || null,
  accessToken: localStorage.getItem("transiti_fy_access_token") || null,
  refreshToken: localStorage.getItem("transiti_fy_refresh_token") || null,
  role: localStorage.getItem("transiti_fy_role") || null,
  isAuthenticated: !!localStorage.getItem("transiti_fy_access_token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Called after a successful /api/auth/login response
    setCredentials: (state, action) => {
      const { user, access_token, refresh_token } = action.payload;
      state.user = user;
      state.role = user?.role;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;
      state.isAuthenticated = true;

      // Persist to localStorage for "Remember Me" / session survival across refresh
      localStorage.setItem("transiti_fy_user", JSON.stringify(user));
      localStorage.setItem("transiti_fy_access_token", access_token);
      localStorage.setItem("transiti_fy_refresh_token", refresh_token);
      localStorage.setItem("transiti_fy_role", user?.role || "");
    },

    // Called on logout or when a 401 is received from the API interceptor
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.role = null;
      state.isAuthenticated = false;

      localStorage.removeItem("transiti_fy_user");
      localStorage.removeItem("transiti_fy_access_token");
      localStorage.removeItem("transiti_fy_refresh_token");
      localStorage.removeItem("transiti_fy_role");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
