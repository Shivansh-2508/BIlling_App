'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InvoicePreview } from '@/components/InvoicePreview';
import { XCircle, Save, ArrowLeft, FileText, Plus, Trash2, Search, ChevronDown, X, User, Package, AlertCircle } from 'lucide-react';
import BackToHome from '@/components/BackToHome';

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

interface Buyer {
  _id: string;
  name: string;
  gstin?: string;
  address?: string;
}

interface Product {
  _id: string;
  name: string;
  rate_per_kg?: number;
}

export default function EditInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('id');

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dropdown data and states
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [isBuyerDropdownOpen, setIsBuyerDropdownOpen] = useState(false);
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [openProductDropdowns, setOpenProductDropdowns] = useState<{ [key: number]: boolean }>({});

  // Refs for dropdowns
  const buyerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Add viewport meta tag handling
  useEffect(() => {
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  }, []);

  // Fetch buyers and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [buyersRes, productsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/buyers`),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/products`)
        ]);

        if (buyersRes.ok) {
          const buyersData = await buyersRes.json();
          setBuyers(buyersData);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          setProducts(productsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch invoice data
  useEffect(() => {
    if (!invoiceId) {
      setError('No invoice ID provided.');
      setLoading(false);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/invoices/${invoiceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvoice(recalculateTotals(data));
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch invoice.');
        setLoading(false);
      });
  }, [invoiceId]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle buyer dropdown
      if (buyerDropdownRef.current && !buyerDropdownRef.current.contains(event.target as Node)) {
        setIsBuyerDropdownOpen(false);
      }

      // Handle product dropdowns
      Object.keys(openProductDropdowns).forEach(key => {
        const idx = parseInt(key);
        if (openProductDropdowns[idx] && productDropdownRefs.current[idx] && 
            !productDropdownRefs.current[idx]?.contains(event.target as Node)) {
          setOpenProductDropdowns(prev => ({ ...prev, [idx]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openProductDropdowns]);

  // Recalculate totals function
  function recalculateTotals(invoice: Invoice): Invoice {
    const subtotal = invoice.items.reduce(
      (sum, item) =>
        sum + (Number(item.packing_qty) || 0) * (Number(item.no_of_units) || 0) * (Number(item.rate_per_kg) || 0),
      0
    );
    const cgst = Number(invoice.cgst) || 0;
    const sgst = Number(invoice.sgst) || 0;
    const total_amount = subtotal + cgst + sgst;
    return { ...invoice, subtotal, total_amount };
  }

  // Handle form changes
  const handleChange = (field: keyof Invoice, value: any) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Recalculate if changing tax fields
      if (field === 'cgst' || field === 'sgst') {
        return recalculateTotals(updated);
      }
      return updated;
    });
  };

  // Handle item changes
  const handleItemChange = (idx: number, field: keyof Item, value: any) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return recalculateTotals({ ...prev, items });
    });
  };

  // Add new item
  const addItem = () => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const newItem = { product_name: '', packing_qty: 0, no_of_units: 0, rate_per_kg: 0 };
      return recalculateTotals({ ...prev, items: [...prev.items, newItem] });
    });
  };

  // Remove item
  const removeItem = (idx: number) => {
    setInvoice((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((_, i) => i !== idx);
      return recalculateTotals({ ...prev, items });
    });
  };

  // Buyer dropdown handlers
  const handleBuyerSelect = (buyer: Buyer) => {
    handleChange('buyer_name', buyer.name);
    if (buyer.address) handleChange('address', buyer.address);
    if (buyer.gstin) handleChange('gstin', buyer.gstin);
    setBuyerSearchTerm('');
    setIsBuyerDropdownOpen(false);
  };

  const handleBuyerDropdownToggle = () => {
    setIsBuyerDropdownOpen(!isBuyerDropdownOpen);
    if (!isBuyerDropdownOpen) {
      setBuyerSearchTerm('');
    }
  };

  const handleClearBuyer = () => {
    handleChange('buyer_name', '');
    handleChange('address', '');
    handleChange('gstin', '');
    setBuyerSearchTerm('');
    setIsBuyerDropdownOpen(false);
  };

  // Product dropdown handlers
  const handleProductSelect = (idx: number, product: Product) => {
    handleItemChange(idx, 'product_name', product.name);
    if (product.rate_per_kg) {
      handleItemChange(idx, 'rate_per_kg', product.rate_per_kg);
    }
    setProductSearchTerms(prev => ({ ...prev, [idx]: '' }));
    setOpenProductDropdowns(prev => ({ ...prev, [idx]: false }));
  };

  const handleProductDropdownToggle = (idx: number) => {
    setOpenProductDropdowns(prev => ({ ...prev, [idx]: !prev[idx] }));
    if (!openProductDropdowns[idx]) {
      setProductSearchTerms(prev => ({ ...prev, [idx]: '' }));
    }
  };

  // Filter functions
  const filteredBuyers = buyers.filter(buyer =>
    buyer.name.toLowerCase().includes(buyerSearchTerm.toLowerCase())
  );

  const getFilteredProducts = (idx: number) => {
    const searchTerm = productSearchTerms[idx] || '';
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Save handler
  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { _id, ...invoiceData } = invoice;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/invoices/${invoice._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update invoice');
      }
      setSuccess('Invoice updated successfully!');
      setTimeout(() => {
        router.push('/invoices');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center text-red-600 flex flex-col items-center max-w-md p-8">
          <XCircle className="w-16 h-16 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Invoice</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => router.push('/invoices')}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="Back to Invoices"
              >
                {/* <ArrowLeft className="w-5 h-5 text-black" /> */}
                <BackToHome /> 
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
                    Edit Invoice #{invoice?.invoice_no}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">Modify invoice details and preview changes</p>
                </div>
              </div>
            </div>
            {/* <BackToHome /> */}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {/* Main Content - Dual Pane Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          
          {/* Left Panel - Form (Mobile: Full width, Desktop: 60%) */}
          <div className="w-full lg:w-3/5 space-y-4 sm:space-y-6">
            
            {/* Buyer Information Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-100">
                <h2 className="text-base sm:text-lg font-semibold text-blue-900">Buyer Information</h2>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {/* Buyer Name Dropdown */}
                <div className="relative" ref={buyerDropdownRef}>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Buyer Name
                  </label>
                  <div className="relative">
                    <div
                      className={`w-full border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 cursor-pointer bg-white/50 backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-blue-300 hover:shadow-md ${
                        isBuyerDropdownOpen ? 'border-blue-500 shadow-lg' : ''
                      }`}
                      onClick={handleBuyerDropdownToggle}
                    >
                      <span className={`font-medium text-sm sm:text-base ${invoice?.buyer_name ? 'text-gray-900' : 'text-gray-500'}`}>
                        {invoice?.buyer_name || '🔍 Search and select a buyer...'}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        {invoice?.buyer_name && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearBuyer();
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <ChevronDown 
                          className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                            isBuyerDropdownOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </div>

                    {/* Buyer Dropdown Menu */}
                    {isBuyerDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden">
                        {/* Search Input */}
                        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                            <input
                              type="text"
                              value={buyerSearchTerm}
                              onChange={(e) => setBuyerSearchTerm(e.target.value)}
                              placeholder="Type to search buyers..."
                              className="w-full pl-10 sm:pl-11 pr-4 py-2 sm:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm font-medium text-gray-700 placeholder-gray-400"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        {/* Buyer Options */}
                        <div className="max-h-60 sm:max-h-80 overflow-y-auto">
                          {filteredBuyers.length > 0 ? (
                            filteredBuyers.map((buyer) => (
                              <div
                                key={buyer._id}
                                className="p-3 sm:p-4 hover:bg-blue-50 cursor-pointer text-xs sm:text-sm font-medium transition-colors border-b border-gray-50 last:border-b-0"
                                onClick={() => handleBuyerSelect(buyer)}
                              >
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs sm:text-sm font-bold">
                                      {buyer.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 font-semibold truncate text-sm sm:text-base">{buyer.name}</p>
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
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700 resize-none"
                    rows={3}
                    value={invoice?.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="Enter buyer address"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                    <input
                      className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700"
                      value={invoice?.gstin || ''}
                      onChange={e => handleChange('gstin', e.target.value)}
                      placeholder="Enter GSTIN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700"
                      value={invoice?.date || ''}
                      onChange={e => handleChange('date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-emerald-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold text-emerald-900">Invoice Items</h2>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {invoice?.items.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 sm:p-4 relative group">
                      {invoice.items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Product Name Dropdown */}
                        <div className="sm:col-span-2 relative" ref={el => productDropdownRefs.current[idx] = el}>
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-black mb-1">
                            <Package className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
                            Product Name
                          </label>
                          <div className="relative">
                            <div
                              className={`w-full border border-gray-300 rounded-lg p-2 sm:p-3 cursor-pointer bg-white flex items-center justify-between transition-all duration-200 hover:border-blue-300 ${
                                openProductDropdowns[idx] ? 'border-blue-500 shadow-lg' : ''
                              }`}
                              onClick={() => handleProductDropdownToggle(idx)}
                            >
                              <span className={`font-medium text-sm ${item.product_name ? 'text-gray-900' : 'text-gray-500'}`}>
                                {item.product_name || '🔍 Search and select a product...'}
                              </span>
                              <ChevronDown 
                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                  openProductDropdowns[idx] ? 'rotate-180' : ''
                                }`} 
                              />
                            </div>

                            {/* Product Dropdown Menu */}
                            {openProductDropdowns[idx] && (
                              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
                                {/* Search Input */}
                                <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                      type="text"
                                      value={productSearchTerms[idx] || ''}
                                      onChange={(e) => setProductSearchTerms(prev => ({ ...prev, [idx]: e.target.value }))}
                                      placeholder="Type to search products..."
                                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-gray-700 placeholder-gray-400"
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                    />
                                  </div>
                                </div>
                                {/* Product Options */}
                                <div className="max-h-48 overflow-y-auto">
                                  {getFilteredProducts(idx).length > 0 ? (
                                    getFilteredProducts(idx).map((product) => (
                                      <div
                                        key={product._id}
                                        className="p-3 hover:bg-blue-50 cursor-pointer text-sm font-medium transition-colors border-b border-gray-50 last:border-b-0"
                                        onClick={() => handleProductSelect(idx, product)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Package className="w-4 h-4 text-white" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 font-semibold truncate">{product.name}</p>
                                            {product.rate_per_kg && (
                                              <p className="text-gray-500 text-xs">Rate: ₹{product.rate_per_kg}/kg</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : productSearchTerms[idx] ? (
                                    <div className="p-8 text-gray-700 text-sm text-center">
                                      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                                      <p className="font-medium">No products found</p>
                                      <p className="text-xs">matching "{productSearchTerms[idx]}"</p>
                                    </div>
                                  ) : (
                                    <div className="p-8 text-gray-700 text-sm text-center">
                                      <Package className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                                      <p className="font-medium">No products available</p>
                                      <p className="text-xs">Add products to see them here</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-black mb-1">Packing Qty (kg)</label>
                          <input
                            type="number"
                            className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                            value={item.packing_qty || ''}
                            onChange={e => handleItemChange(idx, 'packing_qty', Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">No. of Units</label>
                          <input
                            type="number"
                            className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                            value={item.no_of_units || ''}
                            onChange={e => handleItemChange(idx, 'no_of_units', Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-black mb-1">Rate per kg (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full border border-gray-300 rounded-lg p-2 sm:p-3 focus:outline-none focus:border-blue-500 transition-colors text-sm text-black"
                            value={item.rate_per_kg || ''}
                            onChange={e => handleItemChange(idx, 'rate_per_kg', Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">Amount (₹)</label>
                          <div className="w-full border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-100 text-sm font-semibold text-black">
                            ₹{((item.packing_qty || 0) * (item.no_of_units || 0) * (item.rate_per_kg || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Card */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-purple-100">
                <h2 className="text-base sm:text-lg font-semibold text-purple-900">Invoice Totals</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Subtotal (₹)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg p-3 bg-gray-100 text-gray-700 font-semibold"
                      value={invoice?.subtotal || 0}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700"
                      value={invoice?.cgst || 0}
                      onChange={e => handleChange('cgst', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">SGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full border-2 border-gray-200 rounded-lg p-3 bg-white/50 backdrop-blur-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 font-medium text-gray-700"
                      value={invoice?.sgst || 0}
                      onChange={e => handleChange('sgst', Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Total Amount (₹)</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 font-bold text-lg"
                      value={invoice?.total_amount || 0}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
                  saving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/invoices')}
                className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold transition-all duration-200"
              >
                {/* <ArrowLeft className="w-5 h-5" /> */}
                Cancel
              </button>
            </div>
          </div>

          {/* Right Panel - Preview (Mobile: Full width below form, Desktop: 40%) */}
          <div className="w-full lg:w-1/2">
            <div className="sticky top-24 bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Preview
                </h2>
              </div>
              <div className="p-2 sm:p-4 bg-white max-h-[70vh] overflow-y-auto lg:max-h-none lg:overflow-visible">
                {invoice && <InvoicePreview form={invoice} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}