'use client';

import { useEffect, useState, useRef } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview'; // adjust path if needed
import html2pdf from 'html2pdf.js'; // Install: npm i html2pdf.js
import { Download, FileText, Eye, Printer } from 'lucide-react';

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
  items: Item[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total_amount: number;
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
  
  const downloadPDF = async () => {
    if (!previewRef.current || !selectedInvoice) {
      console.error('Preview reference or selected invoice not available');
      return;
    }
    
    try {
      setPdfLoading(true);
      
      // Clone the element to avoid modifying the visible DOM
      const element = previewRef.current.cloneNode(true) as HTMLElement;
      
      // Make sure any images and styles are properly loaded
      // Add specific PDF printing styles
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          body, html, * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
      `;
      element.appendChild(style);
      
      // Configure html2pdf with optimal settings
      const options = {
        margin: 10,
        filename: `Invoice_${selectedInvoice.invoice_no}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        }
      };
      
      // Wait a moment to ensure all content is fully rendered
      setTimeout(async () => {
        try {
          const pdf = await html2pdf().from(element).set(options).outputPdf('blob');
          const url = URL.createObjectURL(pdf);
          
          // Create a temporary link and trigger download
          const link = document.createElement('a');
          link.href = url;
          link.download = `Invoice_${selectedInvoice.invoice_no}.pdf`;
          link.click();
          
          // Clean up
          URL.revokeObjectURL(url);
          setPdfLoading(false);
        } catch (err) {
          console.error('Error generating PDF:', err);
          alert('Failed to generate PDF. Please try again.');
          setPdfLoading(false);
          // Try alternative method as fallback
          downloadPDFAlternative();
        }
      }, 500);
    } catch (err) {
      console.error('Error in PDF generation:', err);
      alert('Failed to generate PDF. Please try again with Print View option.');
      setPdfLoading(false);
    }
  };

  // Alternative PDF generation approach using print
  const downloadPDFAlternative = () => {
    if (!previewRef.current || !selectedInvoice) return;
    
    try {
      setPdfLoading(true);
      
      // Save original title
      const originalTitle = document.title;
      document.title = `Invoice_${selectedInvoice.invoice_no}`;
      
      // Create a print-only stylesheet
      const style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          #previewRef, #previewRef * {
            visibility: visible;
          }
          #previewRef {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Add unique ID to preview element
      previewRef.current.id = 'previewRef';
      
      // Print with timeout to ensure styles are applied
      setTimeout(() => {
        window.print();
        
        // Cleanup
        document.title = originalTitle;
        document.head.removeChild(style);
        previewRef.current?.removeAttribute('id');
        setPdfLoading(false);
      }, 500);
    } catch (err) {
      console.error('Error in alternative PDF method:', err);
      setPdfLoading(false);
      alert('PDF generation failed. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center mb-6 border-b pb-4">
        <FileText className="w-8 h-8 mr-3 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-800">All Invoices</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p className="text-sm">Please ensure your API server is running at http://localhost:5000</p>
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
                      onClick={downloadPDF}
                      disabled={pdfLoading}
                      className={`flex items-center px-3 py-1 ${
                        pdfLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      } text-white text-sm rounded transition-colors`}
                    >
                      {pdfLoading ? (
                        <>
                          <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" /> Download PDF
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadPDFAlternative}
                      disabled={pdfLoading}
                      className="flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                    >
                      <Printer className="w-4 h-4 mr-1" /> Print View
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