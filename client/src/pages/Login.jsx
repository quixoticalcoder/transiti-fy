/**
 * src/pages/Login.jsx
 * ----------------------
 * Authentication page (screen 0 in the mockup): two-panel layout with
 * the platform intro on the left and the sign-in form on the right.
 *
 * There is no public "Create Account" option here on purpose: accounts
 * are provisioned by an existing Fleet Manager from Settings > User
 * Management (see Settings.jsx), which is the only place a user's role
 * gets assigned. Letting people self-register with an arbitrary role
 * (including the admin role) would be a privilege-escalation hole, so
 * that flow was intentionally removed rather than gated client-side.
 *
 * Flow:
 *   1. POST /api/auth/login with { email, password }.
 *   2. The backend is the source of truth for the user's actual role
 *      (embedded in the JWT); the Role dropdown here is used only to
 *      pick which landing module to redirect to after a successful
 *      login, matching the spec's per-role landing pages.
 *   3. "Invalid credentials." / "Account locked after 5 failed
 *      attempts." messages are surfaced verbatim from the backend.
 */

import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  Truck, Users, ShieldCheck, LineChart, Eye, EyeOff,
  Building2, ArrowRight, CheckCircle2, AlertCircle,
  Clock, Shield, Zap, Star, Mail, Lock, UserCog,
  Info
} from "lucide-react";
import api from "../configs/api";
import { setCredentials } from "../store/slices/authSlice";
import { fadeInUp } from "../lib/gsap";

const ROLES = [
  { value: "fleet_manager", label: "Fleet Manager", landing: "/fleet", icon: Truck, color: "purple" },
  { value: "dispatcher", label: "Dispatcher", landing: "/dashboard", icon: Users, color: "blue" },
  { value: "safety_officer", label: "Safety Officer", landing: "/drivers", icon: ShieldCheck, color: "green" },
  { value: "financial_analyst", label: "Financial Analyst", landing: "/fuel-expenses", icon: LineChart, color: "orange" },
];

const ROLE_BLURBS = [
  { 
    icon: Truck, 
    label: "Fleet Manager", 
    text: "Oversees fleet assets, maintenance, and vehicle lifecycle.",
    stats: "Full Access",
    color: "purple"
  },
  { 
    icon: Users, 
    label: "Dispatcher", 
    text: "Creates trips and assigns vehicles and drivers.",
    stats: "Trip Management",
    color: "blue"
  },
  { 
    icon: ShieldCheck, 
    label: "Safety Officer", 
    text: "Tracks license validity and driver safety scores.",
    stats: "Safety First",
    color: "green"
  },
  { 
    icon: LineChart, 
    label: "Financial Analyst", 
    text: "Reviews expenses, fuel cost, and profitability.",
    stats: "Cost Analytics",
    color: "orange"
  },
];

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const [form, setForm] = useState({ email: "", password: "", role: "dispatcher" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    fadeInUp(panelRef.current);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", {
        email: form.email,
        password: form.password,
      });

      dispatch(setCredentials(data));

      // "Remember Me" unchecked -> keep the session tab-only by clearing
      // the persisted copy once Redux already holds the live tokens.
      if (!rememberMe) {
        localStorage.removeItem("transiti_fy_access_token");
        localStorage.removeItem("transiti_fy_refresh_token");
        localStorage.removeItem("transiti_fy_user");
        localStorage.removeItem("transiti_fy_role");
      }

      toast.success(`Welcome back, ${data.user.name}!`);

      // Redirect to the landing module for the role selected on the form,
      // falling back to the role actually returned by the backend.
      const landingRole = ROLES.find((r) => r.value === data.user.role) ||
        ROLES.find((r) => r.value === form.role);
      navigate(landingRole?.landing || "/dashboard");
    } catch (err) {
      const message = err?.response?.data?.message || "Invalid credentials.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-950">
      {/* Left panel - branding + role overview */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Top Section */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">transiti-fy</h1>
              <p className="text-sm text-blue-200">Fleet Management Platform</p>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <div>
              <p className="text-sm font-medium tracking-wide text-blue-200 uppercase mb-2">
                Smart Transport Operations
              </p>
              <h2 className="text-3xl font-bold leading-tight">
                Manage your entire fleet from one dashboard
              </h2>
            </div>
            <p className="text-blue-100 text-lg leading-relaxed">
              One platform to manage vehicles, drivers, dispatch, maintenance,
              and expenses — end to end.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-2xl font-bold">99.9%</p>
              <p className="text-xs text-blue-200">Uptime</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-xs text-blue-200">Support</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-2xl font-bold">10k+</p>
              <p className="text-xs text-blue-200">Vehicles</p>
            </div>
          </div>
        </div>

        {/* Role Cards */}
        <div className="relative z-10 space-y-4">
          <p className="text-sm font-medium text-blue-200 mb-2">
            Built for every role in your team
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_BLURBS.map(({ icon: Icon, label, text, stats, color }) => (
              <div 
                key={label}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors group cursor-default"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg bg-${color}-400/20`}>
                    <Icon size={16} className={`text-${color}-300`} />
                  </div>
                  <span className="text-xs font-medium text-blue-200">{stats}</span>
                </div>
                <p className="text-sm font-semibold mb-1">{label}</p>
                <p className="text-xs text-blue-200 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-4 text-xs text-blue-200">
          <span>© 2024 transiti-fy</span>
          <span>•</span>
          <span>Terms of Service</span>
          <span>•</span>
          <span>Privacy Policy</span>
        </div>
      </div>

      {/* Right panel - sign-in form */}
      <div className="flex items-center justify-center px-4 py-8 bg-white dark:bg-gray-900">
        <form
          ref={panelRef}
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">transiti-fy</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fleet Management Platform</p>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Sign in to your account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Authentication Failed
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Demo Credentials Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <Info size={20} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Demo Credentials
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                All seeded accounts use password: <code className="font-mono bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded">Password@123</code>
              </p>
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Mail size={16} className="text-gray-400" />
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="you@transiti-fy.example"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                       outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all duration-200"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Lock size={16} className="text-gray-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400
                         outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 
                         hover:text-gray-600 dark:hover:text-gray-300 rounded-lg
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <UserCog size={16} className="text-gray-400" />
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <label
                    key={role.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                      ${form.role === role.value
                        ? `border-${role.color}-500 bg-${role.color}-50 dark:bg-${role.color}-900/20`
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.role === role.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`p-1.5 rounded-lg ${
                      form.role === role.value
                        ? `bg-${role.color}-100 dark:bg-${role.color}-800/50`
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Icon size={16} className={
                        form.role === role.value
                          ? `text-${role.color}-600 dark:text-${role.color}-400`
                          : "text-gray-500 dark:text-gray-400"
                      } />
                    </div>
                    <span className={`text-sm font-medium ${
                      form.role === role.value
                        ? `text-${role.color}-700 dark:text-${role.color}-400`
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {role.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 
                         focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                Remember me
              </span>
            </label>
            <button
              type="button"
              onClick={() => toast("Password recovery isn't wired up in this demo yet.")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 
                       dark:hover:text-blue-300 font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 
                     hover:from-blue-700 hover:to-blue-800 text-white font-semibold
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 transform hover:scale-[1.02]
                     flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Footer Notice */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield size={14} />
              <span>Secure, role-based access control</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              New team members are added by a Fleet Manager under{" "}
              <span className="text-blue-600 dark:text-blue-400 font-medium">Settings → User Management</span>
            </p>
          </div>

          {/* Mobile Role Info */}
          <div className="lg:hidden mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Available Roles
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_BLURBS.map(({ icon: Icon, label, text }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;