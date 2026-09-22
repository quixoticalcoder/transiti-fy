/**
 * src/pages/Analytics.jsx
 * ---------------------------
 * Reports & Analytics module (spec 3.8, screen 7). 4 KPI cards (Fuel
 * Efficiency, Fleet Utilization, Operational Cost, Vehicle ROI), the
 * ROI formula, a Monthly Revenue bar chart (recharts), and a Top
 * Costliest Vehicles panel (horizontal progress bars).
 */

import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { 
  Gauge, Percent, Wallet, TrendingUp, Search, 
  BarChart3, Download, Filter, Calendar, DollarSign,
  TrendingDown, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Truck, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Area, AreaChart, ComposedChart, Legend, Cell
} from "recharts";
import api from "../configs/api";
import KpiCard from "../components/KpiCard";
import ExportButtons from "../components/ExportButtons";
import { staggerIn } from "../lib/gsap";
import { formatCurrency } from "../lib/format";

const Analytics = () => {
  const cardsRef = useRef([]);
  const [summary, setSummary] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topCostly, setTopCostly] = useState([]);
  const [search, setSearch] = useState("");
  const [chartView, setChartView] = useState("bar"); // bar or area
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [sortBy, setSortBy] = useState("cost"); // cost or name

  useEffect(() => {
    const load = async () => {
      try {
        const [summaryRes, revenueRes, topRes] = await Promise.all([
          api.get("/api/analytics/summary"),
          api.get("/api/analytics/monthly-revenue"),
          api.get("/api/analytics/top-costliest-vehicles", { params: { limit: 8 } }),
        ]);
        setSummary(summaryRes.data);
        setMonthlyRevenue(revenueRes.data);
        setTopCostly(topRes.data);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load analytics.");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (summary) staggerIn(cardsRef.current);
  }, [summary]);

  const maxCost = Math.max(...topCostly.map((v) => v.total_operational_cost), 1);
  
  const filteredTop = topCostly
    .filter(
      (v) => !search || 
        v.name_model?.toLowerCase().includes(search.toLowerCase()) || 
        v.registration_number?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "cost") return b.total_operational_cost - a.total_operational_cost;
      if (sortBy === "name") return (a.name_model || "").localeCompare(b.name_model || "");
      return 0;
    });

  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const avgMonthlyRevenue = monthlyRevenue.length > 0 ? totalRevenue / monthlyRevenue.length : 0;
  
  const getRevenueTrend = () => {
    if (monthlyRevenue.length < 2) return null;
    const lastTwo = monthlyRevenue.slice(-2);
    const change = ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isUp: change >= 0
    };
  };

  const revenueTrend = getRevenueTrend();

  const cards = summary ? [
    {
      label: "Fuel Efficiency",
      value: `${summary.fuel_efficiency_km_per_l} km/l`,
      icon: Gauge,
      color: "green",
      trend: "+2.3%",
      trendUp: true
    },
    {
      label: "Fleet Utilization",
      value: `${summary.fleet_utilization_percent}%`,
      icon: Percent,
      color: "blue",
      trend: "+5.1%",
      trendUp: true
    },
    {
      label: "Operational Cost",
      value: formatCurrency(summary.operational_cost),
      icon: Wallet,
      color: "orange",
      trend: "-3.2%",
      trendUp: false
    },
    {
      label: "Vehicle ROI",
      value: `${summary.vehicle_roi_percent}%`,
      icon: TrendingUp,
      color: "purple",
      trend: "+1.8%",
      trendUp: true,
      hint: "ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost"
    }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics & Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fleet performance metrics and financial insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Button */}
          <ExportButtons 
            rows={topCostly} 
            filename="top_costliest_vehicles" 
            title="Top Costliest Vehicles" 
          />

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vehicles..."
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

      {/* KPI Cards */}
      <div data-tour="analytics-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.length > 0 ? cards.map((card, index) => (
          <KpiCard
            key={card.label}
            ref={(el) => (cardsRef.current[index] = el)}
            label={card.label}
            value={card.value}
            icon={card.icon}
            trend={card.trend}
            trendUp={card.trendUp}
            color={card.color}
            hint={card.hint}
          />
        )) : Array.from({ length: 4 }).map((_, i) => (
          <KpiCard
            key={i}
            ref={(el) => (cardsRef.current[i] = el)}
            label="Loading..."
            value="-"
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Chart */}
          <div data-tour="analytics-chart" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
                    Monthly Revenue
                  </h2>
                  {revenueTrend && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        revenueTrend.isUp 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {revenueTrend.isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {revenueTrend.value}% vs last month
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setChartView("bar")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      chartView === "bar"
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setChartView("area")}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      chartView === "area"
                        ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    Area
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {monthlyRevenue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <BarChart3 size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No revenue data yet</p>
                  <p className="text-sm mt-1">Complete some trips to see revenue analytics</p>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalRevenue)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly Avg</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(avgMonthlyRevenue)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Best Month</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {monthlyRevenue.length > 0 
                          ? monthlyRevenue.reduce((best, m) => m.revenue > best.revenue ? m : best).month 
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    {chartView === "bar" ? (
                      <BarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="revenue" 
                          radius={[6, 6, 0, 0]}
                        >
                          {monthlyRevenue.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`}
                              fill={entry.revenue > avgMonthlyRevenue ? '#2563EB' : '#93C5FD'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <ComposedChart data={monthlyRevenue}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Area 
                          type="monotone"
                          dataKey="revenue" 
                          fill="url(#revenueGradient)"
                          stroke="#2563EB"
                          strokeWidth={2}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="#2563EB"
                          radius={[4, 4, 0, 0]}
                          opacity={0.8}
                        />
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* ROI Information Card */}
          {summary && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 
                          border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <Info size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Understanding Vehicle ROI
                  </h3>
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4 font-mono text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">ROI</span> = (
                      <span className="text-green-600 dark:text-green-400">Revenue</span> − (
                      <span className="text-red-600 dark:text-red-400">Maintenance</span> + 
                      <span className="text-orange-600 dark:text-orange-400"> Fuel</span>)) / 
                      <span className="text-purple-600 dark:text-purple-400"> Acquisition Cost</span>
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    This metric helps identify the most profitable vehicles in your fleet. 
                    Higher ROI indicates better cost efficiency and revenue generation.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Costliest Vehicles Panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                Top Costly Vehicles
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 
                         bg-transparent text-gray-700 dark:text-gray-300
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="cost">Sort by Cost</option>
                <option value="name">Sort by Name</option>
              </select>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredTop.length} vehicles
              </span>
            </div>
          </div>

          <div className="p-6">
            {filteredTop.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Truck size={48} className="mb-4 opacity-50" />
                <p className="font-medium">No vehicles found</p>
                <p className="text-sm mt-1">Try adjusting your search</p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredTop.map((v, index) => {
                  const percentage = (v.total_operational_cost / maxCost) * 100;
                  const isHighCost = percentage > 75;
                  
                  return (
                    <div key={v.vehicle_id} className="group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              index === 0 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                              index === 1 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                              index === 2 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" :
                              "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            }`}>
                              #{index + 1}
                            </span>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {v.name_model}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {v.registration_number}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-sm font-bold ${
                            isHighCost 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {formatCurrency(v.total_operational_cost)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(1)}% of max
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 relative ${
                            isHighCost ? "bg-gradient-to-r from-red-500 to-red-400" : 
                            percentage > 50 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                            "bg-gradient-to-r from-yellow-500 to-yellow-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Summary Footer */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Cost (Shown)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(filteredTop.reduce((sum, v) => sum + v.total_operational_cost, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Average per Vehicle</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(
                        filteredTop.reduce((sum, v) => sum + v.total_operational_cost, 0) / filteredTop.length
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;