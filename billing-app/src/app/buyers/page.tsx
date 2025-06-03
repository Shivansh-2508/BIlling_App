"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle, Trash2, Edit2, Save, X, Search } from "lucide-react";

interface Buyer {
  _id: string;
  name: string;
  address: string;
  gstin: string;
}

const API_BASE = "http://192.168.29.201:5000";

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [newBuyer, setNewBuyer] = useState({ name: "", address: "", gstin: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editBuyer, setEditBuyer] = useState({ name: "", address: "", gstin: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBuyers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/buyers`);
      if (!res.ok) throw new Error("Failed to fetch buyers.");
      const data = await res.json();
      setBuyers(data);
    } catch (err) {
      setError("Failed to load buyers.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleAddBuyer = async () => {
    if (!newBuyer.name.trim() || !newBuyer.address.trim() || !newBuyer.gstin.trim()) {
      setError("All fields are mandatory.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/buyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBuyer),
      });
      if (!res.ok) throw new Error("Failed to add buyer.");
      setSuccess("Buyer added successfully!");
      setNewBuyer({ name: "", address: "", gstin: "" });
      fetchBuyers();
    } catch {
      setError("Failed to add buyer.");
    }
    setSaving(false);
  };

  const handleDeleteBuyer = async (buyerId: string) => {
    if (!window.confirm("Are you sure you want to delete this buyer?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/buyers/${buyerId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete buyer.");
      setSuccess("Buyer deleted successfully!");
      fetchBuyers();
    } catch {
      setError("Failed to delete buyer.");
    }
    setSaving(false);
  };

  // --- Edit Logic ---
  const startEdit = (buyer: Buyer) => {
    setEditId(buyer._id);
    setEditBuyer({ name: buyer.name, address: buyer.address, gstin: buyer.gstin });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditBuyer({ name: "", address: "", gstin: "" });
  };

  const handleEditSave = async (buyerId: string) => {
    if (!editBuyer.name.trim() || !editBuyer.address.trim() || !editBuyer.gstin.trim()) {
      setError("All fields are mandatory.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/buyers/${buyerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editBuyer),
      });
      if (!res.ok) throw new Error("Failed to update buyer.");
      setSuccess("Buyer updated successfully!");
      setEditId(null);
      setEditBuyer({ name: "", address: "", gstin: "" });
      fetchBuyers();
    } catch {
      setError("Failed to update buyer.");
    }
    setSaving(false);
  };

  // Filtered buyers based on search term
  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buyers Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your buyers with ease</p>
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

        {/* Add Buyer */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            Add New Buyer
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={newBuyer.name}
                onChange={(e) => setNewBuyer({ ...newBuyer, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-black"
                placeholder="Enter buyer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={newBuyer.address}
                onChange={(e) => setNewBuyer({ ...newBuyer, address: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-black"
                placeholder="Enter buyer address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
              <input
                type="text"
                value={newBuyer.gstin}
                onChange={(e) => setNewBuyer({ ...newBuyer, gstin: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500 text-black"
                placeholder="Enter GSTIN"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddBuyer}
                disabled={saving}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 justify-center min-h-[42px] sm:min-h-[48px] text-sm sm:text-base"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Buyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Buyers List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header with search bar */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Buyers ({filteredBuyers.length})
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search buyers..."
                  className="pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all w-full sm:w-64 text-sm sm:text-base placeholder:text-gray-500 text-black"
                />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600 mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Loading buyers...</p>
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-black px-4">
              <p className="text-base sm:text-lg font-medium mb-2 text-center">No buyers found</p>
              <p className="text-xs sm:text-sm text-center">Try a different search or add a new buyer</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View - Hidden on md and up */}
              <div className="block md:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredBuyers.map((buyer) =>
                    editId === buyer._id ? (
                      <div key={buyer._id} className="p-4 bg-blue-50 rounded-lg mb-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            value={editBuyer.name}
                            onChange={e => setEditBuyer({ ...editBuyer, name: e.target.value })}
                            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            value={editBuyer.address}
                            onChange={e => setEditBuyer({ ...editBuyer, address: e.target.value })}
                            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                            placeholder="Address"
                          />
                          <input
                            type="text"
                            value={editBuyer.gstin}
                            onChange={e => setEditBuyer({ ...editBuyer, gstin: e.target.value })}
                            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-black"
                            placeholder="GSTIN"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditSave(buyer._id)}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 text-sm"
                          >
                            <Save className="w-4 h-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors disabled:opacity-50 text-sm"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={buyer._id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900 text-base">{buyer.name}</h3>
                          <div className="flex gap-1">
                            <button
                              title="Edit Buyer"
                              onClick={() => startEdit(buyer)}
                              className="text-indigo-600 hover:text-indigo-800 p-1 rounded transition-colors"
                              disabled={saving}
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              title="Delete Buyer"
                              onClick={() => handleDeleteBuyer(buyer._id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors ml-1"
                              disabled={saving}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</span>
                            <p className="text-sm text-gray-900 mt-1">{buyer.address}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">GSTIN</span>
                            <p className="text-sm text-gray-900 mt-1 font-mono">{buyer.gstin}</p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GSTIN
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBuyers.map((buyer) =>
                      editId === buyer._id ? (
                        <tr key={buyer._id} className="bg-blue-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <input
                              type="text"
                              value={editBuyer.name}
                              onChange={e => setEditBuyer({ ...editBuyer, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                              placeholder="Name"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <input
                              type="text"
                              value={editBuyer.address}
                              onChange={e => setEditBuyer({ ...editBuyer, address: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-black"
                              placeholder="Address"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <input
                              type="text"
                              value={editBuyer.gstin}
                              onChange={e => setEditBuyer({ ...editBuyer, gstin: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-black"
                              placeholder="GSTIN"
                            />
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEditSave(buyer._id)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 text-sm"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors disabled:opacity-50 text-sm"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={buyer._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-black font-medium">{buyer.name}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-black">{buyer.address}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-black font-mono">{buyer.gstin}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                title="Edit Buyer"
                                onClick={() => startEdit(buyer)}
                                className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                                disabled={saving}
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                title="Delete Buyer"
                                onClick={() => handleDeleteBuyer(buyer._id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                disabled={saving}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
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