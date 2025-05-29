'use client';

import { useEffect, useState, useRef } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Download, FileText, Eye, Printer, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/invoices')
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
          // Format date as YYYY-MM-DD for proper display
          date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
          // Ensure all numeric fields are numbers
          subtotal: Number(inv.subtotal || 0),
          cgst: Number(inv.cgst || 0),
          sgst: Number(inv.sgst || 0),
          total_amount: Number(inv.total_amount || 0),
          // Ensure all items have proper number fields
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

  // Ensure InvoicePreview is loaded and rendered properly
  useEffect(() => {
    if (selectedInvoice && previewRef.current) {
      // Give the preview content time to render properly
      const timer = setTimeout(() => {
        // Force a repaint to ensure all styles are applied
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

  // Fixed PDF generation using print with proper targeting
  const downloadPDFAlternative = () => {
    if (!previewRef.current || !selectedInvoice) return;

    try {
      setPdfLoading(true);

      // Save original title
      const originalTitle = document.title;
      document.title = `Invoice_${selectedInvoice.invoice_no}`;

      // Create a print-only stylesheet
      const style = document.createElement("style");
      style.type = "text/css";
      style.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto;
            width: 100%;
          }

          body * {
            visibility: hidden !important;
          }

          #invoicePreviewRef, #invoicePreviewRef * {
            visibility: visible !important;
          }

          #invoicePreviewRef {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
            background: white !important;
            font-size: 12px !important;
          }

          /* Ensure tables and content fit properly */
          #invoicePreviewRef table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          #invoicePreviewRef th,
          #invoicePreviewRef td {
            padding: 4px 8px !important;
            font-size: 11px !important;
            border: 1px solid !important;
          }
        }
      `;
      document.head.appendChild(style);

      // Add ID to preview div for targeting
      previewRef.current.id = "invoicePreviewRef";

      // Wait to apply styles before printing
      setTimeout(() => {
        window.print();

        // Cleanup after print dialog
        setTimeout(() => {
          document.title = originalTitle;
          document.head.removeChild(style);
          if (previewRef.current) {
            previewRef.current.removeAttribute("id");
          }
          setPdfLoading(false);
        }, 1000);
      }, 500);
    } catch (err) {
      console.error("Error in PDF generation:", err);
      setPdfLoading(false);
      alert("PDF generation failed. Please try again.");
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
                      onClick={() => setSelectedInvoice(inv)}
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
                                await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/invoices/${inv._id}/status`, {
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
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h2 className="font-medium text-gray-700 flex items-center">
                      <Eye className="w-4 h-4 mr-2" /> Invoice Preview
                    </h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={downloadPDFAlternative}
                        disabled={pdfLoading}
                        className={`flex items-center px-3 py-1 ${
                          pdfLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        } text-white text-sm rounded transition-colors`}
                      >
                        {pdfLoading ? (
                          <>
                            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Printer className="w-4 h-4 mr-1" /> Download PDF
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