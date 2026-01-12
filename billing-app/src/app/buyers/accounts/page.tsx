"use client";
import { useState, useEffect } from "react";
import { Eye, Loader2, AlertCircle, CheckCircle, Search, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";

interface BuyerAccount {
  buyerId: string;
  buyerName: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  invoiceCount: number;
  paymentCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BuyerAccountsPage() {
  const [accounts, setAccounts] = useState<BuyerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "due" | "paid" | "overpaid">("all");

  const fetchAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/buyer-accounts`);
      if (!res.ok) throw new Error("Failed to fetch accounts.");
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      setError("Failed to load buyer accounts.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Filter accounts based on search and status
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch = account.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "due") return matchesSearch && account.balance > 0;
    if (filterStatus === "paid") return matchesSearch && account.balance === 0;
    if (filterStatus === "overpaid") return matchesSearch && account.balance < 0;
    return matchesSearch;
  });

  const totalBilled = filteredAccounts.reduce((sum, acc) => sum + acc.totalInvoiced, 0);
  const totalCollected = filteredAccounts.reduce((sum, acc) => sum + acc.totalPaid, 0);
  const totalDue = filteredAccounts.reduce((sum, acc) => sum + Math.max(0, acc.balance), 0);

  const getStatusBadge = (balance: number) => {
    if (balance > 0)
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Due: ₹{balance}</span>;
    if (balance < 0)
      return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Overpaid: ₹{Math.abs(balance)}</span>;
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Settled</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buyer Accounts</h1>
          <p className="text-sm sm:text-base text-gray-600">Track invoices, payments, and account balances</p>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 flex items-start gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Invoiced</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{totalBilled.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Collected</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{totalCollected.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Due</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{totalDue.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Accounts</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredAccounts.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-purple-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search buyer name..."
                className="pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-full text-sm sm:text-base placeholder:text-gray-500 text-gray-900"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "due", "paid", "overpaid"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status as any)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                    filterStatus === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 mb-3 sm:mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Loading accounts...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-900 px-4">
              <p className="text-base sm:text-lg font-medium mb-2 text-center">No accounts found</p>
              <p className="text-xs sm:text-sm text-center">Try a different search or status filter</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredAccounts.map((account) => (
                    <div key={account.buyerId} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{account.buyerName}</p>
                          <p className="text-xs text-gray-500 mt-1">{account.invoiceCount} invoices • {account.paymentCount} payments</p>
                        </div>
                        {getStatusBadge(account.balance)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-gray-600">Billed</p>
                          <p className="font-semibold text-gray-900">₹{account.totalInvoiced}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-gray-600">Paid</p>
                          <p className="font-semibold text-gray-900">₹{account.totalPaid}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-gray-600">Balance</p>
                          <p className={`font-semibold ${account.balance > 0 ? "text-red-600" : account.balance < 0 ? "text-blue-600" : "text-green-600"}`}>
                            ₹{account.balance}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/buyers/${account.buyerId}/ledger`}
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View Ledger
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Buyer Name</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Invoiced</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Paid</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Balance</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Transactions</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAccounts.map((account) => (
                      <tr key={account.buyerId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.buyerName}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">₹{account.totalInvoiced.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">₹{account.totalPaid.toFixed(2)}</td>
                        <td className={`px-6 py-4 text-sm text-right font-semibold ${account.balance > 0 ? "text-red-600" : account.balance < 0 ? "text-blue-600" : "text-green-600"}`}>
                          ₹{account.balance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(account.balance)}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">
                          {account.invoiceCount} inv • {account.paymentCount} pay
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/buyers/${account.buyerId}/ledger`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                          >
                            <Eye className="w-4 h-4" /> View Ledger
                          </Link>
                        </td>
                      </tr>
                    ))}
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
