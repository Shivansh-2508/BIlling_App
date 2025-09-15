'use client';

import { useEffect, useState } from 'react';
import BackToHome from '@/components/BackToHome';
import { FileText, XCircle } from 'lucide-react';

interface SellerStatement {
  _id: string;
  seller_name: string;
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_unpaid: number;
}

export default function SellerStatementPage() {
  const [statements, setStatements] = useState<SellerStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const res = await fetch('http://localhost:5000/seller-statements', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.status === 401) {
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch seller statements');
        const data = await res.json();
        setStatements(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch seller statements';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 sm:p-3 rounded-lg sm:rounded-xl mr-3 sm:mr-4">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Seller Statement
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Overview of all sellers and their invoice status</p>
            </div>
          </div>
          <BackToHome />
        </div>
        {loading ? (
          <div className="flex justify-center p-8 sm:p-16">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-gray-600 text-sm sm:text-base">Loading seller statements...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl shadow-sm">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">{error}</p>
                <p className="text-xs sm:text-sm text-red-600 mt-1">Please ensure your API server is running at http://localhost:5000</p>
              </div>
            </div>
          </div>
        ) : statements.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">No seller statements found</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">No seller activity to display</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">Seller Name</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">Total Invoices</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">Paid</th>
                  <th className="px-4 py-3 text-left text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">Unpaid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {statements.map((s) => (
                  <tr key={s._id} className="hover:bg-gradient-to-r hover:from-blue-25 hover:to-indigo-25 transition-all duration-150">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800">{s.seller_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{s.total_invoices}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-emerald-700 font-bold">₹{s.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-green-700">₹{s.total_paid.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-amber-700">₹{s.total_unpaid.toFixed(2)}</td>
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
