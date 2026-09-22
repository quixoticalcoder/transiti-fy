/**
 * src/pages/Drivers.jsx
 * -------------------------
 * Driver Management & Safety Profiles module (spec 3.4, screen 3).
 * Lists drivers with license/safety info, supports quick status
 * toggles, and blocks re-activating a driver whose license is expired
 * (mirrored from the backend's own guard in routes/drivers.py).
 *
 * The "Send Reminder" button on an expiring/expired license calls the
 * Brevo-backed reminder endpoint (bonus feature: email reminders).
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Mail, AlertTriangle, Upload } from "lucide-react";
import api from "../configs/api";
import { uploadToCloudinary } from "../configs/cloudinary";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import ExportButtons from "../components/ExportButtons";
import usePermission from "../hooks/usePermission";
import { formatDate } from "../lib/format";

const STATUSES = ["Available", "On Trip", "Off Duty", "Suspended"];
const LICENSE_CATEGORIES = ["LMV", "HMV", "Commercial", "Two-Wheeler"];

const EMPTY_FORM = {
  id: null,
  name: "",
  license_number: "",
  license_category: "LMV",
  license_expiry_date: "",
  contact_number: "",
  safety_score: 100,
  status: "Available",
  photo_url: "",
  reminder_email: "",
};

const Drivers = () => {
  const { canEdit } = usePermission("Drivers");

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/api/drivers", { params });
      setDrivers(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (driver) => {
    setForm({ ...driver, reminder_email: "" });
    setModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error("Upload failed. Check your Cloudinary config.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        license_number: form.license_number,
        license_category: form.license_category,
        license_expiry_date: form.license_expiry_date,
        contact_number: form.contact_number,
        safety_score: Number(form.safety_score) || 0,
        photo_url: form.photo_url,
      };

      if (form.id) {
        await api.put(`/api/drivers/${form.id}`, payload);
        toast.success("Driver updated successfully");
      } else {
        await api.post("/api/drivers", payload);
        toast.success("Driver registered successfully");
      }
      setModalOpen(false);
      loadDrivers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save driver.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (driver, status) => {
    try {
      await api.patch(`/api/drivers/${driver.id}/status`, { status });
      toast.success(`Driver status set to ${status}`);
      loadDrivers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update status.");
    }
  };

  const handleSendReminder = async (driver) => {
    const email = window.prompt(`Send license-expiry reminder to ${driver.name} - enter their email:`);
    if (!email) return;
    try {
      await api.post(`/api/drivers/${driver.id}/send-reminder`, { email });
      toast.success(`Reminder email sent to ${email}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send reminder email.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Drivers &amp; Safety Profiles</h1>
        <div className="flex items-center gap-2">
          <ExportButtons rows={drivers} filename="drivers" title="Drivers & Safety Profiles" />
          {canEdit && (
            <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">
              <Plus size={16} /> Add Driver
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 w-64 max-w-full">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search name, license, or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div data-tour="drivers-table" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-3 px-4">Driver</th>
              <th className="py-3 px-4">License No.</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">License Expiry</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Safety Score</th>
              <th className="py-3 px-4">Current Status</th>
              {canEdit && <th className="py-3 px-4">Quick Toggle</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && drivers.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">No drivers found.</td></tr>
            )}
            {drivers.map((d) => (
              <tr key={d.id} className="border-b border-gray-100 dark:border-gray-800/60">
                <td className="py-2 px-4 font-medium">{d.name}</td>
                <td className="py-2 px-4">{d.license_number}</td>
                <td className="py-2 px-4">{d.license_category}</td>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-1.5">
                    {formatDate(d.license_expiry_date)}
                    {d.is_license_expired && (
                      <span title="License expired" className="text-red-500">
                        <AlertTriangle size={14} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-4">{d.contact_number}</td>
                <td className="py-2 px-4">{d.safety_score}</td>
                <td className="py-2 px-4"><StatusBadge status={d.status} /></td>
                {canEdit && (
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusToggle(d, e.target.value)}
                        disabled={d.is_license_expired}
                        className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent disabled:opacity-50"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => openEdit(d)} className="text-xs px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        Edit
                      </button>
                      {d.is_license_expired && (
                        <button
                          onClick={() => handleSendReminder(d)}
                          title="Send license expiry reminder email"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-amber-600"
                        >
                          <Mail size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Driver" : "Add Driver"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">License Number</label>
              <input required value={form.license_number}
                onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">License Category</label>
              <select value={form.license_category}
                onChange={(e) => setForm({ ...form, license_category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">License Expiry Date</label>
              <input required type="date" value={form.license_expiry_date}
                onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Number</label>
              <input required value={form.contact_number}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Safety Score</label>
              <input type="number" min="0" max="100" value={form.safety_score}
                onChange={(e) => setForm({ ...form, safety_score: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Driver Photo (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer text-sm text-gray-500">
              <Upload size={16} />
              {uploading ? "Uploading..." : form.photo_url ? "Replace photo" : "Choose file"}
              <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Drivers;