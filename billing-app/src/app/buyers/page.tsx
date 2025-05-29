"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, AlertCircle, CheckCircle,  Trash2 }from "lucide-react";

interface Buyer {
  _id: string;
  name: string;
  address: string;
  gstin: string;
}

const API_BASE = "http://localhost:5000";

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [newBuyer, setNewBuyer] = useState({ name: "", address: "", gstin: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBuyers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/buyers`);
      if (!res.ok) throw new Error("Failed to fetch buyers.");
      const data = await res.json();
      setBuyers(data);
    } catch (err) {
      console.error("Error fetching buyers:", err);
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
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Buyers ({buyers.length})</h2>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600 mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Loading buyers...</p>
            </div>
          ) : buyers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16text-black px-4">
              <p className="text-base sm:text-lg font-medium mb-2 text-center">No buyers found</p>
              <p className="text-xs sm:text-sm text-center">Add your first buyer to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-medium text-black uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-medium text-black uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs font-medium text-black uppercase tracking-wider">
                      GSTIN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
  {buyers.map((buyer) => (
    <tr key={buyer._id} className="hover:bg-gray-50 transition-colors">
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-black">{buyer.name}</td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-black">{buyer.address}</td>
      <td className="px-4 sm:px-6 py-3 sm:py-4 text-black flex items-center justify-between gap-2">
        <span>{buyer.gstin}</span>
        <button
          title="Delete Buyer"
          onClick={() => handleDeleteBuyer(buyer._id)}
          className="ml-2 text-red-600 hover:text-red-800 p-1 rounded transition-colors"
          disabled={saving}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}