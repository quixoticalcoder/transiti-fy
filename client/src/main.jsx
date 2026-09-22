/**
 * src/main.jsx
 * --------------
 * Application entry point. Wraps <App /> with:
 *   - Redux <Provider> (auth + theme state)
 *   - <BrowserRouter> (react-router-dom v6)
 *   - <Toaster /> from react-hot-toast for global toast notifications
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import "./index.css";
import App from "./App.jsx";
import { store } from "./store/store.js";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" reverseOrder={false} />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
