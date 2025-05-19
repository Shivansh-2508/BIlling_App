'use client';
import { useEffect, useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

interface Item {
  product_name: string;
  packing_qty: number;
  units: number;
  rate_per_kg: number;
  total_qty: number;
  amount: number;
}

interface Invoice {
  _id: string;
  invoice_no: string;
  date: string;
  items: Item[];
  total_amount: number;
}

interface StatementData {
  buyer: string;
  invoice_count: number;
  total_qty: number;
  total_amount: number;
  invoices: Invoice[];
  filter?: {
    start_date: string | null;
    end_date: string | null;
  };
}

interface Buyer {
  _id: string;
  name: string;
}

export default function StatementPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch list of buyers when component mounts
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      const res = await fetch('http://localhost:5000/buyers');
      if (!res.ok) throw new Error('Failed to fetch buyers');
      const data = await res.json();
      setBuyers(data);
    } catch (err) {
      setError('Error loading buyers. Please try again later.');
      console.error('Error fetching buyers:', err);
    }
  };

  const fetchStatement = async (buyer: string) => {
    if (!buyer) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Build URL with query parameters for date filtering
      let url = `http://localhost:5000/statements/${buyer}`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      // Append query parameters to URL if any exist
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch statement');
      const data = await res.json();
      setStatement(data);
    } catch (err) {
      setError('Error loading statement. Please try again later.');
      setStatement(null);
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
      // Small timeout to ensure state updates before fetch
      setTimeout(() => fetchStatement(selectedBuyer), 0);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Statement_${statement?.buyer || 'Buyer'}_${new Date().toISOString().split('T')[0]}`,
    onBeforeGetContent: () => {
      // You could add preparation logic here if needed
      return Promise.resolve();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Buyer Statement</h1>
      
      <div className="bg-white border rounded-lg shadow-sm mb-6 p-4">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="buyer-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Buyer
            </label>
            <select
              id="buyer-select"
              value={selectedBuyer}
              onChange={handleBuyerChange}
              className="w-full text-gray-700 border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full border border-gray-300 text-gray-700 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleResetFilter}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
          <button
            onClick={handleDateFilterApply}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            disabled={!selectedBuyer}
          >
            Apply Filter
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-4">Loading statement data...</p>}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {statement && !loading && (
        <div ref={printRef} className="bg-white border rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-gray-700 font-bold">Statement Summary</h2>
              <button
                onClick={handlePrint}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Print as PDF
              </button>
            </div>
            
            <div className="grid text-gray-700  md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p><span className="font-medium">Buyer:</span> {statement.buyer}</p>
                <p><span className="font-medium">Total Invoices:</span> {statement.invoice_count}</p>
                <p><span className="font-medium">Total Quantity:</span> {statement.total_qty.toFixed(2)} kg</p>
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
          </div>

          <div className="p-6">
            <h3 className="text-lg text-gray-700 font-semibold mb-4">Invoice Details</h3>
            
            {statement.invoices.length === 0 ? (
              <p className="text-gray-700">No invoices found for this buyer within the selected date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total Qty (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statement.invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoice_no}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(invoice.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{invoice.items.length}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {invoice.items.reduce((sum, item) => sum + item.total_qty, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          ₹{invoice.total_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-gray-700 bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium">Total:</td>
                      <td className="px-6 py-3 text-sm font-medium">{statement.total_qty.toFixed(2)} kg</td>
                      <td className="px-6 py-3 text-sm font-medium">₹{statement.total_amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {!statement && !loading && selectedBuyer && (
        <p className="text-center py-4 text-gray-700">No statement data available for the selected buyer.</p>
      )}
    </div>
  );
}