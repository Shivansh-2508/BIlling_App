"use client";

import { useEffect, useState } from "react";
import { Package, Plus, Edit2, Trash2, Save, X, Search, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  stock: number;
}

const API_BASE = "https://billing-app-onzk.onrender.com";

export default function StockCRUDPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", stock: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState({ name: "", stock: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error("Failed to fetch products.");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError("Failed to load products.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-hide success/error messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Create product
  const handleCreate = async () => {
    if (!newProduct.name.trim()) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) throw new Error("Failed to create product.");
      setSuccess("Product created successfully!");
      setNewProduct({ name: "", stock: 0 });
      fetchProducts();
    } catch {
      setError("Failed to create product.");
    }
    setSaving(false);
  };

  // Start editing
  const startEdit = (product: Product) => {
    setEditId(product._id);
    setEditProduct({ name: product.name, stock: product.stock });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditId(null);
    setEditProduct({ name: "", stock: 0 });
  };

  // Save edit
  const handleEditSave = async (id: string) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProduct),
      });
      if (!res.ok) throw new Error("Failed to update product.");
      setSuccess("Product updated successfully!");
      setEditId(null);
      setEditProduct({ name: "", stock: 0 });
      fetchProducts();
    } catch {
      setError("Failed to update product.");
    }
    setSaving(false);
  };

  // Delete product
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product.");
      setSuccess("Product deleted successfully!");
      fetchProducts();
    } catch {
      setError("Failed to delete product.");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock Management</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Manage your product inventory with ease</p>
        </div>

        {/* Notifications */}
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

        {/* Add Product */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Add New Product
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input
                type="text"
                required
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base placeholder:text-gray-500"
                placeholder="Enter product name"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 sm:max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base text-gray-500 placeholder:text-gray-500"
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 justify-center min-h-[42px] sm:min-h-[48px] text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Products ({filteredProducts.length})</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all w-full sm:w-64 text-sm sm:text-base placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-indigo-600 mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-500 px-4">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium mb-2 text-center">
                {searchTerm ? "No products found" : "No products yet"}
              </p>
              <p className="text-xs sm:text-sm text-center">
                {searchTerm ? "Try adjusting your search" : "Add your first product to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Stock Quantity
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map(product =>
                    editId === product._id ? (
                      <tr key={product._id} className="bg-blue-50">
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <input
                            type="text"
                            value={editProduct.name}
                            onChange={e => setEditProduct({ ...editProduct, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-black"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <input
                            type="number"
                            value={editProduct.stock}
                            onChange={e => setEditProduct({ ...editProduct, stock: Number(e.target.value) })}
                            className="w-20 sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-black"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditSave(product._id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            >
                              <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">{product.name}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-900 font-medium text-sm sm:text-base">
                          {product.stock}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                            >
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product._id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}