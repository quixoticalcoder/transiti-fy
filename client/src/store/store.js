/**
 * src/store/store.js
 * ---------------------
 * Root Redux store, combining all feature slices via Redux Toolkit's
 * configureStore. Add new slices here as new modules (vehicles, drivers,
 * trips, etc.) get their own state.
 */

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import permissionsReducer from "./slices/permissionsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    permissions: permissionsReducer,
  },
});

export default store;