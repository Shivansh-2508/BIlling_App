'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview';
import {
  Archive, Download, Share2, FileText, Eye,
  CheckCircle2, Clock, Search, SlidersHorizontal, X,
  ChevronDown, ChevronRight, ChevronLeft, CalendarDays, AlertCircle,
} from 'lucide-react';
import BackToHome from '@/components/BackToHome';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
const PAGE_SIZE = 15;

interface Item {
  product_name: string;
  packing_qty: number;
  no_of_units: number;
  rate_per_kg: number;
  hsn_code?: string;
}

interface Invoice {
  _id: string;
  invoice_no: string;
  date: string;
  buyer_name: string;
  address: string;
  gstin: string;
  items: Item[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total_amount: number;
  status?: 'paid' | 'unpaid';
  financial_year?: string;
}

interface Filters {
  financial_year: string;
  start_date: string;
  end_date: string;
  month: string;
  invoice_no: string;
  buyer_name: string;
}

const EMPTY_FILTERS: Filters = {
  financial_year: '',
  start_date: '',
  end_date: '',
  month: '',
  invoice_no: '',
  buyer_name: '',
};

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const formatDate = (ds: string) => {
  if (!ds) return '';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return ds;
  }
};

const formatFY = (fy: string) => {
  const parts = fy.split('-');
  if (parts.length === 2) return `FY ${parts[0]}–${parts[1].slice(2)}`;
  return fy;
};

const normaliseInvoice = (inv: Invoice): Invoice => ({
  ...inv,
  date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
  subtotal: Number(inv.subtotal || 0),
  cgst: Number(inv.cgst || 0),
  sgst: Number(inv.sgst || 0),
  total_amount: Number(inv.total_amount || 0),
  items: (inv.items || []).map(item => ({
    ...item,
    packing_qty: Number(item.packing_qty || 0),
    no_of_units: Number(item.no_of_units || 0),
    rate_per_kg: Number(item.rate_per_kg || 0),
  })),
});

