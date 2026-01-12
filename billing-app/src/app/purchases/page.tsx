'use client';

import { useState, useEffect } from 'react';
import BackToHome from '@/components/BackToHome';
import Link from 'next/link';

interface Purchase {
  _id: string;
  purchase_no: string;
  date: string;
  supplier_name: string;
  amount: number;
  invoice_number?: string;
  invoice_file?: string;
  description?: string;
  reference?: string;
  status: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/purchases`;
      
      const params = new URLSearchParams();
      if (start) params.append('start_date', start);
      if (end) params.append('end_date', end);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      const data = await response.json();
      setPurchases(data);
      setFilteredPurchases(data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    fetchPurchases(startDate, endDate);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = purchases.filter(purchase =>
      purchase.purchase_no.toLowerCase().includes(term.toLowerCase()) ||
      purchase.supplier_name.toLowerCase().includes(term.toLowerCase()) ||
      (purchase.invoice_number?.toLowerCase().includes(term.toLowerCase()) ?? false)
    );
    setFilteredPurchases(filtered);
  };

  const calculateTotalPurchased = () => {
    return filteredPurchases.reduce((sum, p) => sum + p.amount, 0).toFixed(2);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this purchase?')) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/purchases/${id}`, {
        method: 'DELETE'
      });
      fetchPurchases(startDate, endDate);
    } catch (error) {
      console.error('Error deleting purchase:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <BackToHome />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Purchase Records</h1>
          <p className="text-gray-600 mt-2">View and manage all purchases from suppliers</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Purchase # or Supplier"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleDateFilter}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Filter
              </button>
              <Link
                href="/purchases/create"
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-center"
              >
                New Purchase
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 mb-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-orange-100 text-sm">Total Purchases</p>
              <p className="text-2xl font-bold">{filteredPurchases.length}</p>
            </div>
            <div>
              <p className="text-orange-100 text-sm">Total Amount</p>
              <p className="text-2xl font-bold">₹{calculateTotalPurchased()}</p>
            </div>
            <div>
              <p className="text-orange-100 text-sm">Avg Per Purchase</p>
              <p className="text-2xl font-bold">
                ₹{(filteredPurchases.length > 0 ? (Number(calculateTotalPurchased()) / filteredPurchases.length) : 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-orange-100 text-sm">With Invoice</p>
              <p className="text-2xl font-bold">{filteredPurchases.filter(p => p.invoice_number).length}</p>
            </div>
          </div>
        </div>

        {/* Purchases List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading purchases...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No purchases found</p>
            <Link
              href="/purchases/create"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Record First Purchase
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Purchase #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {purchase.purchase_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{purchase.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{purchase.supplier_name}</td>
                    <td className="px-6 py-4 text-sm">
                      {purchase.invoice_number ? (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {purchase.invoice_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      ₹{purchase.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <button
                        onClick={() => handleDelete(purchase._id)}
                        className="text-red-600 hover:text-red-800 font-medium text-xs"
                      >
                        Delete
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
  );
}
