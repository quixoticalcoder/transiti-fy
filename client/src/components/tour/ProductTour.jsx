/**
 * src/components/tour/ProductTour.jsx
 * ---------------------------------------
 * Renders the guided tour overlay: a dimmed backdrop with a "spotlight"
 * cutout around the current step's target element, plus a tooltip card
 * with Back / Next / Skip controls and a progress indicator.
 *
 * Mounted once near the root (see App.jsx) so it can float above every
 * route. It reads its state from TourContext and reacts to route
 * changes so steps can span multiple pages (e.g. sidebar step lives on
 * whichever page you started the tour from, KPI steps live on
 * /dashboard).
 */

import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { useTour } from "./TourContext";

const MARGIN = 12; // gap between spotlight and tooltip
const PAD = 8; // spotlight padding around the target element

const ProductTour = () => {
  const { active, stepIndex, steps, next, prev, stop } = useTour();
  const location = useLocation();
  const navigate = useNavigate();
  const [rect, setRect] = useState(null);
  const step = steps[stepIndex];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      // Wait a beat for smooth-scroll to settle before measuring.
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
      });
    } else {
      setRect(null);
    }
  }, [step]);

  // Navigate to the step's page first (if needed), then poll briefly for
  // the target element to exist before measuring - pages fetch data
  // asynchronously so the element may not be mounted the instant we land.
  useEffect(() => {
    if (!active || !step) return;

    if (step.path && location.pathname !== step.path) {
      navigate(step.path);
      return; // effect re-runs once location.pathname updates
    }

    let attempts = 0;
    let cancelled = false;
    const tryMeasure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el || attempts > 40) {
        measure();
      } else {
        attempts += 1;
        setTimeout(tryMeasure, 75);
      }
    };
    tryMeasure();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, location.pathname]);

  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop]);

  if (!active || !step) return null;

  const spotlightStyle = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Decide tooltip placement, clamped so it never runs off-screen.
  const tooltipWidth = 320;
  let tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const placement = step.placement || "bottom";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top;
    let left;
    if (placement === "bottom") {
      top = rect.bottom + MARGIN;
      left = rect.left;
    } else if (placement === "top") {
      top = rect.top - MARGIN;
      left = rect.left;
    } else if (placement === "right") {
      top = rect.top;
      left = rect.right + MARGIN;
    } else if (placement === "left") {
      top = rect.top;
      left = rect.left - tooltipWidth - MARGIN;
    }
    left = Math.min(Math.max(left, MARGIN), vw - tooltipWidth - MARGIN);
    top = Math.min(Math.max(top, MARGIN), vh - 220);
    const transform = placement === "top" ? "translateY(-100%)" : "none";
    tooltipStyle = { top, left, width: tooltipWidth, transform };
  }

  return (
    <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="Website tour">
      {/* Dimmed backdrop with a spotlight cutout via box-shadow */}
      <div
        className="fixed rounded-lg pointer-events-none transition-all duration-200 ease-out"
        style={
          spotlightStyle
            ? {
                ...spotlightStyle,
                boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
                border: "2px solid #3b82f6",
              }
            : { inset: 0, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)" }
        }
      />

      {/* Tooltip card */}
      <div
        className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800
                   rounded-xl shadow-xl p-4 space-y-3 transition-all duration-200 ease-out"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm">{step.title}</h3>
          <button
            onClick={stop}
            aria-label="Close tour"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{step.body}</p>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-blue-600" : "w-1.5 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700
                           hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Previous step"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white font-medium
                         hover:bg-blue-700 flex items-center gap-1"
            >
              {stepIndex + 1 === steps.length ? "Finish" : "Next"}
              {stepIndex + 1 !== steps.length && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTour;
