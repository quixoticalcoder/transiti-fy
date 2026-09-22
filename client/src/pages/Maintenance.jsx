/**
 * src/pages/Maintenance.jsx
 * -----------------------------
 * Maintenance module (spec 3.6, screen 5). Left: Log Service Record
 * form. Right: Service Log table. Creating an "In Shop" record flips
 * the vehicle to In Shop server-side; marking a record Completed
 * restores it to Available (unless Retired) - both enforced by the
 * backend, this page just reflects the resulting state.
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  Search, Wrench, Plus, Filter, Calendar, DollarSign, 
  Truck, CheckCircle2, Clock, AlertCircle, ChevronDown,
  BarChart3, Settings, FileText, ArrowUpDown
} from "lucide-react";
import api from "../configs/api";
import StatusBadge from "../components/StatusBadge";
import ExportButtons from "../components/ExportButtons";
import usePermission from "../hooks/usePermission";
import { formatCurrency, formatDate } from "../lib/format";

const SERVICE_TYPES = [
  { value: "Oil Change", icon: "🛢️", color: "blue" },
  { value: "Engine Repair", icon: "🔧", color: "red" },
  { value: "Tyre Replacement", icon: "🛞", color: "orange" },
  { value: "General Service", icon: "🔩", color: "green" },
  { value: "Other", icon: "📋", color: "gray" },
];

const EMPTY_FORM = {
  vehicle_id: "",
  service_type: "Oil Change",
  cost: "",
  service_date: new Date().toISOString().slice(0, 10),
  status: "In Shop",
};

const Maintenance = () => {
  const { canEdit } = usePermission("Fleet");

  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "service_date", direction: "desc" });
  const [activeTab, setActiveTab] = useState("all");

  const loadAll = async () => {
    try {
      const [logsRes, vehiclesRes] = await Promise.all([
        api.get("/api/maintenance"),
        api.get("/api/vehicles"),
      ]);
      setLogs(logsRes.data);
      setVehicles(vehiclesRes.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load maintenance data.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/maintenance", {
        vehicle_id: Number(form.vehicle_id),
        service_type: form.service_type,
        cost: Number(form.cost),
        service_date: form.service_date,
        status: form.status,
      });
      toast.success("Maintenance record created");
      setForm(EMPTY_FORM);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create maintenance record.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (log) => {
    try {
      await api.post(`/api/maintenance/${log.id}/complete`);
      toast.success("Maintenance completed, vehicle restored to Available");
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not complete maintenance record.");
    }
  };

  const filteredLogs = logs
    .filter((l) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        l.service_type?.toLowerCase().includes(q) ||
        l.vehicle?.registration_number?.toLowerCase().includes(q) ||
        l.vehicle?.name_model?.toLowerCase().includes(q) ||
        l.status?.toLowerCase().includes(q)
      );
    })
    .filter((l) => {
      if (!filterStatus) return true;
      return l.status === filterStatus;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const stats = {
    total: logs.length,
    inShop: logs.filter(l => l.status === "In Shop").length,
    completed: logs.filter(l => l.status === "Completed").length,
    totalCost: logs.reduce((sum, l) => sum + (l.cost || 0), 0),
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) 
      return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortConfig.direction === "asc" 
      ? <ChevronDown size={14} className="text-blue-500 transform rotate-180" />
      : <ChevronDown size={14} className="text-blue-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Maintenance Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track vehicle service records and maintenance history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons rows={logs} filename="maintenance" title="Maintenance Log" />
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
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
              <Settings size={18} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Records</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.inShop}</p>
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

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(stats.totalCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Service Record Form */}
        <div className="lg:col-span-1">
          {canEdit ? (
            <div data-tour="maintenance-log-form" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden sticky top-6">
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Wrench size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Log Service Record
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create new maintenance entry
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Truck size={16} className="text-gray-400" />
                    Vehicle
                  </label>
                  <select 
                    required 
                    value={form.vehicle_id}
                    onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-transparent text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-all duration-200"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name_model} ({v.registration_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Settings size={16} className="text-gray-400" />
                    Service Type
                  </label>
                  <select 
                    value={form.service_type}
                    onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-transparent text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             transition-all duration-200"
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.icon} {s.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <DollarSign size={16} className="text-gray-400" />
                      Cost
                    </label>
                    <input 
                      required 
                      type="number" 
                      min="0.01" 
                      step="0.01" 
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Calendar size={16} className="text-gray-400" />
                      Date
                    </label>
                    <input 
                      type="date" 
                      value={form.service_date}
                      onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                               bg-transparent text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               transition-all duration-200" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <FileText size={16} className="text-gray-400" />
                    Status
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${form.status === "In Shop"
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}>
                      <input
                        type="radio"
                        name="status"
                        value="In Shop"
                        checked={form.status === "In Shop"}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">In Shop</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle in service</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${form.status === "Completed"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}>
                      <input
                        type="radio"
                        name="status"
                        value="Completed"
                        checked={form.status === "Completed"}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Service finished</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-3 rounded-lg text-sm font-medium text-white
                           bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  {saving ? "Creating Record..." : "Create Service Record"}
                </button>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                        Workflow: Available → In Shop → Available
                      </p>
                      <p>
                        Vehicles marked as "In Shop" are automatically removed from the dispatch pool 
                        until maintenance is completed.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <AlertCircle size={20} />
                <p className="text-sm">Your role has view-only access to Maintenance.</p>
              </div>
            </div>
          )}
        </div>

        {/* Service Log Table */}
        <div className="lg:col-span-2">
          <div data-tour="maintenance-log-table" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Service History
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredLogs.length} records found
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                             bg-transparent text-gray-700 dark:text-gray-300
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="In Shop">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th 
                      className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("vehicle")}
                    >
                      <div className="flex items-center gap-1">
                        <Truck size={14} />
                        Vehicle
                        <SortIcon column="vehicle" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Settings size={14} />
                        Service Type
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("cost")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign size={14} />
                        Cost
                        <SortIcon column="cost" />
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      onClick={() => handleSort("service_date")}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        Date
                        <SortIcon column="service_date" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    {canEdit && (
                      <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 6 : 5} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Wrench size={32} className="text-gray-300 dark:text-gray-600" />
                          <p className="text-gray-400 dark:text-gray-500">
                            No maintenance records found
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {search ? "Try adjusting your search or filters" : "Create your first service record"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredLogs.map((l) => {
                    const serviceType = SERVICE_TYPES.find(s => s.value === l.service_type);
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-${serviceType?.color || 'gray'}-100 dark:bg-${serviceType?.color || 'gray'}-900/30 flex items-center justify-center`}>
                              <Truck size={18} className={`text-${serviceType?.color || 'gray'}-600 dark:text-${serviceType?.color || 'gray'}-400`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {l.vehicle?.name_model || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {l.vehicle?.registration_number || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{serviceType?.icon || "📋"}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {l.service_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(l.cost)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(l.service_date)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={l.status} />
                        </td>
                        {canEdit && (
                          <td className="py-4 px-6 text-right">
                            {l.status === "In Shop" && (
                              <button 
                                onClick={() => handleComplete(l)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                                         bg-green-600 text-white hover:bg-green-700 rounded-lg
                                         transition-all duration-200"
                              >
                                <CheckCircle2 size={14} />
                                Complete
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;