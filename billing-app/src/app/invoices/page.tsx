'use client';

import { useEffect, useState, useRef } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Download, Share2, FileText, Eye, Clock, CheckCircle2, XCircle } from 'lucide-react';
import BackToHome from '@/components/BackToHome';
import CreateInvoiceButton from '@/components/CreateInvoiceButton';

// Item structure - matching what's used in CreateInvoicePage
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
}

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch('https://billing-app-onzk.onrender.com/invoices')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch invoices');
        }
        return res.json();
      })
      .then((data) => {
        // Format dates and ensure numeric fields are properly typed
        const formattedInvoices = data.map((inv: Invoice) => ({
          ...inv,
          date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
          subtotal: Number(inv.subtotal || 0),
          cgst: Number(inv.cgst || 0),
          sgst: Number(inv.sgst || 0),
          total_amount: Number(inv.total_amount || 0),
          items: inv.items.map(item => ({
            ...item,
            packing_qty: Number(item.packing_qty || 0),
            no_of_units: Number(item.no_of_units || 0),
            rate_per_kg: Number(item.rate_per_kg || 0)
          }))
        }));
        setInvoices(formattedInvoices);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching invoices:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedInvoice && previewRef.current) {
      const timer = setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.style.opacity = '0.99';
          setTimeout(() => {
            if (previewRef.current) {
              previewRef.current.style.opacity = '1';
            }
          }, 10);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedInvoice]);

  // Export to PDF (Direct Download) - keeps original InvoicePreview UI
  const exportToPDF = async () => {
  if (!previewRef.current || !selectedInvoice) return;
  setPdfLoading(true);

  try {
    // 1. Get the HTML of the invoice preview (with styles)
    const invoiceContent = previewRef.current.innerHTML;

    // 2. Collect all stylesheets as <style> tags
    let styles = '';
    Array.from(document.styleSheets).forEach((styleSheet: any) => {
      try {
        if (styleSheet.href) {
          styles += `<link rel="stylesheet" href="${styleSheet.href}">`;
        } else if (styleSheet.cssRules) {
          styles += '<style>';
          Array.from(styleSheet.cssRules).forEach((rule: any) => {
            styles += rule.cssText;
          });
          styles += '</style>';
        }
      } catch (e) {
        // Ignore CORS issues
      }
    });

    // 3. Build full HTML for PDF rendering
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${styles}
          <style>
            body { background: white; margin: 0; }
            .print-area { background: white; padding: 0; }
          </style>
        </head>
        <body>
          <div class="print-area">${invoiceContent}</div>
        </body>
      </html>
    `;

    // 4. Send to backend for PDF generation
    const response = await fetch('https://billing-app-onzk.onrender.com/export-invoice-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        file_name: `Invoice_${selectedInvoice.invoice_no}.pdf`
      }),
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    // 5. Download the PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${selectedInvoice.invoice_no}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (err) {
    alert('PDF export failed. Please try again.');
    console.error(err);
  } finally {
    setPdfLoading(false);
  }
};

  // Share as PDF (opens a new window with share/download options, keeps original InvoicePreview UI)
  const shareAsPDF = async () => {
    if (!previewRef.current || !selectedInvoice) return;

    try {
      setPdfLoading(true);

      // Mobile native share (text only, as PDF is not available without jsPDF)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        const invoiceText = `Invoice #${selectedInvoice.invoice_no}\nBuyer: ${selectedInvoice.buyer_name}\nAmount: ₹${selectedInvoice.total_amount.toFixed(2)}\nDate: ${formatDate(selectedInvoice.date)}`;
        try {
          await navigator.share({
            title: `Invoice #${selectedInvoice.invoice_no}`,
            text: invoiceText,
            url: window.location.href
          });
          setPdfLoading(false);
          return;
        } catch (shareError) {
          // fallback to share window
        }
      }

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('Please allow popups to share PDF');
        setPdfLoading(false);
        return;
      }

      const invoiceContent = previewRef.current.innerHTML;
      const fileName = `Invoice_${selectedInvoice.invoice_no}`;

      // Copy all stylesheets from the main document
      let styles = '';
      Array.from(document.styleSheets).forEach((styleSheet: any) => {
        try {
          if (styleSheet.href) {
            styles += `<link rel="stylesheet" href="${styleSheet.href}">`;
          } else if (styleSheet.cssRules) {
            styles += '<style>';
            Array.from(styleSheet.cssRules).forEach((rule: any) => {
              styles += rule.cssText;
            });
            styles += '</style>';
          }
        } catch (e) {}
      });

      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${fileName}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${styles}
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { background: white; }
              .print-area { background: white; padding: 0; }
              .share-buttons {
                position: fixed; top: 10px; right: 10px; z-index: 1000;
                display: flex; gap: 10px; flex-wrap: wrap;
                background: rgba(255,255,255,0.95); padding: 10px; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }
              .share-btn {
                padding: 8px 16px; border: none; border-radius: 6px;
                cursor: pointer; font-size: 12px; font-weight: bold;
                transition: all 0.2s; text-decoration: none; display: inline-block;
              }
              .download-btn { background: #3b82f6; color: white; }
              .download-btn:hover { background: #2563eb; }
              .whatsapp-btn { background: #25d366; color: white; }
              .whatsapp-btn:hover { background: #128c7e; }
              .email-btn { background: #ef4444; color: white; }
              .email-btn:hover { background: #dc2626; }
              .telegram-btn { background: #0088cc; color: white; }
              .telegram-btn:hover { background: #006ba6; }
              .close-btn { background: #6b7280; color: white; }
              .close-btn:hover { background: #4b5563; }
              @media print { .share-buttons { display: none !important; } }
              @media (max-width: 600px) {
                .share-buttons { position: relative; margin-bottom: 20px; top: auto; right: auto; width: 100%; }
                .share-btn { width: calc(50% - 5px); margin-bottom: 5px; text-align: center; }
              }
            </style>
          </head>
          <body>
            <div class="share-buttons">
              <button class="share-btn download-btn" onclick="downloadPDF()">📥 Download PDF</button>
              <a href="#" class="share-btn whatsapp-btn" onclick="shareWhatsApp(); return false;">📱 WhatsApp</a>
              <a href="#" class="share-btn email-btn" onclick="shareEmail(); return false;">📧 Email</a>
              <a href="#" class="share-btn telegram-btn" onclick="shareTelegram(); return false;">✈️ Telegram</a>
              <button class="share-btn close-btn" onclick="window.close()">✕ Close</button>
            </div>
            <div class="print-area">${invoiceContent}</div>
            <script>
              function downloadPDF() {
                document.querySelector('.share-buttons').style.display = 'none';
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    document.querySelector('.share-buttons').style.display = 'flex';
                  }, 1000);
                }, 100);
              }
              function shareWhatsApp() {
                const text = encodeURIComponent('Invoice #${selectedInvoice.invoice_no} for ${selectedInvoice.buyer_name}\\nAmount: ₹${selectedInvoice.total_amount.toFixed(2)}\\nDate: ${formatDate(selectedInvoice.date)}\\n\\nView details: ' + window.location.href);
                const url = 'https://wa.me/?text=' + text;
                window.open(url, '_blank');
              }
              function shareEmail() {
                const subject = encodeURIComponent('Invoice #${selectedInvoice.invoice_no} - ${selectedInvoice.buyer_name}');
                const body = encodeURIComponent('Dear Sir/Madam,\\n\\nPlease find the invoice details below:\\n\\nInvoice #${selectedInvoice.invoice_no}\\nBuyer: ${selectedInvoice.buyer_name}\\nAmount: ₹${selectedInvoice.total_amount.toFixed(2)}\\nDate: ${formatDate(selectedInvoice.date)}\\n\\nTo download the PDF, please visit: ' + window.location.href + '\\n\\nBest regards');
                const url = 'mailto:?subject=' + subject + '&body=' + body;
                window.location.href = url;
              }
              function shareTelegram() {
                const text = encodeURIComponent('Invoice #${selectedInvoice.invoice_no} for ${selectedInvoice.buyer_name}\\nAmount: ₹${selectedInvoice.total_amount.toFixed(2)}\\nDate: ${formatDate(selectedInvoice.date)}\\n\\nView: ' + window.location.href);
                const url = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + text;
                window.open(url, '_blank');
              }
              window.onload = function() {
                if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                  document.body.style.padding = '10px';
                  const buttons = document.querySelector('.share-buttons');
                  buttons.style.position = 'relative';
                  buttons.style.marginBottom = '20px';
                }
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      setPdfLoading(false);

    } catch (err) {
      console.error("Error in PDF sharing:", err);
      setPdfLoading(false);
      alert("PDF sharing failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Invoice Management
              </h1>
              <p className="text-gray-600 mt-1">Manage and track all your invoices</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <BackToHome />
            <CreateInvoiceButton />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <p className="text-gray-600">Loading invoices...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
            <div className="flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-red-600 mt-1">Please ensure your API server is running at https://billing-app-onzk.onrender.com</p>
              </div>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-12 text-center">
            <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">No invoices found</h3>
            <p className="text-gray-600 mb-6">Create your first invoice to get started</p>
            <button 
              onClick={() => window.location.href = '/invoices/create'} 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Invoice
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Invoice List */}
            <div className="w-full lg:w-2/5">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-blue-900 text-lg flex items-center">
                      <FileText className="w-5 h-5 mr-3 text-blue-600" />
                      Invoice List
                    </h2>
                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                        {invoices.length} Total
                      </span>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        {invoices.filter(inv => inv.status === 'paid').length} Paid
                      </span>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
                  {invoices.map((inv) => (
                    <div
                      key={inv._id}
                      className={`group p-5 transition-all duration-200 cursor-pointer ${
                        selectedInvoice?._id === inv._id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-inner'
                          : 'hover:bg-gradient-to-r hover:from-blue-25 hover:to-indigo-25'
                      }`}
                      onClick={() => {
  setSelectedInvoice(inv);
  
  // Auto-scroll to export buttons on mobile devices
  const isMobile = window.innerWidth <= 1024; // lg breakpoint
  if (isMobile && exportButtonsRef.current) {
    setTimeout(() => {
      exportButtonsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100); // Small delay to ensure state update completes
  }
}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                              #{inv.invoice_no}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {formatDate(inv.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-800 truncate">{inv.buyer_name}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {inv.items.length} items
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                              ₹{inv.total_amount.toFixed(2)}
                            </span>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              inv.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {inv.status === 'paid' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Unpaid
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {inv.status !== 'paid' && (
                          <div className="ml-4">
                            <button
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://billing-app-onzk.onrender.com'}/invoices/${inv._id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'paid' }),
                                });
                                setInvoices((prev) =>
                                  prev.map((i) => i._id === inv._id ? { ...i, status: 'paid' } : i)
                                );
                                if (selectedInvoice?._id === inv._id) {
                                  setSelectedInvoice({ ...inv, status: 'paid' });
                                }
                              }}
                            >
                              Mark as Paid
                            </button>
                          </div>
                        )}
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
                  <div ref={exportButtonsRef} className="bg-gray-50 px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="font-medium text-gray-700 flex items-center">
                      <Eye className="w-4 h-4 mr-2" /> Invoice Preview
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {/* Export to PDF Button */}
                      <button
                        onClick={exportToPDF}
                        disabled={pdfLoading}
                        className={`flex items-center justify-center px-4 py-2 ${
                          pdfLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium`}
                        title="Download PDF to your device"
                      >
                        {pdfLoading ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Export to PDF
                          </>
                        )}
                      </button>
                      {/* Share as PDF Button */}
                      <button
                        onClick={shareAsPDF}
                        disabled={pdfLoading}
                        className={`flex items-center justify-center px-4 py-2 ${
                          pdfLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        } text-white text-sm rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-medium`}
                        title="Share PDF via WhatsApp, Email, etc."
                      >
                        {pdfLoading ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share as PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-white print:bg-white" ref={previewRef}>
                    <InvoicePreview form={selectedInvoice} />
                  </div>
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl p-12 text-center h-full flex items-center justify-center">
                  <div className="text-gray-500">
                    <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No Invoice Selected</h3>
                    <p className="text-gray-500">Click on any invoice from the list to preview it here</p>
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