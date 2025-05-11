"use client";

import { useState } from "react";

export default function CreateInvoice() {
  const [invoice, setInvoice] = useState({
    invoice_no: "",
    date: "",
    buyer_name: "",
    address: "",
    items: [
      {
        description: "",
        packing_qty: 0,
        units: 0,
        rate_per_kg: 0,
      },
    ],
  });

  const handleChange = (e: any, index?: number) => {
    const { name, value } = e.target;
    if (index !== undefined) {
      const updatedItems = [...invoice.items];
      updatedItems[index][name] = value;
      setInvoice({ ...invoice, items: updatedItems });
    } else {
      setInvoice({ ...invoice, [name]: value });
    }
  };

  const addItem = () => {
    setInvoice({
      ...invoice,
      items: [
        ...invoice.items,
        {
          description: "",
          packing_qty: 0,
          units: 0,
          rate_per_kg: 0,
        },
      ],
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice),
    });

    const data = await res.json();
    console.log("Invoice submitted:", data);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Invoice</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="invoice_no"
          placeholder="Invoice Number"
          onChange={handleChange}
          className="border p-2 w-full"
        />
        <input
          type="date"
          name="date"
          onChange={handleChange}
          className="border p-2 w-full"
        />
        <input
          type="text"
          name="buyer_name"
          placeholder="Buyer Name"
          onChange={handleChange}
          className="border p-2 w-full"
        />
        <textarea
          name="address"
          placeholder="Address"
          onChange={handleChange}
          className="border p-2 w-full"
        />

        <h2 className="text-lg font-semibold">Items</h2>
        {invoice.items.map((item, index) => (
          <div key={index} className="grid grid-cols-4 gap-2">
            <input
              type="text"
              name="description"
              placeholder="Description"
              onChange={(e) => handleChange(e, index)}
              className="border p-2"
            />
            <input
              type="number"
              name="packing_qty"
              placeholder="Packing Qty (kg)"
              onChange={(e) => handleChange(e, index)}
              className="border p-2"
            />
            <input
              type="number"
              name="units"
              placeholder="Units"
              onChange={(e) => handleChange(e, index)}
              className="border p-2"
            />
            <input
              type="number"
              name="rate_per_kg"
              placeholder="Rate per Kg"
              onChange={(e) => handleChange(e, index)}
              className="border p-2"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Add Item
        </button>

        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Submit Invoice
        </button>
      </form>
    </div>
  );
}
