/**
 * src/pages/Dashboard.jsx
 * --------------------------
 * Screen 1 in the mockup: 7 KPI cards, 3 filter dropdowns (vehicle type,
 * status, region), a Recent Trips table, and a Vehicle Status
 * distribution panel (horizontal progress bars).
 *
 * Data sources:
 *   GET /api/dashboard/kpis?type=&status=&region=
 *   GET /api/dashboard/recent-trips
 *   GET /api/dashboard/vehicle-status-distribution
 * All three re-fetch whenever a filter changes.
 */

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Truck, CheckCircle2, Wrench, Route, Clock, Users, Gauge,
  Filter, Calendar, MapPin, TrendingUp, TrendingDown, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, ChevronRight
} from "lucide-react";
import api from "../configs/api";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import { staggerIn } from "../lib/gsap";

const VEHICLE_TYPES = ["Van", "Truck", "Bike"];
const VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"];

const Dashboard = () => {
  const cardsRef = useRef([]);
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });
  const [kpis, setKpis] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.region) params.region = filters.region;

      const [kpiRes, tripsRes, distRes] = await Promise.all([
        api.get("/api/dashboard/kpis", { params }),
        api.get("/api/dashboard/recent-trips"),
        api.get("/api/dashboard/vehicle-status-distribution"),
      ]);

      setKpis(kpiRes.data);
      setRecentTrips(tripsRes.data);
      setDistribution(distRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!loading) staggerIn(cardsRef.current);
  }, [loading]);

  const cards = kpis
    ? [
        { 
          label: "Active Vehicles", 
          value: kpis.active_vehicles, 
          icon: Truck,
          color: "blue",
          trend: "+2.5%",
          trendUp: true
        },
        { 
          label: "Available", 
          value: kpis.available_vehicles, 
          icon: CheckCircle2,
          color: "green",
          trend: "+5.1%",
          trendUp: true
        },
        { 
          label: "In Maintenance", 
          value: kpis.vehicles_in_maintenance, 
          icon: Wrench,
          color: "orange",
          trend: "-1.2%",
          trendUp: false
        },
        { 
          label: "Active Trips", 
          value: kpis.active_trips, 
          icon: Route,
          color: "purple",
          trend: "+12.3%",
          trendUp: true
        },
        { 
          label: "Pending Trips", 
          value: kpis.pending_trips, 
          icon: Clock,
          color: "yellow",
          trend: "-3.7%",
          trendUp: false
        },
        { 
          label: "Drivers On Duty", 
          value: kpis.drivers_on_duty, 
          icon: Users,
          color: "indigo",
          trend: "+8.4%",
          trendUp: true
        },
        { 
          label: "Utilization", 
          value: `${kpis.fleet_utilization_percent}%`, 
          icon: Gauge,
          color: "red",
          trend: "+1.8%",
          trendUp: true
        },
      ]
    : [];

  const activeFilters = Object.values(filters).filter(Boolean).length;

  const statusColors = {
    "Available": "green",
    "On Trip": "blue",
    "In Shop": "orange",
    "Retired": "gray"
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fleet Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time overview of your fleet operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Last Updated */}
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Updated {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg
                     hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all duration-200"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {/* Filter Toggle */}
          <button
            data-tour="dashboard-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${showFilters || activeFilters > 0
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
              }`}
          >
            <Filter size={16} />
            Filters
            {activeFilters > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-full">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-gray-400" />
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Vehicle Types</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {VEHICLE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Filter by region..."
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>

            {activeFilters > 0 && (
              <button
                onClick={() => setFilters({ type: "", status: "", region: "" })}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div data-tour="dashboard-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {(kpis ? cards : Array.from({ length: 7 })).map((card, index) => (
          <KpiCard
            key={card?.label || index}
            ref={(el) => (cardsRef.current[index] = el)}
            label={card?.label || "Loading..."}
            value={card?.value ?? "-"}
            icon={card?.icon}
            trend={card?.trend}
            trendUp={card?.trendUp}
            color={card?.color}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Trips Table */}
        <div data-tour="dashboard-recent-trips" className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Trips
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Latest trip activities across your fleet
                </p>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                View all
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trip ID
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ETA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {recentTrips.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Route size={32} className="text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-400 dark:text-gray-500">No trips found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Trips will appear here once they're created
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {recentTrips.map((t) => (
                  <tr 
                    key={t.trip_id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                        #{t.trip_id}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {t.vehicle}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t.driver}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {t.eta === "Awaiting Vehicle" 
                            ? t.eta 
                            : new Date(t.eta).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Status Distribution */}
        <div data-tour="dashboard-vehicle-status" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vehicle Status
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Current distribution of your fleet
            </p>
          </div>

          <div className="p-6 space-y-6">
            {distribution.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Gauge size={32} className="text-gray-300 dark:text-gray-600" />
                <p className="text-gray-400 dark:text-gray-500">No data available</p>
              </div>
            ) : (
              distribution.map((d) => {
                const color = statusColors[d.status] || "blue";
                return (
                  <div key={d.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {d.count}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({d.percent}%)
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-${color}-500 rounded-full transition-all duration-500 relative`}
                        style={{ width: `${d.percent}%` }}
                      >
                        {d.percent > 20 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Total Summary */}
            {distribution.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Vehicles
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {distribution.reduce((sum, d) => sum + d.count, 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;