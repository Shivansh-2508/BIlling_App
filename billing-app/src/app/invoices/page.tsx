'use client';

import { useEffect, useState, useRef } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview'; // adjust path if needed

import { Download, FileText, Eye, Printer } from 'lucide-react';
import BackToHome from '@/components/BackToHome';
import CreateInvoiceButton from '@/components/CreateInvoiceButton';

// Item structure - matching what's used in CreateInvoicePage
interface Item {
  product_name: string;
  packing_qty: number;
  no_of_units: number; // Changed from 'units' to match CreateInvoicePage
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center mb-6 border-b pb-4">
        <FileText className="w-8 h-8 mr-3 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">All Invoices</h1>
      </div>
      <div className="flex justify-between mb-6">
        <BackToHome />
        <CreateInvoiceButton />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm">Please ensure your API server is running at https://billing-app-onzk.onrender.com</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No invoices found. Create your first invoice!</p>
          <button 
            onClick={() => window.location.href = '/invoices/create'} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Invoice
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Invoice List */}
          <div className="w-full lg:w-2/5">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h2 className="font-medium text-gray-700">Invoice List</h2>
              </div>
              <div className="divide-y max-h-[70vh] overflow-y-auto">
  {invoices.map((inv) => (
    <div
      key={inv._id}
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        selectedInvoice?._id === inv._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
      onClick={() => setSelectedInvoice(inv)}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-gray-800">INV# {inv.invoice_no}</p>
          <p className="text-sm text-gray-600">{formatDate(inv.date)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">₹{inv.total_amount.toFixed(2)}</p>
          <p className="text-sm text-gray-600">{inv.buyer_name}</p>
          <p className={`text-xs mt-1 font-bold ${inv.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
            {inv.status === 'paid' ? 'Paid' : 'Unpaid'}
          </p>
          {inv.status !== 'paid' && (
            <button
              className="mt-1 px-2 py-1 bg-green-600 text-white rounded text-xs"
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
              <div className="bg-gray-50 rounded-lg p-8 text-center h-full flex items-center justify-center">
                <div className="text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an invoice to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}