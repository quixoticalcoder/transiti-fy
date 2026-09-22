/**
 * src/layout/MainLayout.jsx
 * ----------------------------
 * Shared shell for every authenticated page: left navigation sidebar,
 * top header (search + user info + theme toggle), and a breadcrumb bar,
 * with the active page rendered via react-router's <Outlet />.
 *
 * Page-specific content (Dashboard, Fleet, Drivers, etc.) is NOT built
 * here - each page component supplies its own body and is rendered
 * inside the <main> below.
 */

import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route as RouteIcon,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  Search,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  User as UserIcon,
  ChevronDown,
  Building2,
  Zap,
} from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import ThemeToggle from "../components/ThemeToggle";
import { logout } from "../store/slices/authSlice";
import { useTour } from "../components/tour/TourContext";

// Nav items tagged with their RBAC module name (null = always visible,
// e.g. Dashboard and Settings sit outside the Fleet/Drivers/Trips/
// Fuel & Expenses/Analytics permission matrix).
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, module: null, color: "blue" },
  { label: "Fleet", path: "/fleet", icon: Truck, module: "Fleet", color: "green" },
  { label: "Drivers", path: "/drivers", icon: Users, module: "Drivers", color: "purple" },
  { label: "Trips", path: "/trips", icon: RouteIcon, module: "Trips", color: "orange" },
  { label: "Maintenance", path: "/maintenance", icon: Wrench, module: "Fleet", color: "red" },
  { label: "Fuel & Expenses", path: "/fuel-expenses", icon: Fuel, module: "Fuel & Expenses", color: "yellow" },
  { label: "Analytics", path: "/analytics", icon: BarChart3, module: "Analytics", color: "indigo" },
  { label: "Settings", path: "/settings", icon: Settings, module: null, color: "gray" },
];

const ADMIN_ROLE = "fleet_manager";

const MainLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useSelector((state) => state.auth);
  const matrix = useSelector((state) => state.permissions.matrix);
  const { start, hasSeenTour } = useTour();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Auto-offer the guided tour once per browser, shortly after first
  // landing so layout/data has time to render before we spotlight it.
  useEffect(() => {
    if (!hasSeenTour()) {
      const timer = setTimeout(() => start(), 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A nav item is visible if it has no module (always shown) or if the
  // current role has at least "View Only" on that module. fleet_manager
  // is treated as full access everywhere, mirroring the backend.
  const visibleNavItems = NAV_ITEMS.filter(({ module }) => {
    if (!module) return true;
    if (role === ADMIN_ROLE) return true;
    const level = matrix?.[role]?.[module];
    return level === "View Only" || level === "Full Access";
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "w-20" : "w-64"}`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-800
          ${sidebarCollapsed ? "px-4 justify-center" : "px-6 justify-between"}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">transiti-fy</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fleet Management</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav data-tour="sidebar-nav" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map(({ label, path, icon: Icon, color }) => {
            const active = isActive(path);
            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200 group relative
                  ${active
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                  ${sidebarCollapsed ? "justify-center" : ""}`}
                title={sidebarCollapsed ? label : ""}
              >
                <div className={`p-1.5 rounded-lg transition-colors
                  ${active 
                    ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400` 
                    : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                  }`}>
                  <Icon size={20} />
                </div>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </>
                )}
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-400 rounded-l-full" />
                )}
              </NavLink>
            );
          })}
        </nav>

      </aside>

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu size={20} />
            </button>

            {/* Search */}
            <div data-tour="global-search" className={`hidden sm:flex items-center gap-2 transition-all duration-300
              ${searchFocused ? "w-96" : "w-64"}`}>
              <div className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border transition-all duration-200
                ${searchFocused 
                  ? "border-blue-500 bg-white dark:bg-gray-800 shadow-sm" 
                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                }`}>
                <Search size={16} className={`transition-colors ${searchFocused ? "text-blue-500" : "text-gray-400"}`} />
                <input
                  type="text"
                  placeholder="Search..."
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Actions */}

            {/* Tour Help */}
            <button
              onClick={start}
              aria-label="Take a website tour"
              title="Take a website tour"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <HelpCircle size={18} />
            </button>

            {/* Theme Toggle */}
            <div data-tour="theme-toggle">
              <ThemeToggle />
            </div>

            {/* User Menu */}
            <div className="relative" data-tour="user-menu">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || "G"}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name || "Guest"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {role?.replace("_", " ")}
                  </p>
                </div>
                <ChevronDown size={16} className="hidden md:block text-gray-400" />
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-20">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user?.name?.charAt(0)?.toUpperCase() || "G"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.name || "Guest"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user?.email || "guest@transiti-fy.example"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/settings");
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300
                                 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <UserIcon size={16} />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400
                                 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Breadcrumb bar */}
        <div className="px-4 lg:px-6 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Breadcrumb />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 dark:bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;