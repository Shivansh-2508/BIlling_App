'use client';

import { useState } from 'react';
import BackToHome from '@/components/BackToHome';
import Link from 'next/link';

interface FinancialData {
  period: {
    start_date: string;
    end_date: string;
  };
  revenue: {
    total: number;
    paid: number;
    unpaid: number;
  };
  expenses: number;
  profit: {
    gross: number;
    margin_percentage: number;
  };
  invoice_count: number;
  purchase_count: number;
}

interface InventoryReport {
  total_products: number;
  total_inventory_value: number;
  low_stock_count: number;
  low_stock_items: Array<{
    product: string;
    stock: number;
  }>;
  products: Array<{
    _id: string;
    name: string;
    stock_quantity: number;
    default_rate_per_kg: number;
    inventory_value: number;
  }>;
}

export default function FinancialDashboard() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/financial-summary`;
      
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      const data = await response.json();
      setFinancialData(data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/inventory-report`);
      const data = await response.json();
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  const handleGenerateReport = () => {
    fetchFinancialData();
    fetchInventoryData();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <BackToHome />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Financial Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor profit, loss, revenue, and inventory in real-time</p>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        {financialData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Revenue Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                <p className="text-green-100 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">₹{financialData.revenue.total.toFixed(2)}</p>
                <div className="mt-4 text-xs space-y-1">
                  <p className="text-green-100">Paid: ₹{financialData.revenue.paid.toFixed(2)}</p>
                  <p className="text-green-100">Pending: ₹{financialData.revenue.unpaid.toFixed(2)}</p>
                </div>
              </div>

              {/* Expenses Card */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
                <p className="text-red-100 text-sm mb-1">Total Expenses</p>
                <p className="text-3xl font-bold">₹{financialData.expenses.toFixed(2)}</p>
                <div className="mt-4 text-xs space-y-1">
                  <p className="text-red-100">Purchases: {financialData.purchase_count}</p>
                  <p className="text-red-100">Avg: ₹{(financialData.expenses / (financialData.purchase_count || 1)).toFixed(2)}</p>
                </div>
              </div>

              {/* Profit Card */}
              <div className={`bg-gradient-to-br rounded-lg shadow p-6 text-white ${financialData.profit.gross >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'}`}>
                <p className={`text-sm mb-1 ${financialData.profit.gross >= 0 ? 'text-blue-100' : 'text-orange-100'}`}>
                  {financialData.profit.gross >= 0 ? 'Gross Profit' : 'Gross Loss'}
                </p>
                <p className="text-3xl font-bold">
                  {financialData.profit.gross >= 0 ? '+' : '-'}₹{Math.abs(financialData.profit.gross).toFixed(2)}
                </p>
                <div className="mt-4 text-xs space-y-1">
                  <p className={financialData.profit.gross >= 0 ? 'text-blue-100' : 'text-orange-100'}>
                    Margin: {financialData.profit.margin_percentage}%
                  </p>
                  <p className={financialData.profit.gross >= 0 ? 'text-blue-100' : 'text-orange-100'}>
                    Invoices: {financialData.invoice_count}
                  </p>
                </div>
              </div>

              {/* Net Cash Flow Card */}
              <div className={`bg-gradient-to-br rounded-lg shadow p-6 text-white ${(financialData.revenue.total - financialData.expenses) >= 0 ? 'from-purple-500 to-purple-600' : 'from-pink-500 to-pink-600'}`}>
                <p className={`text-sm mb-1 ${(financialData.revenue.total - financialData.expenses) >= 0 ? 'text-purple-100' : 'text-pink-100'}`}>
                  Net Cash Position
                </p>
                <p className="text-3xl font-bold">
                  ₹{(financialData.revenue.total - financialData.expenses).toFixed(2)}
                </p>
                <div className="mt-4 text-xs space-y-1">
                  <p className={financialData.revenue.total > 0 ? 'text-purple-100' : 'text-pink-100'}>
                    After expenses
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Summary Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Invoices Created</p>
                  <p className="text-2xl font-bold text-gray-900">{financialData.invoice_count}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Purchases Made</p>
                  <p className="text-2xl font-bold text-gray-900">{financialData.purchase_count}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Avg Invoice Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(financialData.revenue.total / (financialData.invoice_count || 1)).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Avg Purchase Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(financialData.expenses / (financialData.purchase_count || 1)).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Collections Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {financialData.revenue.total > 0 ? ((financialData.revenue.paid / financialData.revenue.total) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900">{financialData.profit.margin_percentage}%</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Inventory Report */}
        {inventoryData && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Inventory Status</h2>
            </div>

            {/* Inventory Summary */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-b">
              <div>
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{inventoryData.total_products}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">₹{inventoryData.total_inventory_value.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Low Stock Items</p>
                <p className={`text-2xl font-bold ${inventoryData.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {inventoryData.low_stock_count}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Avg Value/Product</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{(inventoryData.total_inventory_value / (inventoryData.total_products || 1)).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Low Stock Alert */}
            {inventoryData.low_stock_count > 0 && (
              <div className="p-6 bg-yellow-50 border-b">
                <h3 className="font-bold text-yellow-900 mb-3">⚠️ Low Stock Items</h3>
                <div className="space-y-2">
                  {inventoryData.low_stock_items.map((item, idx) => (
                    <p key={idx} className="text-sm text-yellow-800">
                      {item.product}: {item.stock} units
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Top 10 Products by Inventory Value */}
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Top Products by Inventory Value</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-gray-700 font-medium">Product</th>
                      <th className="text-right py-2 text-gray-700 font-medium">Stock</th>
                      <th className="text-right py-2 text-gray-700 font-medium">Rate</th>
                      <th className="text-right py-2 text-gray-700 font-medium">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.products
                      .sort((a, b) => b.inventory_value - a.inventory_value)
                      .slice(0, 10)
                      .map((product) => (
                        <tr key={product._id} className="border-b hover:bg-gray-50">
                          <td className="py-3">{product.name}</td>
                          <td className="text-right">{product.stock_quantity.toFixed(2)}</td>
                          <td className="text-right">₹{product.default_rate_per_kg.toFixed(2)}</td>
                          <td className="text-right font-medium">₹{product.inventory_value.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/invoices"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <p className="text-2xl font-bold text-blue-600 mb-2">📄</p>
            <p className="font-medium text-gray-900">View Invoices</p>
          </Link>
          <Link
            href="/purchases"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <p className="text-2xl font-bold text-orange-600 mb-2">🛒</p>
            <p className="font-medium text-gray-900">View Purchases</p>
          </Link>
          <Link
            href="/stock/update"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <p className="text-2xl font-bold text-purple-600 mb-2">📦</p>
            <p className="font-medium text-gray-900">Update Stock</p>
          </Link>
          <Link
            href="/statement"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <p className="text-2xl font-bold text-green-600 mb-2">📊</p>
            <p className="font-medium text-gray-900">View Statement</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
