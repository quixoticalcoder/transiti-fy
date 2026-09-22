/**
 * src/store/slices/themeSlice.js
 * ----------------------------------
 * Controls light/dark theme state and persists the user's preference to
 * localStorage. The actual `dark` class toggling on <html> happens in a
 * useEffect inside App.jsx that watches this slice's value - this file
 * only owns the state, not the DOM side-effect.
 */

import { createSlice } from "@reduxjs/toolkit";

const getInitialTheme = () => {
  const saved = localStorage.getItem("transiti_fy_theme");
  if (saved) return saved;

  // Fall back to the user's OS-level preference on first visit
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
};

const initialState = {
  mode: getInitialTheme(), // "light" | "dark"
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === "light" ? "dark" : "light";
      localStorage.setItem("transiti_fy_theme", state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem("transiti_fy_theme", action.payload);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
