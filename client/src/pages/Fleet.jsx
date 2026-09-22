/**
 * src/pages/Fleet.jsx
 * -----------------------
 * Vehicle Registry module (spec 3.3). Master list of vehicles with
 * search, type/status/region filters, CSV/Excel/PDF export, and a
 * modal form for registering/editing a vehicle (optionally attaching a
 * document/photo via Cloudinary).
 *
 * Business rule surfaced here: registration_number uniqueness is
 * enforced server-side; we simply display the 409 error via toast.
 */

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import api from "../configs/api";
import { uploadToCloudinary } from "../configs/cloudinary";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import ExportButtons from "../components/ExportButtons";
import usePermission from "../hooks/usePermission";
import { formatCurrency } from "../lib/format";

const STATUSES = ["Available", "On Trip", "In Shop", "Retired"];
const VEHICLE_TYPES = ["Van", "Truck", "Bike"];

const EMPTY_FORM = {
  id: null,
  registration_number: "",
  name_model: "",
  vehicle_type: "Van",
  max_load_capacity_kg: "",
  odometer_km: "",
  acquisition_cost: "",
  status: "Available",
  region: "",
  document_url: "",
};

const Fleet = () => {
  const { canEdit } = usePermission("Fleet");

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ type: "", status: "", region: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.region) params.region = filters.region;
      const { data } = await api.get("/api/vehicles", { params });
      setVehicles(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (vehicle) => {
    setForm({ ...vehicle });
    setModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadToCloudinary(file);
      setForm((f) => ({ ...f, document_url: url }));
      toast.success("Document uploaded");
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
        ...form,
        max_load_capacity_kg: Number(form.max_load_capacity_kg),
        odometer_km: Number(form.odometer_km) || 0,
        acquisition_cost: Number(form.acquisition_cost) || 0,
      };

      if (form.id) {
        await api.put(`/api/vehicles/${form.id}`, payload);
        toast.success("Vehicle updated successfully");
      } else {
        await api.post("/api/vehicles", payload);
        toast.success("Vehicle registered successfully");
      }
      setModalOpen(false);
      loadVehicles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete ${vehicle.name_model} (${vehicle.registration_number})?`)) return;
    try {
      await api.delete(`/api/vehicles/${vehicle.id}`);
      toast.success("Vehicle deleted successfully");
      loadVehicles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete vehicle.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Fleet / Vehicle Registry</h1>
        <div data-tour="fleet-actions" className="flex items-center gap-2">
          <ExportButtons rows={vehicles} filename="vehicles" title="Vehicle Registry" />
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 w-64 max-w-full">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search registration or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
        >
          <option value="">All Types</option>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Region"
          value={filters.region}
          onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent w-32"
        />
      </div>

      {/* Vehicle table */}
      <div data-tour="fleet-table" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-3 px-4">Reg. Number</th>
              <th className="py-3 px-4">Name / Model</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Max Load (kg)</th>
              <th className="py-3 px-4">Odometer (km)</th>
              <th className="py-3 px-4">Acquisition Cost</th>
              <th className="py-3 px-4">Status</th>
              {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && vehicles.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">No vehicles found.</td></tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800/60">
                <td className="py-2 px-4 font-medium">{v.registration_number}</td>
                <td className="py-2 px-4">{v.name_model}</td>
                <td className="py-2 px-4">{v.vehicle_type}</td>
                <td className="py-2 px-4">{v.max_load_capacity_kg}</td>
                <td className="py-2 px-4">{v.odometer_km}</td>
                <td className="py-2 px-4">{formatCurrency(v.acquisition_cost)}</td>
                <td className="py-2 px-4"><StatusBadge status={v.status} /></td>
                {canEdit && (
                  <td className="py-2 px-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(v)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600" aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Vehicle" : "Register Vehicle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Registration Number</label>
              <input required value={form.registration_number}
                onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Name / Model</label>
              <input required value={form.name_model}
                onChange={(e) => setForm({ ...form, name_model: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type</label>
              <select value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Max Load Capacity (kg)</label>
              <input required type="number" min="0" value={form.max_load_capacity_kg}
                onChange={(e) => setForm({ ...form, max_load_capacity_kg: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Odometer (km)</label>
              <input type="number" min="0" value={form.odometer_km}
                onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Acquisition Cost</label>
              <input type="number" min="0" value={form.acquisition_cost}
                onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Region</label>
              <input value={form.region || ""}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Vehicle Document / Photo (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer text-sm text-gray-500">
              <Upload size={16} />
              {uploading ? "Uploading..." : form.document_url ? "Replace file" : "Choose file"}
              <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
            </label>
            {form.document_url && (
              <a href={form.document_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all">
                {form.document_url}
              </a>
            )}
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

export default Fleet;