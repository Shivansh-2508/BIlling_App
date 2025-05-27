'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Save } from 'lucide-react';
import { InvoicePreview } from '@/components/InvoicePreview';
import BackToHome from '@/components/BackToHome';

export default function CreateInvoicePage() {
  const router = useRouter();
const fmt = (n: number | string) => Number(n).toFixed(2);
  // Buyer-related state
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [products, setProducts] = useState([]);

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

// Handle buyer selection
const handleBuyerChange = (e) => {
  const buyerId = e.target.value;
  setSelectedBuyerId(buyerId);
  setErrors(prev => ({ ...prev, buyer: '' }));

  const selected = buyers.find((b) => b._id === buyerId);
  if (selected) {
    setForm((prev) => ({
      ...prev,
      buyer_name: selected.name,
      address: selected.address,
      gstin: selected.gstin || '', // Add this line
    }));
  }
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
      items: [...form.items, { product_name: '', packing_qty: 0, no_of_units: 0, rate_per_kg: 0 }],
    });
    
    // Add a new error slot for the new item
    setErrors(prev => ({
      ...prev,
      items: [...prev.items, '']
    }));
  };

  // Remove item row
  const removeItem = (index: number) => {
    const updatedItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updatedItems });

    // Update errors
    const updatedErrors = [...errors.items];
    updatedErrors.splice(index, 1);
    setErrors(prev => ({ ...prev, items: updatedErrors }));
  };

  // Calculate totals
  const calculateTotals = () => {
    // Calculate item totals
    const itemTotals = form.items.map(item => {
      const totalQty = item.packing_qty * item.no_of_units;
      return totalQty * item.rate_per_kg;
    });
    
    // Calculate subtotal
    const subtotal = itemTotals.reduce((sum, total) => sum + total, 0);
    
    // Calculate taxes (assuming 9% each for CGST and SGST)
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
    handleItemChange(idx, 'hsn_code', selected.hsn_code); // <-- Add this
  }
};


  // Unified save invoice function (combines previous handleSubmit and handleSaveInvoice)
  const saveInvoice = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Calculate all totals
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center mb-6 border-b pb-4">
        <FileText className="w-8 h-8 mr-3 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-00">Create New Invoice</h1>
      </div>
      <BackToHome/>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Section */}
        <div className="w-full lg:w-3/5 bg-white shadow-lg rounded-xl p-6">
          <form onSubmit={saveInvoice} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 ${
                    errors.invoice_no 
                      ? 'border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                />
                {errors.invoice_no && (
                  <p className="text-red-500 text-xs mt-1">{errors.invoice_no}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => {
                    setForm({ ...form, date: e.target.value });
                    setErrors(prev => ({ ...prev, date: '' }));
                  }}
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 ${
                    errors.date 
                      ? 'border-red-500 focus:ring-red-200' 
                      : 'border-gray-300 focus:ring-blue-200'
                  }`}
                />
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Buyer Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Buyer Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buyer Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Buyer
                  </label>
                  <select
                    value={selectedBuyerId}
                    onChange={handleBuyerChange}
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 bg-white ${
                      errors.buyer 
                        ? 'border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:ring-blue-200'
                    }`}
                  >
                    <option value="">-- Choose Buyer --</option>
                    {buyers.map((buyer) => (
                      <option key={buyer._id} value={buyer._id} className="text-gray-800">
                        {buyer.name}
                      </option>
                    ))}
                  </select>
                  {errors.buyer && (
                    <p className="text-red-500 text-xs mt-1">{errors.buyer}</p>
                  )}
                </div>

                {/* Buyer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buyer Name
                  </label>
                  <input
                    type="text"
                    value={form.buyer_name}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={form.address}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed h-24"
                />
              </div>


              {/* GSTIN */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={form.gstin}
                    readOnly
                    className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Invoice Items</h2>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                >
                  <Plus className="w-5 h-5 mr-2" /> Add Item
                </button>
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} className="bg-white border rounded-lg p-4 mb-4 shadow-sm relative">
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Product Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product
                      </label>
                      <select
                        value={item.product_name}
                        onChange={(e) => handleProductSelection(idx, e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-gray-800 bg-white ${
                          errors.items[idx] 
                            ? 'border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-blue-200'
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
                        <p className="text-red-500 text-xs mt-1">{errors.items[idx]}</p>
                      )}
                    </div>

                    {/* Packing Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Packing Quantity (kg)
                      </label>
                      <input
                        type="number"
                        value={item.packing_qty}
                        onChange={(e) => handleItemChange(idx, 'packing_qty', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800"
                      />
                    </div>

                    {/* Number of Units */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Units
                      </label>
                      <input
                        type="number"
                        value={item.no_of_units}
                        onChange={(e) => handleItemChange(idx, 'no_of_units', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800"
                      />
                    </div>

                    {/* Total Quantity (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Quantity (kg)
                      </label>
                      <input
                        type="number"
                        value={item.packing_qty * item.no_of_units || 0}
                        readOnly
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 bg-gray-100"
                      />
                    </div>

                    {/* Rate Per Kg */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rate Per Kg
                      </label>
                      <input
                        type="number"
                        value={item.rate_per_kg}
                        onChange={(e) => handleItemChange(idx, 'rate_per_kg', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800"
                      />
                    </div>

                    {/* Item Total (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Total
                      </label>
                      <input
                        type="number"
                        value={(item.packing_qty * item.no_of_units * item.rate_per_kg) || 0}
                        readOnly
                        className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                <Save className="w-5 h-5 mr-2" /> Generate Invoice
              </button>
            </div>
          </form>
        </div>
        
        {/* Preview Section */}
        <div className="w-full lg:w-2/5 sticky top-6 self-start">
          <InvoicePreview form={form} />
        </div>
      </div>
    </div>
  );
}

