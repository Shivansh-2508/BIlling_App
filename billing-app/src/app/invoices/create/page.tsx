'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Save, Search, ChevronDown, X, User, AlertCircle, Calendar, Package, Hash, ShoppingCart, Eye } from 'lucide-react';
import { InvoicePreview } from '@/components/InvoicePreview';
import BackToHome from '@/components/BackToHome';

export default function CreateInvoicePage() {
  const router = useRouter();
  const fmt = (n: number | string) => Number(n).toFixed(2);
  
  // Buyer-related state
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [products, setProducts] = useState([]);
  
  // Search functionality state for buyer dropdown
  const [buyerSearchTerm, setBuyerSearchTerm] = useState('');
  const [isBuyerDropdownOpen, setIsBuyerDropdownOpen] = useState(false);
  const [selectedBuyerName, setSelectedBuyerName] = useState('');
  const buyerDropdownRef = useRef(null);

  // Mobile preview toggle state
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Invoice form state
  const [form, setForm] = useState({
    invoice_no: '',
    date: '',
    buyer_name: '',
    address: '',
    gstin: '',
    items: [
      { product_name: '', packing_qty: 0, no_of_units: 0, rate_per_kg: 0, hsn_code: '' },
    ],
  });

  // Error state
  const [errors, setErrors] = useState({
    invoice_no: '',
    date: '',
    buyer: '',
    items: [] as string[]
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (buyerDropdownRef.current && !buyerDropdownRef.current.contains(event.target)) {
        setIsBuyerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch data on mount
  useEffect(() => {
    Promise.all([
      fetch("http://localhost:5000/buyers").then(res => res.json()),
      fetch("http://localhost:5000/products").then(res => res.json())
    ])
    .then(([buyersData, productsData]) => {
      setBuyers(buyersData);
      setProducts(productsData);
    })
    .catch(err => console.error("Error fetching data:", err));
  }, []);

  // Filter buyers based on search term
  const filteredBuyers = buyers.filter(buyer =>
    buyer.name.toLowerCase().includes(buyerSearchTerm.toLowerCase())
  );

  // Handle buyer dropdown toggle
  const handleBuyerDropdownToggle = () => {
    setIsBuyerDropdownOpen(!isBuyerDropdownOpen);
    if (!isBuyerDropdownOpen) {
      setBuyerSearchTerm('');
    }
  };

  // Handle buyer selection from dropdown
  const handleBuyerSelect = (buyer) => {
    setSelectedBuyerId(buyer._id);
    setSelectedBuyerName(buyer.name);
    setBuyerSearchTerm('');
    setIsBuyerDropdownOpen(false);
    setErrors(prev => ({ ...prev, buyer: '' }));

    setForm((prev) => ({
      ...prev,
      buyer_name: buyer.name,
      address: buyer.address,
      gstin: buyer.gstin || '',
    }));
  };

  // Handle buyer selection clear
  const handleClearBuyerSelection = () => {
    setSelectedBuyerId('');
    setSelectedBuyerName('');
    setBuyerSearchTerm('');
    setIsBuyerDropdownOpen(false);
    setForm((prev) => ({
      ...prev,
      buyer_name: '',
      address: '',
      gstin: '',
    }));
  };

  // Validate form before submission
  const validateForm = () => {
    const newErrors = {
      invoice_no: !form.invoice_no ? 'Invoice number is required' : '',
      date: !form.date ? 'Date is required' : '',
      buyer: !selectedBuyerId ? 'Please select a buyer' : '',
      items: form.items.map(item => 
        !item.product_name ? 'Product is required' : ''
      )
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(val => 
      typeof val === 'string' ? val : val.some(v => v)
    );
  };

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...form.items];

    updated[index][field] = ['product_name', 'hsn_code'].includes(field)
      ? value
      : Number(value);

    if (field === 'product_name') {
      const newErrors = [...errors.items];
      newErrors[index] = '';
      setErrors(prev => ({ ...prev, items: newErrors }));
    }

    setForm({ ...form, items: updated });
  };

  // Add new item row
  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { product_name: '', packing_qty: 0, no_of_units: 0, rate_per_kg: 0, hsn_code: '' }],
    });
    
    setErrors(prev => ({
      ...prev,
      items: [...prev.items, '']
    }));
  };

  // Remove item row
  const removeItem = (index: number) => {
    const updatedItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updatedItems });

    const updatedErrors = [...errors.items];
    updatedErrors.splice(index, 1);
    setErrors(prev => ({ ...prev, items: updatedErrors }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const itemTotals = form.items.map(item => {
      const totalQty = item.packing_qty * item.no_of_units;
      return totalQty * item.rate_per_kg;
    });
    
    const subtotal = itemTotals.reduce((sum, total) => sum + total, 0);
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    
    return {
      subtotal,
      cgst,
      sgst,
      totalAmount: subtotal + cgst + sgst
    };
  };

  // Safe product selection handler
  const handleProductSelection = (idx: number, value: string) => {
    if (!value) {
      handleItemChange(idx, 'product_name', '');
      return;
    }

    const selected = products.find(p => p.name === value);
    if (selected) {
      handleItemChange(idx, 'product_name', selected.name);
      handleItemChange(idx, 'packing_qty', selected.default_packing_qty);
      handleItemChange(idx, 'rate_per_kg', selected.default_rate_per_kg);
      handleItemChange(idx, 'hsn_code', selected.hsn_code);
    }
  };

  // Unified save invoice function
  const saveInvoice = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const { subtotal, cgst, sgst, totalAmount } = calculateTotals();

    try {
      const invoicePayload = {
        ...form,
        subtotal,
        cgst,
        sgst,
        total_amount: totalAmount,
      };

      const res = await fetch('http://localhost:5000/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      if (res.ok) {
        alert('Invoice saved successfully!');
        router.push('/invoices');
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to create invoice: ${errorData.message || res.statusText}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred while submitting the invoice');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Create New Invoice</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Generate professional invoices with ease</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <BackToHome />
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Enhanced Form Section - Reduce width to give more space to preview */}
          <div className="w-full xl:w-1/2">
            <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Invoice Details</h2>
                </div>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">Fill in the invoice information below</p>
              </div>

              <form onSubmit={saveInvoice} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-gray-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Invoice Number */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <Hash className="w-4 h-4 text-blue-600" />
                        Invoice Number
                      </label>
                      <input
                        type="text"
                        placeholder="INV-001"
                        value={form.invoice_no}
                        onChange={(e) => {
                          setForm({ ...form, invoice_no: e.target.value });
                          setErrors(prev => ({ ...prev, invoice_no: '' }));
                        }}
                        className={`w-full p-3 sm:p-4 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-800 font-medium transition-all duration-200 text-sm sm:text-base ${
                          errors.invoice_no 
                            ? 'border-red-500 focus:ring-red-200 bg-red-50' 
                            : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white/70'
                        }`}
                      />
                      {errors.invoice_no && (
                        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.invoice_no}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => {
                          setForm({ ...form, date: e.target.value });
                          setErrors(prev => ({ ...prev, date: '' }));
                        }}
                        className={`w-full p-3 sm:p-4 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-800 font-medium transition-all duration-200 text-sm sm:text-base ${
                          errors.date 
                            ? 'border-red-500 focus:ring-red-200 bg-red-50' 
                            : 'border-gray-200 focus:ring-blue-200 focus:border-blue-500 bg-white/70'
                        }`}
                      />
                      {errors.date && (
                        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.date}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Buyer Section */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 sm:p-6 border border-emerald-100">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                    Buyer Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Custom Searchable Buyer Dropdown */}
                    <div className="relative" ref={buyerDropdownRef}>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <Search className="w-4 h-4 text-emerald-600" />
                        Select Buyer
                      </label>
                      <div className="relative">
                        <div
                          className={`w-full border-2 rounded-xl p-3 sm:p-4 cursor-pointer bg-white/80 backdrop-blur-sm flex items-center justify-between transition-all duration-200 hover:border-emerald-300 hover:shadow-md text-sm sm:text-base ${
                            errors.buyer 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-emerald-200'
                          } ${isBuyerDropdownOpen ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-lg' : ''}`}
                          onClick={handleBuyerDropdownToggle}
                        >
                          <span className={`font-medium ${selectedBuyerName ? 'text-gray-900' : 'text-gray-500'}`}>
                            {selectedBuyerName || '🔍 Search and select a buyer...'}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedBuyerName && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearBuyerSelection();
                                }}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            <ChevronDown 
                              className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-200 ${
                                isBuyerDropdownOpen ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
                        </div>
                        
                        {/* Dropdown Menu */}
                        {isBuyerDropdownOpen && (
                          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-emerald-200 rounded-xl shadow-2xl overflow-hidden">
                            {/* Search Input */}
                            <div className="p-3 sm:p-4 border-b border-emerald-100 bg-emerald-50/50">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
                                <input
                                  type="text"
                                  value={buyerSearchTerm}
                                  onChange={(e) => setBuyerSearchTerm(e.target.value)}
                                  placeholder="Type to search buyers..."
                                  className="w-full pl-10 sm:pl-11 pr-4 py-2 sm:py-3 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                            </div>
                            
                            {/* Buyer Options */}
                            <div className="max-h-60 overflow-y-auto">
                              {filteredBuyers.length > 0 ? (
                                filteredBuyers.map((buyer) => (
                                  <div
                                    key={buyer._id}
                                    className="p-3 sm:p-4 hover:bg-emerald-50 cursor-pointer text-sm font-medium transition-colors border-b border-emerald-50 last:border-b-0"
                                    onClick={() => handleBuyerSelect(buyer)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                                <div className="p-6 sm:p-8 text-gray-500 text-sm text-center">
                                  <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 text-gray-400" />
                                  <p className="font-medium">No buyers found</p>
                                  <p className="text-xs">matching "{buyerSearchTerm}"</p>
                                </div>
                              ) : (
                                <div className="p-6 sm:p-8 text-gray-500 text-sm text-center">
                                  <User className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-3 text-gray-400" />
                                  <p className="font-medium">No buyers available</p>
                                  <p className="text-xs">Add buyers to see them here</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.buyer && (
                        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.buyer}
                        </p>
                      )}
                    </div>

                    {/* Buyer Name Display */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <User className="w-4 h-4 text-emerald-600" />
                        Buyer Name
                      </label>
                      <input
                        type="text"
                        value={form.buyer_name}
                        readOnly
                        className="w-full p-3 sm:p-4 border-2 border-emerald-200 rounded-xl bg-emerald-50/50 text-gray-700 cursor-not-allowed font-medium text-sm sm:text-base"
                        placeholder="Will auto-populate when buyer is selected"
                      />
                    </div>
                  </div>

                  {/* Address and GSTIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <Package className="w-4 h-4 text-emerald-600" />
                        Address
                      </label>
                      <textarea
                        value={form.address}
                        readOnly
                        className="w-full p-3 sm:p-4 border-2 border-emerald-200 rounded-xl bg-emerald-50/50 text-gray-700 cursor-not-allowed h-20 sm:h-24 resize-none font-medium text-sm sm:text-base"
                        placeholder="Address will auto-populate when buyer is selected"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <Hash className="w-4 h-4 text-emerald-600" />
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={form.gstin}
                        readOnly
                        className="w-full p-3 sm:p-4 border-2 border-emerald-200 rounded-xl bg-emerald-50/50 text-gray-700 cursor-not-allowed font-medium text-sm sm:text-base"
                        placeholder="GSTIN will auto-populate when buyer is selected"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section - Mobile Optimized */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-purple-100">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      Invoice Items
                    </h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl p-4 sm:p-6 relative shadow-sm">
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        <div className="space-y-4 sm:space-y-6">
                          {/* Product Selection - Full width */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                              <Package className="w-4 h-4 text-purple-600" />
                              Product
                            </label>
                            <select
                              value={item.product_name}
                              onChange={(e) => handleProductSelection(idx, e.target.value)}
                              className={`w-full p-3 sm:p-4 border-2 rounded-xl focus:outline-none focus:ring-2 text-gray-800 bg-white/80 font-medium transition-all duration-200 text-sm sm:text-base ${
                                errors.items[idx] 
                                  ? 'border-red-500 focus:ring-red-200 bg-red-50' 
                                  : 'border-purple-200 focus:ring-purple-200 focus:border-purple-500'
                              }`}
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p._id} value={p.name} className="text-gray-800">
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {errors.items[idx] && (
                              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.items[idx]}
                              </p>
                            )}
                          </div>

                          {/* Mobile: 2x2 grid for quantities */}
                          <div className="grid grid-cols-2 gap-3 sm:gap-6">
                            {/* Packing Quantity */}
                            <div>
                              <label className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                <Package className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                <span className="hidden sm:inline">Packing Qty (kg)</span>
                                <span className="sm:hidden">Pkg Qty</span>
                              </label>
                              <input
                                type="number"
                                value={item.packing_qty}
                                onChange={(e) => handleItemChange(idx, 'packing_qty', e.target.value)}
                                className="w-full p-2 sm:p-4 border-2 border-purple-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 text-gray-800 bg-white/80 font-medium text-sm sm:text-base"
                                placeholder="0"
                              />
                            </div>

                            {/* Number of Units */}
                            <div>
                              <label className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                <span className="hidden sm:inline">Number of Units</span>
                                <span className="sm:hidden">Units</span>
                              </label>
                              <input
                                type="number"
                                value={item.no_of_units}
                                onChange={(e) => handleItemChange(idx, 'no_of_units', e.target.value)}
                                className="w-full p-2 sm:p-4 border-2 border-purple-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 text-gray-800 bg-white/80 font-medium text-sm sm:text-base"
                                placeholder="0"
                              />
                            </div>

                            {/* Total Quantity */}
                            <div>
                              <label className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                <Package className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                <span className="hidden sm:inline">Total Qty (kg)</span>
                                <span className="sm:hidden">Total</span>
                              </label>
                              <input
                                type="number"
                                value={item.packing_qty * item.no_of_units || 0}
                                readOnly
                                className="w-full p-2 sm:p-4 border-2 border-purple-200 rounded-lg sm:rounded-xl text-gray-800 bg-purple-50/50 cursor-not-allowed font-bold text-sm sm:text-base"
                              />
                            </div>

                            {/* Rate Per Kg */}
                            <div>
                              <label className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                                <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                                <span className="hidden sm:inline">Rate/Kg (₹)</span>
                                <span className="sm:hidden">Rate</span>
                              </label>
                              <input
                                type="number"
                                value={item.rate_per_kg}
                                onChange={(e) => handleItemChange(idx, 'rate_per_kg', e.target.value)}
                                className="w-full p-2 sm:p-4 border-2 border-purple-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 text-gray-800 bg-white/80 font-medium text-sm sm:text-base"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Item Total - Full width */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                              <Hash className="w-4 h-4 text-purple-600" />
                              Item Total (₹)
                            </label>
                            <input
                              type="number"
                              value={(item.packing_qty * item.no_of_units * item.rate_per_kg) || 0}
                              readOnly
                              className="w-full p-3 sm:p-4 border-2 border-purple-200 rounded-xl text-gray-800 bg-purple-50/50 cursor-not-allowed font-bold text-base sm:text-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 sm:pt-6">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 w-full sm:w-auto"
                  >
                    <Save className="w-5 h-5 sm:w-6 sm:h-6" />
                    Generate Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Desktop Preview Section - Increase width */}
          <div className="hidden xl:block w-full xl:w-1/2 sticky top-6 self-start">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <h3 className="text-white font-semibold text-lg">Invoice Preview</h3>
              </div>
              <div className="p-4">
                <InvoicePreview form={form} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Preview Button and Modal */}
        <div className="xl:hidden mt-6">
          <button
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-4 rounded-xl font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Eye className="w-5 h-5" />
            {showMobilePreview ? 'Hide Invoice Preview' : 'Show Invoice Preview'}
          </button>
          
         {showMobilePreview && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center">
    <div className="w-full max-w-5xl max-h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-base sm:text-lg">Invoice Preview</h3>
          <button
            onClick={() => setShowMobilePreview(false)}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Add overflow-x-auto and min-w-[360px] to this wrapper */}
      <div className="p-2 sm:p-4 overflow-y-auto max-h-[calc(95vh-80px)] bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <div className="min-w-[360px]">
            <InvoicePreview form={form} />
          </div>
        </div>
      </div>
    </div>
  </div>
          )}
        </div>
      </div>
    </div>
  );
}