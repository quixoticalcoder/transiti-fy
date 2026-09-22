/**
 * src/components/tour/TourContext.jsx
 * ---------------------------------------
 * Lightweight context that owns the guided tour's on/off state and
 * current step index. Kept separate from Redux since this is pure UI
 * state that never needs to be persisted server-side - only a "has this
 * browser seen the tour" flag is kept in localStorage so we can
 * auto-offer it once per device on first login.
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { TOUR_STEPS } from "./tourSteps";

const SEEN_KEY = "transiti_fy_tour_seen";

const TourContext = createContext(null);

export const TourProvider = ({ children }) => {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const start = () => {
    setStepIndex(0);
    setActive(true);
  };

  const stop = () => {
    setActive(false);
    localStorage.setItem(SEEN_KEY, "1");
  };

  const next = () => {
    setStepIndex((i) => {
      if (i + 1 >= TOUR_STEPS.length) {
        setActive(false);
        localStorage.setItem(SEEN_KEY, "1");
        return i;
      }
      return i + 1;
    });
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const hasSeenTour = () => localStorage.getItem(SEEN_KEY) === "1";

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      steps: TOUR_STEPS,
      start,
      stop,
      next,
      prev,
      hasSeenTour,
    }),
    [active, stepIndex]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within a TourProvider");
  return ctx;
};
