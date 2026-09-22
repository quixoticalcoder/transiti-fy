/**
 * src/pages/Settings.jsx
 * --------------------------
 * Settings & RBAC module (spec 3, screen 8). Left column: General
 * Settings (Depot Name, Currency, Distance Unit) stacked above User
 * Management. Right: the RBAC permission matrix (role x module ->
 * No Access / View Only / Full Access).
 *
 * All three admin actions (General Settings, RBAC matrix, User
 * Management) are gated server-side by roles_required("fleet_manager");
 * non-admin roles can still view this page (GETs are open to any
 * authenticated user) but every Save/Add/Edit control is hidden.
 *
 * User Management exists because there is no public signup route -
 * every account is provisioned here by a Fleet Manager, who picks the
 * new user's role at creation time. See auth.py's /register, /users
 * endpoints.
 */

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { 
  UserPlus, 
  Shield, 
  Settings2, 
  Users, 
  Save, 
  X, 
  Check, 
  AlertTriangle,
  Building2,
  DollarSign,
  Ruler,
  Mail,
  Lock,
  User,
  UserCog
} from "lucide-react";
import api from "../configs/api";
import { fetchPermissions } from "../store/slices/permissionsSlice";
import Modal from "../components/Modal";

const ROLES = [
  { value: "fleet_manager", label: "Fleet Manager", color: "purple" },
  { value: "dispatcher", label: "Dispatcher", color: "blue" },
  { value: "safety_officer", label: "Safety Officer", color: "green" },
  { value: "financial_analyst", label: "Financial Analyst", color: "orange" },
];

const MODULES = [
  { name: "Fleet", icon: "🚛" },
  { name: "Drivers", icon: "👤" },
  { name: "Trips", icon: "🗺️" },
  { name: "Fuel & Expenses", icon: "⛽" },
  { name: "Analytics", icon: "📊" },
];