export default function RecordsPage() {
  const [availableFYs, setAvailableFYs] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [records, setRecords] = useState<Invoice[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Invoice[]>>({});
  const [expandedFYs, setExpandedFYs] = useState<Set<string>>(new Set());
  const [fyPages, setFyPages] = useState<Record<string, number>>({});
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/records/financial-years`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((fys: string[]) => {
        setAvailableFYs(fys);
        setExpandedFYs(new Set(fys));
      })
      .catch(() => {});
  }, []);

  const fetchRecords = useCallback(async (f: Filters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      (Object.entries(f) as [keyof Filters, string][]).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const res = await fetch(`${API}/records?${params}`, { headers: authHeaders() });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      const formatted: Invoice[] = (data.records || []).map(normaliseInvoice);
      setRecords(formatted);
      const g: Record<string, Invoice[]> = {};
      formatted.forEach(inv => {
        const fy = inv.financial_year || 'Unknown';
        (g[fy] = g[fy] || []).push(inv);
      });
      setGrouped(g);
      setFyPages({});
    } catch {
      setError('Failed to load records. Please ensure the API server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(EMPTY_FILTERS); }, [fetchRecords]);

  const { financial_year, start_date, end_date, month } = filters;
  useEffect(() => {
    fetchRecords(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financial_year, start_date, end_date, month]);

  const { invoice_no, buyer_name } = filters;
  useEffect(() => {
    const t = setTimeout(() => fetchRecords(filters), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice_no, buyer_name]);

  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchRecords(EMPTY_FILTERS);
  };

  const toggleFY = (fy: string) =>
    setExpandedFYs(prev => {
      const next = new Set(prev);
      if (next.has(fy)) next.delete(fy); else next.add(fy);
      return next;
    });

  const getPage = (fy: string) => fyPages[fy] ?? 1;
  const setPage = (fy: string, page: number) =>
    setFyPages(prev => ({ ...prev, [fy]: page }));

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const totalAmount = records.reduce((s, inv) => s + inv.total_amount, 0);
  const paidCount = records.filter(inv => inv.status === 'paid').length;
  const fyCount = Object.keys(grouped).length;

  const buildStylesHTML = () => {
    let styles = '';
    Array.from(document.styleSheets).forEach(ss => {
      try {
        const s = ss as CSSStyleSheet;
        if (s.href) styles += `<link rel="stylesheet" href="${s.href}">`;
        else if (s.cssRules) {
          styles += '<style>';
          Array.from(s.cssRules).forEach(r => { styles += (r as CSSStyleRule).cssText; });
          styles += '</style>';
        }
      } catch {}
    });
    return styles;
  };

  const exportToPDF = async () => {
    if (!previewRef.current || !selectedInvoice) return;
    setPdfLoading(true);
    try {
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">${buildStylesHTML()}<style>body{background:white;margin:20mm 10mm 20mm 10mm;}</style></head><body><div>${previewRef.current.innerHTML}</div></body></html>`;
      const res = await fetch(`${API}/export-invoice-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ html, file_name: `Invoice_${selectedInvoice.invoice_no}.pdf` }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Invoice_${selectedInvoice.invoice_no}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { alert('PDF export failed. Please try again.'); }
    finally { setPdfLoading(false); }
  };

  const shareAsPDF = async () => {
    if (!previewRef.current || !selectedInvoice) return;
    setPdfLoading(true);
    try {
      const inv = selectedInvoice;
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && navigator.share) {
        try {
          await navigator.share({
            title: `Invoice #${inv.invoice_no}`,
            text: `Invoice #${inv.invoice_no}\nBuyer: ${inv.buyer_name}\nAmount: ₹${inv.total_amount.toFixed(2)}`,
            url: window.location.href,
          });
          return;
        } catch {}
      }
      const pw = window.open('', '_blank', 'width=800,height=600');
      if (!pw) { alert('Please allow popups to share.'); return; }
      pw.document.write(`<!DOCTYPE html><html><head><title>Invoice_${inv.invoice_no}</title><meta charset="UTF-8">${buildStylesHTML()}<style>@page{size:A4 portrait;margin:10mm;}body{background:white;}.share-buttons{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:8px;background:rgba(255,255,255,.95);padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);}.btn{padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;text-decoration:none;display:inline-block;}.dl{background:#3b82f6;color:#fff;}.wa{background:#25d366;color:#fff;}.em{background:#ef4444;color:#fff;}.cl{background:#6b7280;color:#fff;}@media print{.share-buttons{display:none!important;}}</style></head><body><div class="share-buttons"><button class="btn dl" onclick="document.querySelector('.share-buttons').style.display='none';setTimeout(()=>{window.print();setTimeout(()=>{document.querySelector('.share-buttons').style.display='flex';},1000);},100);">📥 Download</button><a class="btn wa" href="#" onclick="window.open('https://wa.me/?text='+encodeURIComponent('Invoice #${inv.invoice_no}\\nBuyer: ${inv.buyer_name}\\nAmount: ₹${inv.total_amount.toFixed(2)}'),'_blank');return false;">📱 WhatsApp</a><a class="btn em" href="#" onclick="window.location.href='mailto:?subject='+encodeURIComponent('Invoice #${inv.invoice_no}')+'&body='+encodeURIComponent('Invoice #${inv.invoice_no}\\nBuyer: ${inv.buyer_name}\\nAmount: ₹${inv.total_amount.toFixed(2)}');return false;">📧 Email</a><button class="btn cl" onclick="window.close()">✕ Close</button></div><div>${previewRef.current!.innerHTML}</div></body></html>`);
      pw.document.close();
    } catch { alert('PDF sharing failed.'); }
    finally { setPdfLoading(false); }
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Financial Year</label>
        <select
          value={filters.financial_year}
          onChange={e => { updateFilter('financial_year', e.target.value); setFiltersOpen(false); }}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          <option value="">All archived years</option>
          {availableFYs.map(fy => (
            <option key={fy} value={fy}>{formatFY(fy)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
        <input
          type="month"
          value={filters.month}
          onChange={e => updateFilter('month', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date Range</label>
        <div className="space-y-2">
          <input type="date" value={filters.start_date} onChange={e => updateFilter('start_date', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <input type="date" value={filters.end_date} onChange={e => updateFilter('end_date', e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Invoice No.</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={filters.invoice_no} onChange={e => updateFilter('invoice_no', e.target.value)}
            placeholder="Search by number…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Buyer</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input type="text" value={filters.buyer_name} onChange={e => updateFilter('buyer_name', e.target.value)}
            placeholder="Search by buyer…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
      </div>

      {!loading && (
        <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
          {records.length} result{records.length !== 1 ? 's' : ''} found
        </p>
      )}
    </div>
  );

  const PreviewActionButtons = () => (
    <div className="flex gap-2">
      <button
        onClick={exportToPDF}
        disabled={pdfLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
          pdfLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
        }`}
      >
        {pdfLoading
          ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          : <Download className="w-3.5 h-3.5" />}
        Export PDF
      </button>
      <button
        onClick={shareAsPDF}
        disabled={pdfLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
          pdfLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
        }`}
      >
        {pdfLoading
          ? <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          : <Share2 className="w-3.5 h-3.5" />}
        Share
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:py-8">

        {/* Page header */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-blue-600 p-2.5 sm:p-3 rounded-xl shadow-md">
              <Archive className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 leading-tight">Records</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Archived invoices from previous financial years</p>
            </div>
          </div>

          {records.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <FileText className="w-3 h-3" />
                {records.length} invoice{records.length !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {paidCount} paid
              </span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium">
                <CalendarDays className="w-3 h-3" />
                {fyCount} year{fyCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <div className="flex flex-row items-center justify-between gap-2">
            <BackToHome />
            <a
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-xs font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Current Year </span>Invoices
            </a>
          </div>
        </div>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">

          {/* Filter sidebar */}
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0">
            <button
              onClick={() => setFiltersOpen(f => !f)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm mb-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </span>
              {filtersOpen
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 lg:sticky lg:top-20">
                <FilterPanel />
              </div>
            </div>
          </div>

          {/* Content: list + preview */}
          <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-4 sm:gap-6">

            {/* Invoice accordion list */}
            <div className="w-full xl:w-2/5">
              <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto space-y-3 pr-0.5">
              {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm text-gray-500">Loading records…</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              ) : records.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <Archive className="w-7 h-7 text-indigo-300" />
                  </div>
                  <p className="font-semibold text-gray-700 mb-1 text-sm sm:text-base">No archived records found</p>
                  <p className="text-xs sm:text-sm text-gray-400 max-w-xs">
                    {hasActiveFilters
                      ? 'No invoices match your current filters.'
                      : 'Previous financial year invoices will appear here once the year ends.'}
                  </p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-4 text-sm text-indigo-600 underline hover:text-indigo-800 transition">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                Object.entries(grouped)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([fy, fyInvoices]) => {
                    const fyTotal = fyInvoices.reduce((s, inv) => s + inv.total_amount, 0);
                    const fyPaid = fyInvoices.filter(inv => inv.status === 'paid').length;
                    const isExpanded = expandedFYs.has(fy);
                    const page = getPage(fy);
                    const totalPages = Math.ceil(fyInvoices.length / PAGE_SIZE);
                    const pageInvoices = fyInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

                    return (
                      <div key={fy} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                        {/* FY accordion header */}
                        <button
                          onClick={() => toggleFY(fy)}
                          className="w-full flex items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-b border-blue-100 transition-colors overflow-hidden"
                        >
                          {/* Left: icon + FY name + count */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Archive className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="font-bold text-gray-800 text-sm truncate">{formatFY(fy)}</span>
                            <span className="flex-shrink-0 bg-indigo-100 text-indigo-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                              {fyInvoices.length}
                            </span>
                          </div>
                          {/* Right: totals + chevron */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-[11px] font-bold text-gray-700 tabular-nums leading-tight">
                                ₹{fyTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </p>
                              <p className="text-[10px] text-gray-400 leading-tight tabular-nums">
                                {fyPaid}/{fyInvoices.length} paid
                              </p>
                            </div>
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <>
                            <div className="divide-y divide-gray-100">
                              {pageInvoices.map(inv => (
                                <div
                                  key={inv._id}
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowMobilePreview(true);
                                  }}
                                  className={`group p-3 sm:p-5 transition-all duration-200 cursor-pointer ${
                                    selectedInvoice?._id === inv._id
                                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-inner'
                                      : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      {/* Invoice number + date */}
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
                                        <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold inline-block w-fit">
                                          #{inv.invoice_no}
                                        </span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md w-fit">
                                          {formatDate(inv.date)}
                                        </span>
                                      </div>
                                      {/* Buyer name + items */}
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mb-2">
                                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{inv.buyer_name}</h3>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                                          {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      {/* Amount + status */}
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                                          ₹{inv.total_amount.toFixed(2)}
                                        </span>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit ${
                                          inv.status === 'paid'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                          {inv.status === 'paid'
                                            ? <><CheckCircle2 className="w-3 h-3" />Paid</>
                                            : <><Clock className="w-3 h-3" />Unpaid</>}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: view action */}
                                    <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                                      <button
                                        className="text-blue-600 hover:text-blue-800 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                                        onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); setShowMobilePreview(true); }}
                                        title="View Invoice"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span className="hidden sm:inline">View</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Per-FY pagination controls */}
                            {totalPages > 1 && (
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <button
                                  disabled={page === 1}
                                  onClick={() => setPage(fy, page - 1)}
                                  className="flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                </button>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 font-semibold">Page {page} of {totalPages}</p>
                                  <p className="text-[10px] text-gray-400">{fyInvoices.length} total</p>
                                </div>
                                <button
                                  disabled={page === totalPages}
                                  onClick={() => setPage(fy, page + 1)}
                                  className="flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95"
                                >
                                  Next <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
              )}
              </div>
            </div>

            {/* Invoice preview */}

            {/* Mobile backdrop (tap to close) */}
            {selectedInvoice && showMobilePreview && (
              <div
                className="xl:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowMobilePreview(false)}
              />
            )}

            {/*
              Single preview panel:
              - Mobile: full-screen overlay (fixed inset-0 z-50) when showMobilePreview
              - Mobile hidden when no invoice selected or dismissed
              - Desktop: always visible as sticky sidebar (xl:static)
            */}
            <div
              className={`w-full xl:w-3/5 ${
                selectedInvoice && showMobilePreview
                  ? 'fixed inset-0 z-50 xl:static xl:inset-auto'
                  : 'hidden xl:block'
              }`}
            >
              {selectedInvoice ? (
                <div className="bg-white rounded-none xl:rounded-xl border-0 xl:border border-gray-200 shadow-none xl:shadow-sm overflow-hidden xl:sticky xl:top-20 flex flex-col h-full xl:h-auto">
                  {/* Preview header */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Close button — mobile only */}
                      <button
                        onClick={() => setShowMobilePreview(false)}
                        className="xl:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
                        aria-label="Close preview"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                        <Eye className="w-4 h-4 text-gray-400" />
                        Preview
                      </span>
                      {selectedInvoice.financial_year && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          <CalendarDays className="w-3 h-3" />
                          {formatFY(selectedInvoice.financial_year)}
                        </span>
                      )}
                    </div>
                    <PreviewActionButtons />
                  </div>

                  {/* Scrollable invoice content */}
                  <div className="overflow-y-auto flex-1 xl:overflow-visible">
                    <div className="p-3 sm:p-4 overflow-x-auto" ref={previewRef}>
                      <div className="min-w-[320px]">
                        <InvoicePreview form={selectedInvoice} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 flex flex-col items-center justify-center text-center min-h-64 xl:sticky xl:top-20">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                    <Eye className="w-7 h-7 text-indigo-300" />
                  </div>
                  <p className="font-semibold text-gray-600 mb-1">No invoice selected</p>
                  <p className="text-sm text-gray-400">Click any invoice from the list to preview it here</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
