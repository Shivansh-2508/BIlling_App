"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Loader2, AlertCircle, CheckCircle, Download, Calendar, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Transaction {
  date: string;
  type: "invoice" | "payment";
  invoiceNumber?: string;
  description: string;
  amount: number;
  reference?: string;
  image?: string;
}

interface BuyerLedger {
  buyerId: string;
  buyerName: string;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  transactions: Transaction[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BuyerLedgerPage() {
  const params = useParams();
  const buyerId = params.buyerId as string;

  const [ledger, setLedger] = useState<BuyerLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: "", amount: "", reference: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchLedger = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/buyer-accounts/${buyerId}`);
      if (!res.ok) throw new Error("Failed to fetch ledger.");
      const data = await res.json();
      setLedger(data);
    } catch (err) {
      setError("Failed to load buyer ledger.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (buyerId) {
      fetchLedger();
    }
  }, [buyerId]);

  const handleAddPayment = async () => {
    if (!paymentForm.date || !paymentForm.amount) {
      setError("Date and amount are mandatory.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("date", paymentForm.date);
      formData.append("amount", paymentForm.amount);
      formData.append("reference", paymentForm.reference);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch(`${API_BASE}/buyer-accounts/${buyerId}/payment`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to add payment.");
      setSuccess("Payment recorded successfully!");
      setPaymentForm({ date: "", amount: "", reference: "" });
      setImagePreview(null);
      setImageFile(null);
      setShowPaymentForm(false);
      fetchLedger();
    } catch {
      setError("Failed to record payment.");
    }
    setSaving(false);
  };

  const filteredTransactions = ledger?.transactions.filter((transaction) => {
    if (fromDate && new Date(transaction.date) < new Date(fromDate)) return false;
    if (toDate && new Date(transaction.date) > new Date(toDate)) return false;
    return true;
  }) || [];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading ledger...</p>
        </div>
      </div>
    );
  }

  if (!ledger) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/buyers/accounts" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Accounts
          </Link>
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">Buyer not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/buyers/accounts" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 text-sm sm:text-base">
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{ledger.buyerName}</h1>
          <p className="text-sm sm:text-base text-gray-600">Account ledger and transaction history</p>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Invoiced</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{ledger.totalInvoiced.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Paid</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">₹{ledger.totalPaid.toFixed(2)}</p>
          </div>
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 ${ledger.balance > 0 ? "border-red-200 bg-red-50" : ledger.balance < 0 ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}`}>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Balance</p>
            <p className={`text-2xl sm:text-3xl font-bold ${ledger.balance > 0 ? "text-red-600" : ledger.balance < 0 ? "text-blue-600" : "text-green-600"}`}>
              {ledger.balance > 0 ? "Due: " : ledger.balance < 0 ? "Overpaid: " : ""}₹{Math.abs(ledger.balance).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Add Payment Button and Date Filters */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 font-medium shadow-sm flex items-center justify-center gap-2 text-sm sm:text-base transition-all"
              >
                <Plus className="w-4 h-4" /> Record Payment
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-300 font-medium flex items-center justify-center gap-2 text-sm sm:text-base transition-all"
              >
                <Download className="w-4 h-4" /> Print Ledger
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-3 text-sm sm:text-base">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-blue-200 bg-blue-50 p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm sm:text-base placeholder:text-gray-500"
                    placeholder="Enter payment amount"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Reference (Cheque/UPI/etc)</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm sm:text-base placeholder:text-gray-500"
                  placeholder="e.g., CHQ-123456 or UPI-txn-id"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Upload Proof (Optional)</label>
                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <div className="flex flex-col items-center justify-center text-center">
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Click to upload payment proof</p>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleImageUpload}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-gray-300">
                      <img
                        src={imagePreview}
                        alt="Payment proof preview"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm transition-all"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={saving}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Ledger */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Transaction History ({filteredTransactions.length})</h3>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-900 px-4">
              <p className="text-base sm:text-lg font-medium mb-2">No transactions found</p>
              <p className="text-xs sm:text-sm text-center">No invoices or payments matching the date range</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden">
                <div className="divide-y divide-gray-200">
                  {filteredTransactions.map((txn, idx) => (
                    <div key={idx} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${txn.type === "invoice" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                              {txn.type === "invoice" ? "Invoice" : "Payment"}
                            </span>
                            {txn.invoiceNumber && <span className="text-xs text-gray-600">#{txn.invoiceNumber}</span>}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{new Date(txn.date).toLocaleDateString()}</p>
                          {txn.reference && <p className="text-xs text-gray-500">{txn.reference}</p>}
                        </div>
                        <p className={`text-sm font-semibold ${txn.type === "invoice" ? "text-red-600" : "text-green-600"}`}>
                          {txn.type === "invoice" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600">{txn.description}</p>
                      {txn.image && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={txn.image}
                            alt="Payment proof"
                            className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(txn.image, "_blank")}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Reference</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Proof</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((txn, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">{new Date(txn.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${txn.type === "invoice" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                            {txn.type === "invoice" ? "Invoice" : "Payment"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{txn.description} {txn.invoiceNumber && `(#${txn.invoiceNumber})`}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{txn.reference || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          {txn.image ? (
                            <button
                              onClick={() => window.open(txn.image, "_blank")}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold text-right ${txn.type === "invoice" ? "text-red-600" : "text-green-600"}`}>
                          {txn.type === "invoice" ? "+" : "-"}₹{txn.amount.toFixed(2)}
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