const ACCESS_LEVELS = [
  { value: "No Access", color: "gray", bg: "bg-gray-100 dark:bg-gray-800" },
  { value: "View Only", color: "blue", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { value: "Full Access", color: "green", bg: "bg-green-100 dark:bg-green-900/30" },
];

const getAccessColor = (level) => {
  const access = ACCESS_LEVELS.find(a => a.value === level);
  return access || ACCESS_LEVELS[0];
};

const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value;
const roleColor = (value) => ROLES.find((r) => r.value === value)?.color || "gray";

const Settings = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const currentRole = useSelector((state) => state.auth.role);
  const isAdmin = currentRole === "fleet_manager";

  const [general, setGeneral] = useState({ 
    depot_name: "", 
    currency: "INR", 
    distance_unit: "Kilometers" 
  });
  const [matrix, setMatrix] = useState({});
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // --- User Management state ---
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "dispatcher" 
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const loadAll = async () => {
    try {
      const [generalRes, rbacRes] = await Promise.all([
        api.get("/api/settings/general"),
        api.get("/api/settings/rbac"),
      ]);
      setGeneral(generalRes.data);
      setMatrix(rbacRes.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load settings.");
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/api/auth/users");
      setUsers(data.users);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAll();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeneralSubmit = async (e) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await api.put("/api/settings/general", general);
      toast.success("Settings updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update settings.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleCellChange = (role, moduleName, value) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [moduleName]: value },
    }));
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    try {
      const updates = [];
      for (const role of ROLES) {
        for (const moduleItem of MODULES) {
          updates.push({
            role: role.value,
            module: moduleItem.name,
            access_level: matrix?.[role.value]?.[moduleItem.name] || "No Access",
          });
        }
      }
      await api.put("/api/settings/rbac", { updates });
      toast.success("RBAC permissions updated successfully");
      dispatch(fetchPermissions());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update permissions.");
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (newUser.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setCreatingUser(true);
    try {
      await api.post("/api/auth/register", newUser);
      toast.success(`${newUser.name} added as ${roleLabel(newUser.role)}`);
      setShowAddUser(false);
      setNewUser({ name: "", email: "", password: "", role: "dispatcher" });
      loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      const { data } = await api.patch(`/api/auth/users/${user.id}`, { role });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
      toast.success(`${user.name} is now ${roleLabel(role)}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update role.");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const { data } = await api.patch(`/api/auth/users/${user.id}`, { 
        is_active: !user.is_active 
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
      toast.success(`${user.name} ${data.user.is_active ? "reactivated" : "deactivated"}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update user.");
    }
  };

  const tabs = [
    { id: "general", label: "General Settings", icon: Settings2 },
    { id: "users", label: "User Management", icon: Users },
    { id: "rbac", label: "Permissions", icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage system configuration and access controls
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
            <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-700 dark:text-yellow-400">
              View only mode
            </span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div data-tour="settings-tabs" className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* General Settings Tab */}
        {activeTab === "general" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    General Configuration
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Basic system settings and preferences
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleGeneralSubmit} className="p-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Depot Name */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Building2 size={16} className="text-gray-400" />
                    Depot Name
                  </label>
                  <input
                    value={general.depot_name || ""}
                    onChange={(e) => setGeneral({ ...general, depot_name: e.target.value })}
                    disabled={!isAdmin}
                    placeholder="Enter depot name"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent 
                             text-gray-900 dark:text-white placeholder-gray-400
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <DollarSign size={16} className="text-gray-400" />
                    Currency
                  </label>
                  <select
                    value={general.currency || "INR"}
                    onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  >
                    {["INR", "USD", "EUR", "GBP"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Distance Unit */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Ruler size={16} className="text-gray-400" />
                    Distance Unit
                  </label>
                  <select
                    value={general.distance_unit || "Kilometers"}
                    onChange={(e) => setGeneral({ ...general, distance_unit: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent
                             text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200"
                  >
                    <option value="Kilometers">Kilometers</option>
                    <option value="Miles">Miles</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingGeneral}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg 
                             hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                             font-medium text-sm transition-all duration-200"
                  >
                    <Save size={16} />
                    {savingGeneral ? "Saving Changes..." : "Save Changes"}
                  </button>
                </div>
              )}

              {!isAdmin && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <AlertTriangle size={16} />
                  Only Fleet Managers can modify system settings.
                </div>
              )}
            </form>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      User Management
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage user accounts and roles
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddUser(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg 
                             hover:bg-purple-700 font-medium text-sm transition-all duration-200"
                  >
                    <UserPlus size={16} />
                    Add User
                  </button>
                )}
              </div>
            </div>

            <div className="p-6">
              {!isAdmin ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <AlertTriangle size={16} />
                  Only Fleet Managers can manage user accounts.
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4 mb-6">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      There is no public sign-up. You decide every new user's role here -
                      they never choose it themselves. Granting the Fleet Manager role gives
                      full admin access, including editing this page.
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            User
                          </th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Role
                          </th>
                          <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Status
                          </th>
                          <th className="text-right py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                        {loadingUsers && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center">
                              <div className="flex items-center justify-center gap-2 text-gray-400">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                                Loading users...
                              </div>
                            </td>
                          </tr>
                        )}
                        {!loadingUsers && users.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-gray-400">
                              No users found. Add your first user to get started.
                            </td>
                          </tr>
                        )}
                        {users.map((u) => {
                          const isSelf = currentUser?.id === u.id;
                          return (
                            <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full bg-${roleColor(u.role)}-100 dark:bg-${roleColor(u.role)}-900/30 flex items-center justify-center`}>
                                    <User size={18} className={`text-${roleColor(u.role)}-600 dark:text-${roleColor(u.role)}-400`} />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                      {u.name}
                                      {isSelf && (
                                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Mail size={12} />
                                      {u.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <select
                                  value={u.role}
                                  disabled={isSelf}
                                  onChange={(e) => handleRoleChange(u, e.target.value)}
                                  className={`px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                                           bg-transparent text-gray-900 dark:text-white
                                           disabled:opacity-50 disabled:cursor-not-allowed
                                           focus:ring-2 focus:ring-purple-500 focus:border-transparent
                                           transition-all duration-200`}
                                >
                                  {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>
                                      {r.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                                  ${u.is_active 
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                  }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    u.is_active ? "bg-green-500" : "bg-gray-400"
                                  }`}></span>
                                  {u.is_active ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleToggleActive(u)}
                                  disabled={isSelf}
                                  className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200
                                    disabled:opacity-40 disabled:cursor-not-allowed
                                    ${u.is_active
                                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                                      : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800"
                                    }`}
                                >
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* RBAC Permissions Tab */}
        {activeTab === "rbac" && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Shield size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Role-Based Access Control
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure permission levels for each role
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Mobile View - Cards */}
              <div className="block lg:hidden space-y-6">
                {ROLES.map((role) => (
                  <div key={role.value} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                    <div className={`px-4 py-3 bg-${role.color}-50 dark:bg-${role.color}-900/20 border-b border-gray-200 dark:border-gray-800`}>
                      <h3 className={`font-semibold text-${role.color}-700 dark:text-${role.color}-400`}>
                        {role.label}
                      </h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {MODULES.map((module) => (
                        <div key={module.name} className="flex items-center justify-between">
                          <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span>{module.icon}</span>
                            {module.name}
                          </label>
                          <select
                            value={matrix?.[role.value]?.[module.name] || "No Access"}
                            onChange={(e) => handleCellChange(role.value, module.name, e.target.value)}
                            disabled={!isAdmin || role.value === "fleet_manager"}
                            className={`px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 
                                     bg-transparent text-gray-900 dark:text-white
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                          >
                            {ACCESS_LEVELS.map((lvl) => (
                              <option key={lvl.value} value={lvl.value}>{lvl.value}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 dark:border-gray-800">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Role
                      </th>
                      {MODULES.map((m) => (
                        <th key={m.name} className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-lg">{m.icon}</span>
                            <span>{m.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                    {ROLES.map((role) => (
                      <tr key={role.value} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                            bg-${role.color}-100 dark:bg-${role.color}-900/30 
                            text-${role.color}-700 dark:text-${role.color}-400`}>
                            <UserCog size={14} />
                            {role.label}
                          </div>
                        </td>
                        {MODULES.map((module) => {
                          const currentAccess = matrix?.[role.value]?.[module.name] || "No Access";
                          const accessStyle = getAccessColor(currentAccess);
                          
                          return (
                            <td key={module.name} className="py-4 px-4 text-center">
                              <select
                                value={currentAccess}
                                onChange={(e) => handleCellChange(role.value, module.name, e.target.value)}
                                disabled={!isAdmin || role.value === "fleet_manager"}
                                className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200
                                  ${accessStyle.bg} 
                                  border-${accessStyle.color}-200 dark:border-${accessStyle.color}-800
                                  text-${accessStyle.color}-700 dark:text-${accessStyle.color}-400
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  focus:ring-2 focus:ring-${accessStyle.color}-500 focus:border-transparent
                                  font-medium`}
                              >
                                {ACCESS_LEVELS.map((lvl) => (
                                  <option key={lvl.value} value={lvl.value}>
                                    {lvl.value}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-4 flex-wrap">
                <span className="text-sm text-gray-500 dark:text-gray-400">Access Levels:</span>
                {ACCESS_LEVELS.map((level) => (
                  <div key={level.value} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-${level.color}-500`}></span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{level.value}</span>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                {isAdmin ? (
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveMatrix} 
                      disabled={savingMatrix}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg 
                               hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                               font-medium text-sm transition-all duration-200"
                    >
                      <Save size={16} />
                      {savingMatrix ? "Saving Permissions..." : "Save Permissions"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <AlertTriangle size={16} />
                    Only Fleet Managers can modify role permissions.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal 
        open={showAddUser} 
        onClose={() => setShowAddUser(false)} 
        title="Add New User" 
        widthClass="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-5">
          {/* User Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <UserPlus size={18} className="text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Create a new user account
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                They will be able to log in immediately with these credentials
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <User size={16} className="text-gray-400" />
              Full Name
            </label>
            <input
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="Enter full name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                       outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail size={16} className="text-gray-400" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="email@company.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                       outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Lock size={16} className="text-gray-400" />
              Temporary Password
            </label>
            <input
              type="text"
              required
              minLength={8}
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Minimum 8 characters"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 
                       bg-transparent text-gray-900 dark:text-white placeholder-gray-400
                       outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       font-mono transition-all duration-200"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              Share this password securely - no automated emails are sent
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <UserCog size={16} className="text-gray-400" />
              User Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                    ${newUser.role === role.value
                      ? `border-${role.color}-500 bg-${role.color}-50 dark:bg-${role.color}-900/20`
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={newUser.role === role.value}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className={`text-${role.color}-600 focus:ring-${role.color}-500`}
                  />
                  <span className={`text-sm font-medium text-${role.color}-700 dark:text-${role.color}-400`}>
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
                       rounded-lg transition-all duration-200"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingUser}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white
                       bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-all duration-200"
            >
              <Check size={16} />
              {creatingUser ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Settings;