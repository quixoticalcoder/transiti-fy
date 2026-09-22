/**
 * src/components/ThemeToggle.jsx
 * ----------------------------------
 * Sun/Moon icon button that dispatches themeSlice's toggleTheme action.
 * The actual <html class="dark"> toggling side-effect lives in App.jsx,
 * which watches `state.theme.mode` - this component only dispatches.
 */

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sun, Moon } from "lucide-react";
import { toggleTheme } from "../store/slices/themeSlice";

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.theme.mode);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      aria-label="Toggle dark mode"
      className="p-2 rounded-full border border-gray-200 dark:border-gray-700
                 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
