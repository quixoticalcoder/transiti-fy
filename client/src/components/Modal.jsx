/**
 * src/components/Modal.jsx
 * ----------------------------
 * Generic centered dialog used by every "+ Add X" / "Edit X" form in the
 * app (Vehicles, Drivers, Trips, Maintenance, Fuel & Expenses). Animates
 * in with GSAP's fadeIn helper so every modal across the app opens the
 * same way without repeating animation code per page.
 */

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { fadeIn } from "../lib/gsap";

const Modal = ({ open, onClose, title, children, widthClass = "max-w-lg" }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (open && panelRef.current) {
      fadeIn(panelRef.current);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => {
        // Close only when the overlay itself (not the panel) is clicked
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`w-full ${widthClass} max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900
                    border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;