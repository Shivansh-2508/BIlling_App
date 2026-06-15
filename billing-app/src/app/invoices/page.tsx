'use client';

import { useEffect, useState, useRef } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Download, Share2, FileText, Eye, Clock, CheckCircle2, XCircle, Trash2, CalendarDays, Archive } from 'lucide-react';
import BackToHome from '@/components/BackToHome';
import CreateInvoiceButton from '@/components/CreateInvoiceButton';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

interface Item {
  product_name: string;
  packing_qty: number;
  no_of_units: number;
  rate_per_kg: number;
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

const formatDate = (ds: string) => {
  if (!ds) return '';
  try {
    return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return ds;
  }
};

const formatFY = (fy: string) => {
  const parts = fy.split('-');
  if (parts.length === 2) return `FY ${parts[0]}–${parts[1].slice(2)}`;
  return fy;
};

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

const authHeaders = (): HeadersInit => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
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

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [currentFY, setCurrentFY] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const exportButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = new Date();
    const fy =
      now.getMonth() >= 3
        ? `${now.getFullYear()}-${now.getFullYear() + 1}`
        : `${now.getFullYear() - 1}-${now.getFullYear()}`;
    setCurrentFY(fy);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/invoices`, { headers: authHeaders() })
      .then(res => {
        if (res.status === 401) { window.location.href = '/login'; return Promise.reject(new Error('Unauthorized')); }
        if (!res.ok) throw new Error('Failed to fetch invoices');
        return res.json();
      })
      .then((data: Invoice[]) => {
        const extractNum = (no: string) => { const m = no.match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
        const sorted = data
          .map(normaliseInvoice)
          .sort((a, b) => extractNum(b.invoice_no) - extractNum(a.invoice_no));
        setInvoices(sorted);
        setLoading(false);
      })
      .catch(err => {
        if (err.message !== 'Unauthorized') {
          setError(err.message || 'Failed to fetch invoices');
          setLoading(false);
        }
      });
  }, []);

  const exportToPDF = async () => {
    if (!previewRef.current || !selectedInvoice) return;
    setPdfLoading(true);
    try {
      const invoiceContent = previewRef.current.innerHTML;
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
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${styles}<style>body{background:white;margin:20mm 10mm 20mm 10mm;}.print-area{background:white;padding:0;}</style></head><body><div class="print-area">${invoiceContent}</div></body></html>`;
      const res = await fetch(`${API}/export-invoice-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ html, file_name: `Invoice_${selectedInvoice.invoice_no}.pdf` }),
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${selectedInvoice.invoice_no}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('PDF export failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const shareAsPDF = async () => {
    if (!previewRef.current || !selectedInvoice) return;
    setPdfLoading(true);
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        const text = `Invoice #${selectedInvoice.invoice_no}\nBuyer: ${selectedInvoice.buyer_name}\nAmount: ₹${selectedInvoice.total_amount.toFixed(2)}\nDate: ${formatDate(selectedInvoice.date)}`;
        try { await navigator.share({ title: `Invoice #${selectedInvoice.invoice_no}`, text, url: window.location.href }); setPdfLoading(false); return; } catch {}
      }
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) { alert('Please allow popups to share PDF'); setPdfLoading(false); return; }
      let styles = '';
      Array.from(document.styleSheets).forEach(ss => {
        try {
          const s = ss as CSSStyleSheet;
          if (s.href) styles += `<link rel="stylesheet" href="${s.href}">`;
          else if (s.cssRules) { styles += '<style>'; Array.from(s.cssRules).forEach(r => { styles += (r as CSSStyleRule).cssText; }); styles += '</style>'; }
        } catch {}
      });
      const inv = selectedInvoice;
      const printHTML = `<!DOCTYPE html><html><head><title>Invoice_${inv.invoice_no}</title><meta charset="UTF-8">${styles}<style>@page{size:A4 portrait;margin:10mm;}body{background:white;}.share-buttons{position:fixed;top:10px;right:10px;z-index:1000;display:flex;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,.95);padding:10px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15);}.share-btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;text-decoration:none;display:inline-block;}.download-btn{background:#3b82f6;color:white;}.whatsapp-btn{background:#25d366;color:white;}.email-btn{background:#ef4444;color:white;}.close-btn{background:#6b7280;color:white;}@media print{.share-buttons{display:none!important;}}</style></head><body><div class="share-buttons"><button class="share-btn download-btn" onclick="document.querySelector('.share-buttons').style.display='none';setTimeout(()=>{window.print();setTimeout(()=>{document.querySelector('.share-buttons').style.display='flex';},1000);},100);">📥 Download PDF</button><a href="#" class="share-btn whatsapp-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent('Invoice #${inv.invoice_no} for ${inv.buyer_name}\\nAmount: ₹${inv.total_amount.toFixed(2)}\\nDate: ${formatDate(inv.date)}\\n\\nView: '+window.location.href),'_blank');return false;">📱 WhatsApp</a><a href="#" class="share-btn email-btn" onclick="window.location.href='mailto:?subject='+encodeURIComponent('Invoice #${inv.invoice_no}')+'&body='+encodeURIComponent('Invoice #${inv.invoice_no}\\nBuyer: ${inv.buyer_name}\\nAmount: ₹${inv.total_amount.toFixed(2)}');return false;">📧 Email</a><button class="share-btn close-btn" onclick="window.close()">✕ Close</button></div><div>${previewRef.current!.innerHTML}</div></body></html>`;
      printWindow.document.write(printHTML);
      printWindow.document.close();
    } catch {
      alert('PDF sharing failed. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string, invoiceNo: string) => {
    if (!window.confirm(`Delete Invoice #${invoiceNo}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed to delete'); }
      setInvoices(prev => prev.filter(i => i._id !== invoiceId));
      if (selectedInvoice?._id === invoiceId) setSelectedInvoice(null);
      alert(`Invoice #${invoiceNo} deleted.`);
    } catch (err: unknown) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Please try again.'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="flex items-center mb-3 sm:mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 sm:p-3 rounded-lg sm:rounded-xl mr-3 sm:mr-4">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Invoice Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and track all your invoices</p>
            </div>
          </div>

          {currentFY && (
            <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatFY(currentFY)}
              </span>
              <a
                href="/records"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-full text-xs font-medium transition-colors"
              >
                <Archive className="w-3 h-3" />
                View archived years
              </a>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
            <BackToHome />
            <CreateInvoiceButton />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8 sm:p-16">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-gray-600 text-sm sm:text-base">Loading invoices...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl shadow-sm">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm sm:text-base">{error}</p>
                <p className="text-xs sm:text-sm text-red-600 mt-1">Please ensure your API server is running at {API}</p>
              </div>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">No invoices for {currentFY ? formatFY(currentFY) : 'this financial year'}</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Create your first invoice to get started</p>
            <button onClick={() => { window.location.href = '/invoices/create'; }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base">
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-8 lg:flex-row">

            {/* Invoice List */}
            <div className="w-full lg:w-2/5">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-blue-100">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-semibold text-blue-900 text-base sm:text-lg flex items-center">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-blue-600" />
                      Invoice List
                    </h2>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                        {invoices.length} Total
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                        {invoices.filter(inv => inv.status === 'paid').length} Paid
                      </span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                  {invoices.map(inv => (
                    <div
                      key={inv._id}
                      className={`group p-3 sm:p-5 transition-all duration-200 cursor-pointer ${
                        selectedInvoice?._id === inv._id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-inner'
                          : 'hover:bg-gradient-to-r hover:from-blue-25 hover:to-indigo-25'
                      }`}
                      onClick={() => {
                        setSelectedInvoice(inv);
                        if (window.innerWidth <= 1024 && exportButtonsRef.current) {
                          setTimeout(() => exportButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-2">
                            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold inline-block w-fit">
                              #{inv.invoice_no}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md w-fit">{formatDate(inv.date)}</span>
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mb-2">
                            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{inv.buyer_name}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">{inv.items.length} items</span>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                              ₹{inv.total_amount.toFixed(2)}
                            </span>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {inv.status === 'paid' ? <><CheckCircle2 className="w-3 h-3" />Paid</> : <><Clock className="w-3 h-3" />Unpaid</>}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                          <button
                            className="text-blue-600 hover:text-blue-800 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                            onClick={e => { e.stopPropagation(); window.location.href = `/editInvoice?id=${inv._id}`; }}
                            title="Edit Invoice"
                          >
                            <FileText className="w-3 h-3" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            className="text-red-600 hover:text-red-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                            onClick={async e => { e.stopPropagation(); await deleteInvoice(inv._id, inv.invoice_no); }}
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                          {inv.status !== 'paid' && (
                            <button
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-xs font-medium transition-all shadow-sm"
                              onClick={async e => {
                                e.stopPropagation();
                                await fetch(`${API}/invoices/${inv._id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...authHeaders() },
                                  body: JSON.stringify({ status: 'paid' }),
                                });
                                setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'paid' } : i));
                                if (selectedInvoice?._id === inv._id) setSelectedInvoice({ ...inv, status: 'paid' });
                              }}
                            >
                              <span className="hidden sm:inline">Mark as Paid</span>
                              <span className="sm:hidden">Paid</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice Preview */}
            <div className="w-full lg:w-3/5">
              {selectedInvoice ? (
                <div className="bg-white shadow rounded-lg">
                  <div ref={exportButtonsRef} className="bg-gray-50 px-3 py-2 sm:px-4 sm:py-3 border-b flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center sm:gap-3">
                    <h2 className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                      <Eye className="w-4 h-4 mr-2" /> Invoice Preview
                    </h2>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
                      <button onClick={exportToPDF} disabled={pdfLoading}
                        className={`flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 ${pdfLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs sm:text-sm rounded-lg transition-all font-medium`}>
                        {pdfLoading ? <><span className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>Processing...</> : <><Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />Export to PDF</>}
                      </button>
                      <button onClick={shareAsPDF} disabled={pdfLoading}
                        className={`flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 ${pdfLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white text-xs sm:text-sm rounded-lg transition-all font-medium`}>
                        {pdfLoading ? <><span className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>Processing...</> : <><Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />Share as PDF</>}
                      </button>
                    </div>
                  </div>
                  <div className="p-2 sm:p-4 bg-white print:bg-white" ref={previewRef}>
                    <InvoicePreview form={selectedInvoice} />
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl p-8 sm:p-12 text-center h-full flex items-center justify-center">
                  <div className="text-gray-500">
                    <div className="bg-gray-100 rounded-full p-4 sm:p-6 w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                      <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">No Invoice Selected</h3>
                    <p className="text-sm sm:text-base text-gray-500">Click on any invoice from the list to preview it here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
