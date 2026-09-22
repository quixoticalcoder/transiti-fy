/**
 * src/configs/api.js
 * --------------------
 * Central axios instance used for every API call in the app.
 *
 * - Request interceptor: attaches the JWT access token (from Redux/localStorage)
 *   to every outgoing request's Authorization header.
 * - Response interceptor: catches 401s (expired/invalid token) so we can
 *   redirect to login / clear stale auth state in one place instead of
 *   repeating this logic in every component.
 */

import axios from "axios";
import { store } from "../store/store";
import { logout } from "../store/slices/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL, // e.g. http://localhost:5000
});

// --- Request interceptor: attach Bearer token ---
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response interceptor: handle expired/invalid sessions globally ---
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Token invalid or expired - clear auth state.
      // The relevant page/route guard is responsible for redirecting to /login.
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
