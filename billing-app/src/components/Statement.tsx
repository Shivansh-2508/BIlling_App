import { useState, useRef, useEffect } from 'react';
import BackToHome from '@/components/BackToHome';

// This approach uses the browser's native print functionality instead of html2pdf
export default function PrintableStatement({ apiBaseUrl }) {
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    // Fetch list of buyers when component mounts
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/buyers`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch buyers: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setBuyers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error loading buyers: ${errorMessage}`);
      console.error('Error fetching buyers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatement = async (buyer) => {
    if (!buyer) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Build URL with query parameters for date filtering
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      // Append query parameters to URL if any exist
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const url = `${apiBaseUrl}/statements/${buyer}${queryString}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch statement: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setStatement(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error loading statement: ${errorMessage}`);
      setStatement(null);
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerChange = (e) => {
    const buyer = e.target.value;
    setSelectedBuyer(buyer);
    if (buyer) {
      fetchStatement(buyer);
    } else {
      setStatement(null);
    }
  };

  const handleDateFilterApply = () => {
    if (selectedBuyer) {
      fetchStatement(selectedBuyer);
    }
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    if (selectedBuyer) {
      fetchStatement(selectedBuyer);
    }
  };

  // Function to handle direct printing using browser's print functionality
  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print the statement.');
      return;
    }
    
    // Use simple CSS that doesn't rely on oklch colors or complex tailwind
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Buyer Statement</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #000;
            background-color: #fff;
          }
          h1, h2, h3 {
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
          }
          .info-section {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .total-row {
            font-weight: bold;
          }
          .company-info {
            margin-bottom: 20px;
          }
          @media print {
            .no-print {
              display: none;
            }
            body {
              margin: 0;
              padding: 15mm;
            }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print();">Print Statement</button>
          <button onclick="window.close();">Close</button>
        </div>
        <script>
          // Auto print on load
          window.onload = function() {
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (e) {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  // Calculate the total quantity for an invoice - with error handling
  const calculateInvoiceTotalQty = (invoice) => {
    if (!invoice.items || !Array.isArray(invoice.items)) return 0;
    
    return invoice.items.reduce((sum, item) => {
      const qty = typeof item.total_qty === 'number' ? item.total_qty : 
                  (typeof item.total_qty === 'string' ? parseFloat(item.total_qty) : 0);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Buyer Statement</h1>
      <BackToHome/>
      {/* Control panel */}
      <div className="bg-white text-gray-700 border rounded-lg shadow-sm mb-6 p-4">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="buyer-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Buyer
            </label>
            <select
              id="buyer-select"
              value={selectedBuyer}
              onChange={handleBuyerChange}
              className="w-full border border-gray-300 rounded-md p-2"
              disabled={loading}
            >
              <option value="">-- Select a Buyer --</option>
              {buyers.map((buyer) => (
                <option key={buyer._id} value={buyer._id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              disabled={loading}
              min={startDate}
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleResetFilter}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            disabled={loading || (!startDate && !endDate)}
          >
            Reset Filters
          </button>
          <button
            onClick={handleDateFilterApply}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            disabled={loading || !selectedBuyer}
          >
            {loading ? 'Loading...' : 'Apply Filter'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {statement && !loading && (
        <div className="bg-white text-gray-900 border rounded-lg shadow-sm">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Statement Summary</h2>
              <button
                onClick={handlePrint}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Print Statement
              </button>
            </div>
            
            {/* This is the section that will be printed */}
            <div className="hidden">
              <div id="printable-content">
                <div className="header">
                  <h1>Buyer Statement</h1>
                  <p>Generated on {new Date().toLocaleDateString('en-IN')}</p>
                </div>
                
                <div className="info-section">
                  <p><strong>Buyer:</strong> {statement.buyer}</p>
                  {statement.buyer_gstin && (
                    <p><strong>GSTIN:</strong> {statement.buyer_gstin}</p>
                  )}
                  <p><strong>Total Invoices:</strong> {statement.invoice_count}</p>
                  {/* <p><strong>Total Quantity:</strong> {statement.total_qty.toFixed(2)} kg</p> */}
                  <p><strong>Total Amount:</strong> ₹{statement.total_amount.toFixed(2)}</p>
                  
                  {(startDate || endDate) && (
                    <div>
                      <p><strong>Filtered By:</strong></p>
                      {startDate && <p><strong>From:</strong> {new Date(startDate).toLocaleDateString('en-IN')}</p>}
                      {endDate && <p><strong>To:</strong> {new Date(endDate).toLocaleDateString('en-IN')}</p>}
                    </div>
                  )}
                </div>
                
                <h3>Invoice Details</h3>
                
                {statement.invoices.length === 0 ? (
                  <p>No invoices found for this buyer within the selected date range.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date</th>
                        <th>Items</th>
                        {/* <th>Total Qty (kg)</th> */}
                        <th>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.invoices.map((invoice) => {
                        const invoiceTotalQty = calculateInvoiceTotalQty(invoice);
                        return (
                          <tr key={invoice._id}>
                            <td>{invoice.invoice_no}</td>
                            <td>{formatDate(invoice.date)}</td>
                            <td>{invoice.items.length}</td>
                            {/* <td>{invoiceTotalQty.toFixed(2)}</td> */}
                            <td>₹{invoice.total_amount.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={3} style={{textAlign: 'right'}}><strong>Total:</strong></td>
                        {/* <td><strong>{statement.total_qty.toFixed(2)} kg</strong></td> */}
                        <td><strong>₹{statement.total_amount.toFixed(2)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
            
            {/* Preview that appears on screen */}
            <div ref={printRef} className="preview-content">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <p><span className="font-medium">Buyer:</span> {statement.buyer}</p>
                  {statement.buyer_gstin && (
                    <p><span className="font-medium">GSTIN:</span> {statement.buyer_gstin}</p>
                  )}
                  <p><span className="font-medium">Total Invoices:</span> {statement.invoice_count}</p>
                  {/* <p><span className="font-medium">Total Quantity:</span> {statement.total_qty.toFixed(2)} kg</p> */}
                  <p><span className="font-medium">Total Amount:</span> ₹{statement.total_amount.toFixed(2)}</p>
                </div>
                
                {(startDate || endDate) && (
                  <div className="space-y-2">
                    <p className="font-medium">Filtered By:</p>
                    {startDate && <p><span className="font-medium">From:</span> {new Date(startDate).toLocaleDateString('en-IN')}</p>}
                    {endDate && <p><span className="font-medium">To:</span> {new Date(endDate).toLocaleDateString('en-IN')}</p>}
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
                
                {statement.invoices.length === 0 ? (
                  <p>No invoices found for this buyer within the selected date range.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 border text-left">Invoice No</th>
                          <th className="p-2 border text-left">Date</th>
                          <th className="p-2 border text-left">Items</th>
                          {/* <th className="p-2 border text-left">Total Qty (kg)</th> */}
                          <th className="p-2 border text-left">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.invoices.map((invoice) => {
                          const invoiceTotalQty = calculateInvoiceTotalQty(invoice);
                          return (
                            <tr key={invoice._id} className="border">
                              <td className="p-2 border">{invoice.invoice_no}</td>
                              <td className="p-2 border">{formatDate(invoice.date)}</td>
                              <td className="p-2 border">{invoice.items.length}</td>
                              {/* <td className="p-2 border">{invoiceTotalQty.toFixed(2)}</td> */}
                              <td className="p-2 border font-medium">₹{invoice.total_amount.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="p-2 border text-right font-medium">Total:</td>
                          {/* <td className="p-2 border font-medium">{statement.total_qty.toFixed(2)} kg</td> */}
                          <td className="p-2 border font-medium">₹{statement.total_amount.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!statement && !loading && selectedBuyer && (
        <p className="text-center py-4 text-gray-700">No statement data available for the selected buyer.</p>
      )}
    </div>
  );
}