/**
 * src/lib/gsap.js
 * -----------------
 * Central GSAP import/setup so every component imports animation
 * utilities from one place instead of importing "gsap" directly
 * everywhere. Register any GSAP plugins here (e.g. ScrollTrigger) once,
 * rather than repeating registration across files.
 */

import { gsap } from "gsap";

// Example reusable animation helpers -------------------------------------

/** Simple fade + slide-up entrance animation for page/section mounts. */
export const fadeInUp = (target, options = {}) => {
  return gsap.fromTo(
    target,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", ...options }
  );
};

/** Fade-in for modals / toasts / dropdowns. */
export const fadeIn = (target, options = {}) => {
  return gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.3, ...options });
};

/** Staggered entrance for list/grid items (e.g. dashboard KPI cards). */
export const staggerIn = (targets, options = {}) => {
  return gsap.fromTo(
    targets,
    { opacity: 0, y: 15 },
    { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "power2.out", ...options }
  );
};

export { gsap };
