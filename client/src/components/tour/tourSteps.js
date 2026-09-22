/**
 * src/components/tour/tourSteps.js
 * ------------------------------------
 * Single source of truth for the guided "Website Tour". Each step points
 * at a `data-tour="..."` attribute already sprinkled on the relevant
 * layout/page elements. Steps can optionally include a `path`, in which
 * case ProductTour will navigate there before spotlighting the target
 * (this is what lets the tour walk across Dashboard, Trips, etc.).
 */

export const TOUR_STEPS = [
  {
    target: '[data-tour="sidebar-nav"]',
    path: "/dashboard",
    title: "Navigate transiti-fy",
    body: "Every module lives here - Fleet, Drivers, Trips, Maintenance, Fuel & Expenses, and Analytics. Only the modules your role has access to are shown.",
    placement: "right",
  },
  {
    target: '[data-tour="global-search"]',
    title: "Global search",
    body: "Look up vehicles, drivers, or trips from anywhere in the app without leaving the page you're on.",
    placement: "bottom",
  },
  {
    target: '[data-tour="theme-toggle"]',
    title: "Light / dark mode",
    body: "Switch between light and dark themes any time. Your preference is remembered on this device.",
    placement: "bottom",
  },
  {
    target: '[data-tour="user-menu"]',
    title: "You're signed in here",
    body: "Your name, current role, and logout button live in the top-right corner at all times.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dashboard-filters"]',
    path: "/dashboard",
    title: "Filter your fleet view",
    body: "Click here to open filters and narrow every KPI and the Recent Trips table by vehicle type, status, or region.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dashboard-kpis"]',
    title: "Live KPIs",
    body: "Active/available vehicles, trips in progress, drivers on duty, and fleet utilization - updated automatically as data changes.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dashboard-recent-trips"]',
    title: "Recent trips",
    body: "A live feed of the latest dispatches with status badges and ETAs, so you always know what's moving.",
    placement: "top",
  },
  {
    target: '[data-tour="dashboard-vehicle-status"]',
    title: "Vehicle status at a glance",
    body: "See how your whole fleet is distributed across Available, On Trip, In Shop, and Retired.",
    placement: "left",
  },

  // ---- Fleet ----
  {
    target: '[data-tour="fleet-table"]',
    path: "/fleet",
    title: "Fleet / Vehicle Registry",
    body: "Every vehicle you own lives here - registration, type, load capacity, odometer, cost, and current status.",
    placement: "top",
  },
  {
    target: '[data-tour="fleet-actions"]',
    title: "Add and export vehicles",
    body: "Register a new vehicle or export the full registry to CSV/Excel from here.",
    placement: "left",
  },

  // ---- Drivers ----
  {
    target: '[data-tour="drivers-table"]',
    path: "/drivers",
    title: "Drivers & Safety Profiles",
    body: "Track license details, expiry warnings, contact info, and safety scores for every driver on your roster.",
    placement: "top",
  },

  // ---- Trips ----
  {
    target: '[data-tour="trips-create-form"]',
    path: "/trips",
    title: "Dispatch a trip",
    body: "Plan a new route, assign a vehicle and driver, and move it through the trip lifecycle from here.",
    placement: "right",
  },
  {
    target: '[data-tour="trips-board"]',
    title: "Live Trip Board",
    body: "See every trip in flight, filter by status, and track progress from Draft through Completed.",
    placement: "left",
  },

  // ---- Maintenance ----
  {
    target: '[data-tour="maintenance-log-form"]',
    path: "/maintenance",
    title: "Log a service record",
    body: "Record maintenance work here - vehicles automatically move to \"In Shop\" and are pulled from the dispatch pool until it's done.",
    placement: "right",
  },
  {
    target: '[data-tour="maintenance-log-table"]',
    title: "Maintenance history",
    body: "A searchable, sortable history of every service record across your fleet.",
    placement: "left",
  },

  // ---- Fuel & Expenses ----
  {
    target: '[data-tour="fuel-actions"]',
    path: "/fuel-expenses",
    title: "Log fuel and other expenses",
    body: "Record fuel fill-ups or any other vehicle-related expense in a couple of clicks.",
    placement: "left",
  },
  {
    target: '[data-tour="fuel-tabs"]',
    title: "Fuel Logs vs. Other Expenses",
    body: "Switch between fuel records and other expense records - both feed straight into your cost analytics.",
    placement: "bottom",
  },

  // ---- Analytics ----
  {
    target: '[data-tour="analytics-kpis"]',
    path: "/analytics",
    title: "Cost & efficiency KPIs",
    body: "Fuel efficiency, fleet utilization, operational cost, and vehicle ROI - calculated automatically from your fleet data.",
    placement: "bottom",
  },
  {
    target: '[data-tour="analytics-chart"]',
    title: "Monthly Revenue trends",
    body: "Visualize revenue over time and toggle between bar and area views to spot trends.",
    placement: "top",
  },

  // ---- Settings ----
  {
    target: '[data-tour="settings-tabs"]',
    path: "/settings",
    title: "Settings & access control",
    body: "Manage general system configuration, user accounts, and role-based permissions (RBAC) - all in one place.",
    placement: "bottom",
  },
];
