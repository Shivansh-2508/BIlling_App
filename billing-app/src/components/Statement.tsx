import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Calendar, FileText, Download, Filter, User, TrendingUp, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import BackToHome from '@/components/BackToHome';

export default function PrintableStatement({ apiBaseUrl }) {
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const printRef = useRef(null);
  
  // Search functionality state
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchBuyers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
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

  const filteredBuyers = buyers.filter(buyer =>
    buyer.name.toLowerCase().includes(buyerSearchTerm.toLowerCase())
  );

  const handleBuyerSelect = (buyer) => {
    setSelectedBuyer(buyer._id);
    setSelectedBuyerName(buyer.name);
    setBuyerSearchTerm('');
    setIsDropdownOpen(false);
    if (buyer._id) {
      fetchStatement(buyer._id);
    } else {
      setStatement(null);
    }
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      setBuyerSearchTerm('');
    }
  };

  const handleClearSelection = () => {
    setSelectedBuyer('');
    setSelectedBuyerName('');
    setBuyerSearchTerm('');
    setStatement(null);
    setIsDropdownOpen(false);
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

  const handlePrint = () => {
    const printContent = document.getElementById('printable-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print the statement.');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Buyer Statement</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            color: #1a1a1a;
            background-color: #fff;
            line-height: 1.6;
          }
          h1, h2, h3 {
            color: #2563eb;
            margin-bottom: 16px;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 16px;
          }
          .info-section {
            margin-bottom: 24px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 12px 8px;
            text-align: left;
          }
          th {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            font-weight: 600;
            color: #334155;
          }
          .total-row {
            font-weight: 600;
            background: #f8fafc;
          }
          @media print {
            .no-print { display: none; }
            body { margin: 0; padding: 15mm; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print();" style="background: #2563eb; color: white; padding: 8px 16px; border: none; border-radius: 6px; margin-right: 8px; cursor: pointer;">Print Statement</button>
          <button onclick="window.close();" style="background: #6b7280; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
        <script>
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
      return dateString;
    }
  };

  const calculateInvoiceTotalQty = (invoice) => {
    if (!invoice.items || !Array.isArray(invoice.items)) return 0;
    
    return invoice.items.reduce((sum, item) => {
      const qty = typeof item.total_qty === 'number' ? item.total_qty : 
                  (typeof item.total_qty === 'string' ? parseFloat(item.total_qty) : 0);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-black">Buyer Statements</h1>
                <p className="text-gray-600 mt-1">Generate and view detailed buyer transaction reports</p>
              </div>
            </div>
            <BackToHome />
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <div className="flex items-center gap-3">
              <Filter className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Filter Options</h2>
            </div>
            <p className="text-blue-100 mt-1">Select buyer and date range to generate statement</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Custom Searchable Dropdown for Buyers - Expandable container */}
              <div className={`relative transition-all duration-300 ${isDropdownOpen ? 'lg:col-span-2' : ''}`} ref={dropdownRef}>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <User className="w-4 h-4 text-blue-600" />
                  Select Buyer
                </label>
                <div className="relative">
                  <div
                    className={`w-full border-2 border-gray-200 rounded-xl p-4 cursor-pointer bg-white/50 backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-blue-300 hover:shadow-md ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isDropdownOpen ? 'border-blue-500 shadow-lg' : ''}`}
                    onClick={!loading ? handleDropdownToggle : undefined}
                  >
                    <span className={`font-medium ${selectedBuyerName ? 'text-gray-900' : 'text-gray-500'}`}>
                      {selectedBuyerName || '🔍 Search and select a buyer...'}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedBuyerName && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearSelection();
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </div>
                  </div>
                  
                  {/* Dropdown Menu - Expanded to show 10 buyers */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      {/* Search Input */}
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={buyerSearchTerm}
                            onChange={(e) => setBuyerSearchTerm(e.target.value)}
                            placeholder="Type to search buyers..."
                            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-700 placeholder-gray-400 transition-all duration-200"
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      {/* Buyer Options - Show 10 buyers at once */}
                      <div className="max-h-80 overflow-y-auto">
                        {filteredBuyers.length > 0 ? (
                          filteredBuyers.map((buyer, index) => (
                            <div
                              key={buyer._id}
                              className={`p-4 hover:bg-blue-50 cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 last:border-b-0 ${
                                index < 10 ? 'min-h-[60px]' : ''
                              }`}
                              onClick={() => handleBuyerSelect(buyer)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-white text-sm font-bold">
                                    {buyer.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-900 font-semibold truncate">{buyer.name}</p>
                                  {buyer.gstin && (
                                    <p className="text-gray-500 text-xs truncate">GSTIN: {buyer.gstin}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : buyerSearchTerm ? (
                          <div className="p-8 text-gray-700 text-sm text-center">
                            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                            <p className="font-medium">No buyers found</p>
                            <p className="text-xs">matching "{buyerSearchTerm}"</p>
                          </div>
                        ) : (
                          <div className="p-8 text-gray-700 text-sm text-center">
                            <User className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                            <p className="font-medium">No buyers available</p>
                            <p className="text-xs">Add buyers to see them here</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Show count info at bottom */}
                      {filteredBuyers.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-200">
                          <p className="text-xs text-gray-700 text-center font-medium">
                            {filteredBuyers.length} buyer{filteredBuyers.length !== 1 ? 's' : ''} 
                            {buyerSearchTerm && ` matching "${buyerSearchTerm}"`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Start Date - Conditionally adjust grid span */}
              <div className={`${isDropdownOpen ? 'lg:col-span-1' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700 "
                  disabled={loading}
                />
              </div>
              
              {/* End Date - Moves to next row when dropdown is expanded */}
              <div className={`${isDropdownOpen ? 'lg:col-span-3' : ''}`}>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl p-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700"
                  disabled={loading}
                  min={startDate}
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={handleResetFilter}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || (!startDate && !endDate)}
              >
                <RefreshCw className="w-4 h-4" />
                Reset Filters
              </button>
              <button
                onClick={handleDateFilterApply}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={loading || !selectedBuyer}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Generate Statement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Generating statement...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl shadow-lg mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Statement Display */}
        {statement && !loading && (
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl overflow-hidden">
            {/* Statement Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Statement Summary</h2>
                  <p className="text-emerald-100">Financial overview for {statement.buyer}</p>
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 backdrop-blur-sm cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  Print Statement
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Hidden Print Content */}
              <div className="hidden text-black">
                <div id="printable-content">
                  <div className="header">
                    <h1 className='text-black'>Buyer Statement</h1>
                    <p>Generated on {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                  
                  <div className="info-section">
                    <p><strong>Buyer:</strong> {statement.buyer}</p>
                    {statement.buyer_gstin && (
                      <p><strong>GSTIN:</strong> {statement.buyer_gstin}</p>
                    )}
                    <p><strong>Total Invoices:</strong> {statement.invoice_count}</p>
                    <p><strong>Total Amount:</strong> ₹{statement.total_amount?.toFixed(2) || '0.00'}</p>
                    
                    {(startDate || endDate) && (
                      <div>
                        {/* <p><strong>Filtered By:</strong></p> */}
                        {startDate && <p><strong>From:</strong> {new Date(startDate).toLocaleDateString('en-IN')}</p>}
                        {endDate && <p><strong>To:</strong> {new Date(endDate).toLocaleDateString('en-IN')}</p>}
                      </div>
                    )}
                  </div>
                  
                  <h3 className='text-black'>Invoice Details</h3>
                  
                  {statement.invoices?.length === 0 ? (
                    <p>No invoices found for this buyer within the selected date range.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Amount (₹)</th>
                          <th>Status</th> 
                        </tr>
                      </thead>
                      <tbody>
                        {statement.invoices?.map((invoice) => (
                          <tr key={invoice._id}>
                            <td>{invoice.invoice_no}</td>
                            <td>{formatDate(invoice.date)}</td>
                            <td>{invoice.items?.length || 0}</td>
                            <td>₹{invoice.total_amount?.toFixed(2) || '0.00'}</td>
                            <td>
        <span style={{
          color: invoice.status === 'paid' ? 'green' : 'red',
          fontWeight: 'bold',
          textTransform: 'capitalize'
        }}>
          {invoice.status || 'unpaid'}
        </span>
      </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="total-row">
                          <td colSpan={3} style={{textAlign: 'right'}}><strong>Total:</strong></td>
                          <td><strong>₹{statement.total_amount?.toFixed(2) || '0.00'}</strong></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
              
              {/* Visual Preview */}
              <div ref={printRef} className="preview-content">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-blue-100 text-sm font-medium mb-2">Buyer</p>
      <div className="group">
        <p className="text-lg sm:text-xl font-bold leading-tight break-words hyphens-auto">
          {statement.buyer}
        </p>
        {/* Tooltip for very long names on hover */}
        {statement.buyer && statement.buyer.length > 25 && (
          <div className="invisible group-hover:visible absolute z-10 mt-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {statement.buyer}
          </div>
        )}
      </div>
    </div>
    <div className="flex-shrink-0">
      <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
    </div>
  </div>
</div>
                  
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-100 text-sm font-medium">Total Amount</p>
                        <p className="text-2xl font-bold">₹{statement.total_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-amber-200" />
                    </div>
                  </div>
                  
                  {statement.buyer_gstin && (
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-medium">GSTIN</p>
                          <p className="text-lg font-bold">{statement.buyer_gstin}</p>
                        </div>
                        <FileText className="w-8 h-8 text-purple-200" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Filter Info */}
                {(startDate || endDate) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">Date Filter Applied</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {startDate && (
                        <span className="text-blue-700">
                          <strong>From:</strong> {new Date(startDate).toLocaleDateString('en-IN')}
                        </span>
                      )}
                      {endDate && (
                        <span className="text-blue-700">
                          <strong>To:</strong> {new Date(endDate).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Invoice Table - Mobile Responsive */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>
                  </div>
                  
                  {statement.invoices?.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No invoices found for this buyer within the selected date range.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice No</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Items</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {statement.invoices?.map((invoice, index) => (
                              <tr key={invoice._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-semibold text-gray-900">{invoice.invoice_no}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm text-gray-600">{formatDate(invoice.date)}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {invoice.items?.length || 0} items
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="text-sm font-bold text-gray-900">₹{invoice.total_amount?.toFixed(2) || '0.00'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
        <span className={`font-bold ${invoice.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
          {invoice.status || 'unpaid'}
        </span>
      </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-900">Total Amount:</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-lg font-bold text-emerald-600">₹{statement.total_amount?.toFixed(2) || '0.00'}</span>
                              </td>
                              
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="sm:hidden">
                        <div className="divide-y divide-gray-200">
                          {statement.invoices?.map((invoice) => (
                            <div key={invoice._id} className="p-4 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{invoice.invoice_no}</p>
                                  <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                                </div>
                                <span className="text-sm font-bold text-gray-900">₹{invoice.total_amount?.toFixed(2) || '0.00'}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {invoice.items?.length || 0} items
                                </span>
                                <span className={`ml-2 text-xs font-bold ${invoice.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
            {invoice.status || 'unpaid'}
          </span>
                              </div>
                            </div>
                          ))}
                          
                          {/* Mobile Total */}
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                              <span className="text-lg font-bold text-emerald-600">₹{statement.total_amount?.toFixed(2) || '0.00'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!statement && !loading && selectedBuyer && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-lg">No statement data available for the selected buyer.</p>
            <p className="text-gray-500 mt-2">Try adjusting your date filters or check if invoices exist for this buyer.</p>
          </div>
        )}
      </div>
    </div>
  );
}