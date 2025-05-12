'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateInvoicePage() {
  const router = useRouter();

  // Buyer-related state
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');

  // Invoice form state
  const [form, setForm] = useState({
    invoice_no: '',
    date: '',
    buyer_name: '',
    address: '',
    items: [
      { product_name: '', packing_qty: 0, units: 0, rate_per_kg: 0 },
    ],
  });

  // Fetch buyers on mount
  useEffect(() => {
    fetch("http://localhost:5000/buyers")
      .then((res) => res.json())
      .then((data) => setBuyers(data))
      .catch((err) => console.error("Error fetching buyers:", err));
  }, []);

  // Handle buyer selection
  const handleBuyerChange = (e) => {
    const buyerId = e.target.value;
    setSelectedBuyerId(buyerId);

    const selected = buyers.find((b) => b._id === buyerId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        buyer_name: selected.name,
        address: selected.address,
      }));
    }
  };

  // Handle item changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...form.items];
    updated[index][field] = field === 'product_name' ? value : Number(value);
    setForm({ ...form, items: updated });
  };

  // Add new item row
  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { product_name: '', packing_qty: 0, units: 0, rate_per_kg: 0 }],
    });
  };

  // Handle form submission
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push('/invoices');
    } else {
      alert('Failed to create invoice');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Create Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Invoice Number"
          value={form.invoice_no}
          onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
          className="border p-2 rounded w-full"
        />

        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="border p-2 rounded w-full"
        />

        {/* Buyer Dropdown */}
        <label className="block">Select Buyer</label>
        <select
          value={selectedBuyerId}
          onChange={handleBuyerChange}
          className="border p-2 rounded w-full"
        >
          <option value="">-- Choose Buyer --</option>
          {buyers.map((buyer) => (
            <option key={buyer._id} value={buyer._id}>
              {buyer.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buyer Name"
          value={form.buyer_name}
          readOnly
          className="border p-2 rounded w-full bg-gray-100"
        />

        <textarea
          placeholder="Address"
          value={form.address}
          readOnly
          className="border p-2 rounded w-full bg-gray-100"
        />

        {/* Items List */}
        <div className="space-y-4">
          {form.items.map((item, idx) => (
            <div key={idx} className="border p-4 rounded">
              <input
                type="text"
                placeholder="Product Name"
                value={item.product_name}
                onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <input
                type="number"
                placeholder="Packing Qty (e.g. 10kg)"
                value={item.packing_qty}
                onChange={(e) => handleItemChange(idx, 'packing_qty', e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <input
                type="number"
                placeholder="Number of Units"
                value={item.units}
                onChange={(e) => handleItemChange(idx, 'units', e.target.value)}
                className="border p-2 rounded w-full mb-2"
              />
              <input
                type="number"
                placeholder="Rate per KG"
                value={item.rate_per_kg}
                onChange={(e) => handleItemChange(idx, 'rate_per_kg', e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          + Add Item
        </button>

        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded ml-4"
        >
          Save Invoice
        </button>
      </form>
    </div>
  );
}
