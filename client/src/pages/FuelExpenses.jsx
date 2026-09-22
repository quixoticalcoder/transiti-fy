/**
 * src/pages/FuelExpenses.jsx
 * ------------------------------
 * Fuel & Expense Management module (spec 3.7, screen 6). Fuel Logs
 * table + form, Other Expenses (Toll/Misc) table + form - each linked
 * to a vehicle (and optionally a trip) - and a Total Operational Cost
 * footer aggregated server-side via GET /api/operational-cost.
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  Fuel, Receipt, Search, Plus, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Filter, Calendar, Truck, AlertCircle,
  ChevronDown, ChevronUp, Download, FileText, Clock
} from "lucide-react";
import api from "../configs/api";
import Modal from "../components/Modal";
import ExportButtons from "../components/ExportButtons";
import usePermission from "../hooks/usePermission";
import { formatCurrency, formatDate } from "../lib/format";

const EMPTY_FUEL_FORM = { 
  vehicle_id: "", 
  trip_id: "", 
  liters: "", 
  cost: "", 
  log_date: new Date().toISOString().slice(0, 10) 
};
const EMPTY_EXPENSE_FORM = { 
  vehicle_id: "", 
  trip_id: "", 
  toll_charges: "", 
  other_expenses: "", 
  expense_date: new Date().toISOString().slice(0, 10), 
  remarks: "" 
};

const FuelExpenses = () => {
  const { canEdit } = usePermission("Fuel & Expenses");

  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [operationalCost, setOperationalCost] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("fuel");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [expandedSections, setExpandedSections] = useState({
    fuel: true,
    expenses: true,
    cost: true
  });

  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState(EMPTY_FUEL_FORM);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    try {
      const [fuelRes, expenseRes, vehiclesRes, costRes] = await Promise.all([
        api.get("/api/fuel-logs"),
        api.get("/api/expenses"),
        api.get("/api/vehicles"),
        api.get("/api/operational-cost"),
      ]);
      setFuelLogs(fuelRes.data);
      setExpenses(expenseRes.data);
      setVehicles(vehiclesRes.data);
      setOperationalCost(costRes.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load fuel & expense data.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const vehicleLabel = (id) => {
    const v = vehicles.find((veh) => veh.id === id);
    return v ? `${v.name_model} (${v.registration_number})` : id;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/fuel-logs", {
        vehicle_id: Number(fuelForm.vehicle_id),
        trip_id: fuelForm.trip_id ? Number(fuelForm.trip_id) : null,
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        log_date: fuelForm.log_date,
      });
      toast.success("Fuel log recorded");
      setFuelModalOpen(false);
      setFuelForm(EMPTY_FUEL_FORM);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save fuel log.");
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/expenses", {
        vehicle_id: Number(expenseForm.vehicle_id),
        trip_id: expenseForm.trip_id ? Number(expenseForm.trip_id) : null,
        toll_charges: Number(expenseForm.toll_charges) || 0,
        other_expenses: Number(expenseForm.other_expenses) || 0,
        expense_date: expenseForm.expense_date,
        remarks: expenseForm.remarks,
      });
      toast.success("Expense recorded");
      setExpenseModalOpen(false);
      setExpenseForm(EMPTY_EXPENSE_FORM);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save expense.");
    } finally {
      setSaving(false);
    }
  };

  const filteredFuel = fuelLogs.filter(
    (f) => !search || vehicleLabel(f.vehicle_id).toLowerCase().includes(search.toLowerCase())
  );
  const filteredExpenses = expenses.filter(
    (e) => !search || vehicleLabel(e.vehicle_id).toLowerCase().includes(search.toLowerCase())
  );

  const totalFuelCost = filteredFuel.reduce((sum, f) => sum + (f.cost || 0), 0);
  const totalFuelLiters = filteredFuel.reduce((sum, f) => sum + (f.liters || 0), 0);
  const totalTollCharges = filteredExpenses.reduce((sum, e) => sum + (e.toll_charges || 0), 0);
  const totalOtherExpenses = filteredExpenses.reduce((sum, e) => sum + (e.other_expenses || 0), 0);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronDown size={14} className="text-gray-300" />;
    return sortConfig.direction === "asc" 
      ? <ChevronUp size={14} className="text-blue-500" />
      : <ChevronDown size={14} className="text-blue-500" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fuel & Expense Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track fuel consumption and operational expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       w-56 transition-all duration-200"
            />
          </div>

          {canEdit && (
            <div data-tour="fuel-actions" className="flex items-center gap-2">
              <button 
                onClick={() => setFuelModalOpen(true)} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                         bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200"
              >
                <Plus size={16} />
                Log Fuel
              </button>
              <button 
                onClick={() => setExpenseModalOpen(true)} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium 
                         text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 
                         border border-gray-300 dark:border-gray-700 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <Plus size={16} />
                Add Expense
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Fuel size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Fuel Cost</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalFuelCost)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BarChart3 size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fuel Consumed</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {totalFuelLiters.toFixed(1)} L
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Receipt size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Toll Charges</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalTollCharges)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Other Expenses</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(totalOtherExpenses)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div data-tour="fuel-tabs" className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("fuel")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "fuel"
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Fuel size={16} />
          Fuel Logs
          <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            {filteredFuel.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "expenses"
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Receipt size={16} />
          Other Expenses
          <span className="ml-1 px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
            {filteredExpenses.length}
          </span>
        </button>
      </div>

      {/* Fuel Logs Table */}
      {activeTab === "fuel" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Fuel size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Fuel Logs
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredFuel.length} records found
                  </p>
                </div>
              </div>
              <ExportButtons rows={fuelLogs} filename="fuel_logs" title="Fuel Logs" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th 
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort("vehicle_id")}
                  >
                    <div className="flex items-center gap-1">
                      <Truck size={14} />
                      Vehicle
                      <SortIcon column="vehicle_id" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort("log_date")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      Date
                      <SortIcon column="log_date" />
                    </div>
                  </th>
                  <th 
                    className="text-left py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort("liters")}
                  >
                    <div className="flex items-center gap-1">
                      <BarChart3 size={14} />
                      Fuel (L)
                      <SortIcon column="liters" />
                    </div>
                  </th>
                  <th 
                    className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort("cost")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign size={14} />
                      Cost
                      <SortIcon column="cost" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filteredFuel.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Fuel size={32} className="text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-400 dark:text-gray-500">No fuel logs found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {search ? "Try adjusting your search" : "Start by logging your first fuel entry"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {getSortedData(filteredFuel).map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {vehicleLabel(f.vehicle_id)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(f.log_date)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min((f.liters / Math.max(...filteredFuel.map(f => f.liters), 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {f.liters} L
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(f.cost)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredFuel.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <td colSpan={2} className="py-3 px-6 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </td>
                    <td className="py-3 px-6">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {totalFuelLiters.toFixed(1)} L
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalFuelCost)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Other Expenses Table */}
      {activeTab === "expenses" && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Receipt size={20} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Other Expenses
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Toll & Miscellaneous charges
                  </p>
                </div>
              </div>
              <ExportButtons rows={expenses} filename="expenses" title="Other Expenses" />
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
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Toll Charges
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Other Expenses
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Maintenance
                  </th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Receipt size={32} className="text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-400 dark:text-gray-500">No expenses found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {search ? "Try adjusting your search" : "Add your first expense record"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {getSortedData(filteredExpenses).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      {e.trip_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                          bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <FileText size={12} />
                          #{e.trip_id}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {vehicleLabel(e.vehicle_id)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(e.toll_charges)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(e.other_expenses)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatCurrency(e.maintenance_cost)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(e.total_cost)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <td colSpan={2} className="py-3 px-6 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(totalTollCharges)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(totalOtherExpenses)}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.maintenance_cost || 0), 0))}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(filteredExpenses.reduce((sum, e) => sum + (e.total_cost || 0), 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Total Operational Cost Footer */}
      {operationalCost && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 
                      rounded-xl overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Total Operational Cost</p>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(operationalCost.total_operational_cost)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-1 text-blue-200 text-xs mb-1">
                    <Fuel size={12} />
                    Fuel
                  </div>
                  <p className="text-white font-semibold">
                    {formatCurrency(operationalCost.fuel_cost)}
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-1 text-blue-200 text-xs mb-1">
                    <AlertCircle size={12} />
                    Maintenance
                  </div>
                  <p className="text-white font-semibold">
                    {formatCurrency(operationalCost.maintenance_cost)}
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-1 text-blue-200 text-xs mb-1">
                    <Receipt size={12} />
                    Tolls
                  </div>
                  <p className="text-white font-semibold">
                    {formatCurrency(operationalCost.toll_charges)}
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-1 text-blue-200 text-xs mb-1">
                    <DollarSign size={12} />
                    Other
                  </div>
                  <p className="text-white font-semibold">
                    {formatCurrency(operationalCost.other_expenses)}
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Bar */}
            {operationalCost.total_operational_cost > 0 && (
              <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-yellow-300"
                  style={{ width: `${(operationalCost.fuel_cost / operationalCost.total_operational_cost) * 100}%` }}
                  title="Fuel"
                />
                <div 
                  className="h-full bg-red-400"
                  style={{ width: `${(operationalCost.maintenance_cost / operationalCost.total_operational_cost) * 100}%` }}
                  title="Maintenance"
                />
                <div 
                  className="h-full bg-green-300"
                  style={{ width: `${(operationalCost.toll_charges / operationalCost.total_operational_cost) * 100}%` }}
                  title="Tolls"
                />
                <div 
                  className="h-full bg-purple-400"
                  style={{ width: `${(operationalCost.other_expenses / operationalCost.total_operational_cost) * 100}%` }}
                  title="Other"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Fuel Modal */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Fuel Entry" widthClass="max-w-md">
        <form onSubmit={handleFuelSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Truck size={16} className="text-gray-400" />
              Vehicle
            </label>
            <select 
              required 
              value={fuelForm.vehicle_id}
              onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name_model} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <BarChart3 size={16} className="text-gray-400" />
                Fuel (Liters)
              </label>
              <input 
                required 
                type="number" 
                min="0.1" 
                step="0.1" 
                value={fuelForm.liters}
                onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                placeholder="0.0"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
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
                value={fuelForm.cost}
                onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Calendar size={16} className="text-gray-400" />
              Date
            </label>
            <input 
              type="date" 
              value={fuelForm.log_date}
              onChange={(e) => setFuelForm({ ...fuelForm, log_date: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button 
              type="button" 
              onClick={() => setFuelModalOpen(false)} 
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                       rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-5 py-2.5 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-all duration-200"
            >
              {saving ? "Saving..." : "Save Fuel Log"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Add Expense" widthClass="max-w-md">
        <form onSubmit={handleExpenseSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Truck size={16} className="text-gray-400" />
              Vehicle
            </label>
            <select 
              required 
              value={expenseForm.vehicle_id}
              onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name_model} ({v.registration_number})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Receipt size={16} className="text-gray-400" />
                Toll Charges
              </label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={expenseForm.toll_charges}
                onChange={(e) => setExpenseForm({ ...expenseForm, toll_charges: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <DollarSign size={16} className="text-gray-400" />
                Other Expenses
              </label>
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={expenseForm.other_expenses}
                onChange={(e) => setExpenseForm({ ...expenseForm, other_expenses: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText size={16} className="text-gray-400" />
              Remarks
            </label>
            <textarea
              value={expenseForm.remarks}
              onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
              placeholder="Add any notes or description..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button 
              type="button" 
              onClick={() => setExpenseModalOpen(false)} 
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                       rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-5 py-2.5 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-all duration-200"
            >
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FuelExpenses;