'use client';

import { useEffect, useState } from 'react';

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
  buyer_name: string;
  address: string;
  items: Item[];
  subtotal: number;
  cgst: number;
  sgst: number;
  total_amount: number;
}

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/invoices') // Update if deployed elsewhere
      .then((res) => res.json())
      .then((data) => setInvoices(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Invoices</h1>
      <div className="space-y-4">
        {invoices.map((inv) => (
          <div key={inv._id} className="border p-4 rounded shadow">
            <p><strong>Invoice No:</strong> {inv.invoice_no}</p>
            <p><strong>Date:</strong> {inv.date}</p>
            <p><strong>Buyer:</strong> {inv.buyer_name}</p>
            <p><strong>Address:</strong> {inv.address}</p>
            <p><strong>Total:</strong> ₹{inv.total_amount.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
