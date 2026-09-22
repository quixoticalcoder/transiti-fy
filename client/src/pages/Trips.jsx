/**
 * src/pages/Trips.jsx
 * -----------------------
 * Trip Dispatcher module (spec 3.5, screen 4). Two-column layout:
 *   Left  - Trip Lifecycle indicator + Create Trip form with live
 *           cargo-capacity validation against the selected vehicle.
 *   Right - Live Board of recent trips with Dispatch / Complete /
 *           Cancel actions driving the Draft -> Dispatched -> Completed
 *           (or Cancelled) lifecycle.
 *
 * Vehicle/Driver dropdowns are populated from the dispatch-pool
 * endpoints, which already exclude Retired/In Shop/On Trip vehicles and
 * Suspended/expired-license/On Trip drivers per the mandatory business
 * rules.
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  Search, Truck, Ban, Navigation, MapPin, Package, 
  User, Gauge, AlertTriangle, CheckCircle2, XCircle,
  Send, Flag, Plus, Filter, ArrowRight, Clock, 
  Calendar, Weight, Ruler, RefreshCw,
  FileText
} from "lucide-react";
import api from "../configs/api";
import StatusBadge from "../components/StatusBadge";
import usePermission from "../hooks/usePermission";

const LIFECYCLE_STAGES = [
  { name: "Draft", icon: FileText, color: "gray" },
  { name: "Dispatched", icon: Send, color: "blue" },
  { name: "Completed", icon: CheckCircle2, color: "green" },
  { name: "Cancelled", icon: XCircle, color: "red" },
];

const EMPTY_FORM = {
  source: "",
  destination: "",
  vehicle_id: "",
  driver_id: "",
  cargo_weight_kg: "",
  planned_distance_km: "",
};

const Trips = () => {
  const { canEdit } = usePermission("Trips");

  const [trips, setTrips] = useState([]);
  const [vehiclePool, setVehiclePool] = useState([]);
  const [driverPool, setDriverPool] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const selectedVehicle = vehiclePool.find((v) => String(v.id) === String(form.vehicle_id));
  const cargoWeight = Number(form.cargo_weight_kg) || 0;
  const overCapacity = selectedVehicle && cargoWeight > selectedVehicle.max_load_capacity_kg;

  const loadAll = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        api.get("/api/trips"),
        api.get("/api/vehicles/dispatch-pool"),
        api.get("/api/drivers/dispatch-pool"),
      ]);
      setTrips(tripsRes.data);
      setVehiclePool(vehiclesRes.data);
      setDriverPool(driversRes.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load trip data.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (overCapacity) return;

    setCreating(true);
    try {
      const payload = {
        source: form.source,
        destination: form.destination,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        cargo_weight_kg: cargoWeight,
        planned_distance_km: Number(form.planned_distance_km) || 0,
      };
      await api.post("/api/trips", payload);
      toast.success("Trip created as Draft");
      setForm(EMPTY_FORM);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create trip.");
    } finally {
      setCreating(false);
    }
  };

  const handleDispatch = async (trip) => {
    try {
      await api.post(`/api/trips/${trip.id}/dispatch`);
      toast.success("Trip dispatched successfully");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not dispatch trip.");
    }
  };

  const handleComplete = async (trip) => {
    const actual = window.prompt("Actual distance travelled (km)?", trip.planned_distance_km);
    if (actual === null) return;
    const fuel = window.prompt("Fuel consumed (liters)?", "0");
    try {
      await api.post(`/api/trips/${trip.id}/complete`, {
        actual_distance_km: Number(actual) || trip.planned_distance_km,
        fuel_consumed_liters: Number(fuel) || 0,
      });
      toast.success("Trip marked as Completed");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not complete trip.");
    }
  };

  const handleCancel = async (trip) => {
    if (!window.confirm(`Cancel trip #${trip.id}?`)) return;
    try {
      await api.post(`/api/trips/${trip.id}/cancel`);
      toast.success("Trip cancelled");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel trip.");
    }
  };

  const filteredTrips = trips
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.source?.toLowerCase().includes(q) ||
        t.destination?.toLowerCase().includes(q) ||
        t.vehicle?.name_model?.toLowerCase().includes(q) ||
        t.driver?.name?.toLowerCase().includes(q)
      );
    })
    .filter((t) => {
      if (!statusFilter) return true;
      return t.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "oldest") return a.id - b.id;
      return 0;
    });

  const stats = {
    total: trips.length,
    active: trips.filter(t => t.status === "Dispatched").length,
    draft: trips.filter(t => t.status === "Draft").length,
    completed: trips.filter(t => t.status === "Completed").length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Trip Dispatcher
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and monitor trip assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       w-56 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Navigation size={18} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Trips</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Send size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <FileText size={18} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{stats.draft}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Lifecycle + Create Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Trip Lifecycle */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <RefreshCw size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Trip Lifecycle
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Standard workflow stages
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {LIFECYCLE_STAGES.map((stage, i) => {
                  const Icon = stage.icon;
                  return (
                    <div key={stage.name} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-${stage.color}-100 dark:bg-${stage.color}-900/30 
                                    flex items-center justify-center`}>
                        <Icon size={18} className={`text-${stage.color}-600 dark:text-${stage.color}-400`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {stage.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {stage.name === "Draft" && "Initial creation state"}
                          {stage.name === "Dispatched" && "Vehicle & driver assigned"}
                          {stage.name === "Completed" && "Trip finished successfully"}
                          {stage.name === "Cancelled" && "Trip terminated"}
                        </p>
                      </div>
                      {i < LIFECYCLE_STAGES.length - 1 && (
                        <ArrowRight size={16} className="text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Create Trip Form */}
          {canEdit ? (
            <div data-tour="trips-create-form" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Plus size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Create Trip
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Plan a new trip route
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                {/* Route Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Navigation size={16} />
                    Route Details
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin size={16} className="text-gray-400" />
                      Source
                    </label>
                    <input 
                      required 
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      placeholder="Enter pickup location"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Flag size={16} className="text-gray-400" />
                      Destination
                    </label>
                    <input 
                      required 
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      placeholder="Enter drop-off location"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200" 
                    />
                  </div>
                </div>

                {/* Assignment Section */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Truck size={16} />
                    Assignment
                  </h3>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Truck size={16} className="text-gray-400" />
                      Vehicle (Available Only)
                    </label>
                    <select 
                      value={form.vehicle_id}
                      onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200"
                    >
                      <option value="">Select vehicle</option>
                      {vehiclePool.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name_model} ({v.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <User size={16} className="text-gray-400" />
                      Driver (Available Only)
                    </label>
                    <select 
                      value={form.driver_id}
                      onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200"
                    >
                      <option value="">Select driver</option>
                      {driverPool.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cargo Section */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Package size={16} />
                    Cargo & Distance
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Weight size={16} className="text-gray-400" />
                        Cargo Weight (kg)
                      </label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        value={form.cargo_weight_kg}
                        onChange={(e) => setForm({ ...form, cargo_weight_kg: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                                 bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 transition-all duration-200" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Ruler size={16} className="text-gray-400" />
                        Distance (km)
                      </label>
                      <input 
                        required 
                        type="number" 
                        min="0" 
                        value={form.planned_distance_km}
                        onChange={(e) => setForm({ ...form, planned_distance_km: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                                 bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 transition-all duration-200" 
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity Validation */}
                {selectedVehicle && (
                  <div className={`rounded-lg p-4 ${
                    overCapacity
                      ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Capacity Check
                      </span>
                      {overCapacity ? (
                        <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Vehicle Capacity</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedVehicle.max_load_capacity_kg} kg
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Cargo Weight</span>
                        <span className={`font-semibold ${
                          overCapacity 
                            ? "text-red-600 dark:text-red-400" 
                            : "text-green-600 dark:text-green-400"
                        }`}>
                          {cargoWeight} kg
                        </span>
                      </div>
                      {overCapacity && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                          <AlertTriangle size={14} />
                          <span className="font-medium">
                            Exceeds capacity by {(cargoWeight - selectedVehicle.max_load_capacity_kg).toFixed(0)} kg
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setForm(EMPTY_FORM)}
                    className="flex-1 px-4 py-3 rounded-lg text-sm font-medium
                             text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800
                             hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    Reset
                  </button>
                  <button 
                    type="submit" 
                    disabled={creating || overCapacity}
                    className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white
                             bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {creating ? "Creating..." : "Create Draft Trip"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <AlertTriangle size={20} />
                <p className="text-sm">Your role has view-only access to Trips.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Live Board */}
        <div className="lg:col-span-2">
          <div data-tour="trips-board" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Live Trip Board
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredTrips.length} trips found
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-transparent text-gray-700 dark:text-gray-300
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    {LIFECYCLE_STAGES.map((stage) => (
                      <option key={stage.name} value={stage.name}>{stage.name}</option>
                    ))}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-transparent text-gray-700 dark:text-gray-300
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                {filteredTrips.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Navigation size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No trips found</p>
                    <p className="text-sm mt-1">
                      {search || statusFilter 
                        ? "Try adjusting your filters" 
                        : "Create your first trip to get started"}
                    </p>
                  </div>
                )}

                {filteredTrips.map((t) => (
                  <div 
                    key={t.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                             hover:border-gray-300 dark:hover:border-gray-600 
                             transition-all duration-200 bg-white dark:bg-gray-800/30"
                  >
                    {/* Trip Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          t.status === "Draft" ? "bg-gray-100 dark:bg-gray-800" :
                          t.status === "Dispatched" ? "bg-blue-100 dark:bg-blue-900/30" :
                          t.status === "Completed" ? "bg-green-100 dark:bg-green-900/30" :
                          "bg-red-100 dark:bg-red-900/30"
                        }`}>
                          <Truck size={18} className={
                            t.status === "Draft" ? "text-gray-600 dark:text-gray-400" :
                            t.status === "Dispatched" ? "text-blue-600 dark:text-blue-400" :
                            t.status === "Completed" ? "text-green-600 dark:text-green-400" :
                            "text-red-600 dark:text-red-400"
                          } />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              Trip #{t.id}
                            </span>
                            <StatusBadge status={t.status} />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <MapPin size={14} />
                            <span>{t.source}</span>
                            <ArrowRight size={14} />
                            <span>{t.destination}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trip Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vehicle</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <Truck size={14} className="text-gray-400" />
                          {t.vehicle?.name_model || "Unassigned"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Driver</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          {t.driver?.name || "Awaiting Driver"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cargo</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <Package size={14} className="text-gray-400" />
                          {t.cargo_weight_kg} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Distance</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <Ruler size={14} className="text-gray-400" />
                          {t.planned_distance_km} km
                        </p>
                      </div>
                    </div>

                    {/* Vehicle In Shop Warning */}
                    {t.vehicle?.status === "In Shop" && t.status === "Dispatched" && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 
                                    bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
                        <AlertTriangle size={16} />
                        <span>Vehicle is currently in maintenance shop</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {canEdit && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        {t.status === "Draft" && (
                          <>
                            <button 
                              onClick={() => handleCancel(t)} 
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                                       text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700
                                       hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleDispatch(t)} 
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white
                                       bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
                            >
                              <Send size={14} />
                              Dispatch
                            </button>
                          </>
                        )}
                        {t.status === "Dispatched" && (
                          <>
                            <button 
                              onClick={() => handleCancel(t)} 
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                                       text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700
                                       hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                            >
                              <XCircle size={14} />
                              Cancel Trip
                            </button>
                            <button 
                              onClick={() => handleComplete(t)} 
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white
                                       bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200"
                            >
                              <CheckCircle2 size={14} />
                              Complete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trips;