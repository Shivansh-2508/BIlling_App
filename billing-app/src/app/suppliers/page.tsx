"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle, Trash2, Edit2, Save, X, Search } from "lucide-react";

interface Supplier {
  _id: string;
  name: string;
  address: string;
  contact: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newSupplier, setNewSupplier] = useState({ name: "", address: "", contact: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editSupplier, setEditSupplier] = useState({ name: "", address: "", contact: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/suppliers`);
      if (!res.ok) throw new Error("Failed to fetch suppliers.");
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError("Failed to load suppliers.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async () => {
    if (!newSupplier.name.trim() || !newSupplier.address.trim()) {
      setError("Name and address are mandatory.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      if (!res.ok) throw new Error("Failed to add supplier.");
      setSuccess("Supplier added successfully!");
      setNewSupplier({ name: "", address: "", contact: "" });
      fetchSuppliers();
    } catch {
      setError("Failed to add supplier.");
    }
    setSaving(false);
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/suppliers/${supplierId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete supplier.");
      setSuccess("Supplier deleted successfully!");
      fetchSuppliers();
    } catch {
      setError("Failed to delete supplier.");
    }
    setSaving(false);
  };

  // --- Edit Logic ---
  const startEdit = (supplier: Supplier) => {
    setEditId(supplier._id);
    setEditSupplier({ name: supplier.name, address: supplier.address, contact: supplier.contact });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditSupplier({ name: "", address: "", contact: "" });
  };

  const handleEditSave = async (supplierId: string) => {
    if (!editSupplier.name.trim() || !editSupplier.address.trim()) {
      setError("Name and address are mandatory.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/suppliers/${supplierId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSupplier),
      });
      if (!res.ok) throw new Error("Failed to update supplier.");
      setSuccess("Supplier updated successfully!");
      setEditId(null);
      setEditSupplier({ name: "", address: "", contact: "" });
      fetchSuppliers();
    } catch {
      setError("Failed to update supplier.");
    }
    setSaving(false);
  };

  // Filtered suppliers based on search term
  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Suppliers Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your suppliers with ease</p>
        </div>

        {(error || success) && (
          <div className="mb-4 sm:mb-6">
            {error && (
              <div className="flex items-start gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-3 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 shadow-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base">{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Add Supplier */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            Add New Supplier
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-gray-900"
                placeholder="Enter supplier name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-gray-900"
                placeholder="Enter supplier address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
              <input
                type="text"
                value={newSupplier.contact}
                onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-gray-900"
                placeholder="Enter contact number or email"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddSupplier}
                disabled={saving}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 justify-center min-h-[42px] sm:min-h-[48px] text-sm sm:text-base"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Supplier
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header with search bar */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Suppliers ({filteredSuppliers.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search suppliers..."
                  className="pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full sm:w-64 text-sm sm:text-base placeholder:text-gray-500 text-gray-900"
                />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-900 px-4">
              <p className="text-base sm:text-lg font-medium mb-2 text-center">No suppliers found</p>
              <p className="text-xs sm:text-sm text-center">Try a different search or add a new supplier</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View - Hidden on md and up */}
              <div className="block md:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredSuppliers.map((supplier) =>
                    editId === supplier._id ? (
                      <div key={supplier._id} className="p-4 space-y-3">
                        <input
                          type="text"
                          value={editSupplier.name}
                          onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder:text-gray-500"
                          placeholder="Name"
                        />
                        <input
                          type="text"
                          value={editSupplier.address}
                          onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder:text-gray-500"
                          placeholder="Address"
                        />
                        <input
                          type="text"
                          value={editSupplier.contact}
                          onChange={(e) => setEditSupplier({ ...editSupplier, contact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder:text-gray-500"
                          placeholder="Contact"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(supplier._id)}
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <Save className="w-4 h-4" /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm flex items-center justify-center gap-1"
                          >
                            <X className="w-4 h-4" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={supplier._id} className="p-4 space-y-2">
                        <p className="font-semibold text-gray-900">{supplier.name}</p>
                        <p className="text-xs text-gray-600">{supplier.address}</p>
                        {supplier.contact && <p className="text-xs text-gray-600">{supplier.contact}</p>}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => startEdit(supplier)}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier._id)}
                            className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-xs flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Desktop Table View - Hidden on sm and down */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Contact</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) =>
                      editId === supplier._id ? (
                        <tr key={supplier._id} className="bg-blue-50">
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editSupplier.name}
                              onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editSupplier.address}
                              onChange={(e) => setEditSupplier({ ...editSupplier, address: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editSupplier.contact}
                              onChange={(e) => setEditSupplier({ ...editSupplier, contact: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                            />
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleEditSave(supplier._id)}
                              disabled={saving}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 inline-flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" /> Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium text-sm inline-flex items-center gap-2"
                            >
                              <X className="w-4 h-4" /> Cancel
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={supplier._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{supplier.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{supplier.address}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{supplier.contact || "—"}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => startEdit(supplier)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier._id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm inline-flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
