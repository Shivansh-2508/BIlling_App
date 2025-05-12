import React from 'react';

interface Item {
  product_name: string;
  packing_qty: number;
  no_of_units?: number; // Match the property name from the main form
  units?: number; // Keep for backward compatibility
  rate_per_kg: number;
}

interface PreviewProps {
  form: {
    invoice_no: string;
    date: string;
    buyer_name: string;
    address: string;
    items: Item[];
  };
}

export function InvoicePreview({ form }: PreviewProps) {
  const { invoice_no, date, buyer_name, address, items } = form;
  
  // Calculate totals, handling both units and no_of_units property names
  const subtotal = items.reduce((sum, item) => {
    const units = item.no_of_units ?? item.units ?? 0;
    return sum + item.packing_qty * units * item.rate_per_kg;
  }, 0);
  
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const total = subtotal + cgst + sgst;
  const fmt = (n: number) => n.toFixed(2);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="w-full max-w-lg border p-6 rounded-lg bg-white shadow text-black">
      {/* Header */}
      <div className="text-center mb-4 text-black">
        <h2 className="text-2xl font-bold text-black">SHIVANSH INKS</h2>
        <p className="text-black">ALL KINDS OF FLEXO & ROTO PTG INKS</p>
        <p className="text-black">Gala C-9, Parasnath Complex, Thane, MH | GSTIN: 27XXXXXX</p>
      </div>
      
      {/* Metadata */}
      <div className="grid grid-cols-2 mb-4 text-sm text-black">
        <div className="text-black"><strong className="text-black">Invoice No:</strong> {invoice_no || 'Not specified'}</div>
        <div className="text-black"><strong className="text-black">Date:</strong> {formatDate(date)}</div>
      </div>
      
      {/* Buyer */}
      <div className="mb-4 text-sm border-b pb-2 text-black">
        <strong className="text-black">Billed To:</strong><br/>
        {buyer_name || 'No buyer selected'}<br/>
        {address || ''}
      </div>
      
      {/* Items Table */}
      <table className="w-full text-sm mb-4 text-black">
        <thead className="bg-gray-50 text-black">
          <tr className="border-b text-black">
            <th className="text-left p-2 text-black">Product</th>
            <th className="text-right p-2 text-black">Pck Qty</th>
            <th className="text-right p-2 text-black">Units</th>
            <th className="text-right p-2 text-black">Total Qty</th>
            <th className="text-right p-2 text-black">Rate</th>
            <th className="text-right p-2 text-black">Amount</th>
          </tr>
        </thead>
        <tbody className="text-black">
          {items.map((item, idx) => {
            const units = item.no_of_units ?? item.units ?? 0;
            const totalQty = item.packing_qty * units;
            const amt = totalQty * item.rate_per_kg;
            
            return (
              <tr key={idx} className="border-b text-black">
                <td className="p-2 text-black">{item.product_name || 'Not selected'}</td>
                <td className="text-right p-2 text-black">{item.packing_qty || 0}</td>
                <td className="text-right p-2 text-black">{units}</td>
                <td className="text-right p-2 text-black">{totalQty}</td>
                <td className="text-right p-2 text-black">₹{fmt(item.rate_per_kg || 0)}</td>
                <td className="text-right p-2 text-black">₹{fmt(amt)}</td>
              </tr>
            );
          })}
          
          {/* Empty row for visual spacing */}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center p-4 text-black">No items added</td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Totals */}
      <div className="text-right text-sm border-t pt-2 text-black">
        <p className="flex justify-between text-black"><span className="text-black">Subtotal:</span> <span className="text-black">₹{fmt(subtotal)}</span></p>
        <p className="flex justify-between text-black"><span className="text-black">CGST 9%:</span> <span className="text-black">₹{fmt(cgst)}</span></p>
        <p className="flex justify-between text-black"><span className="text-black">SGST 9%:</span> <span className="text-black">₹{fmt(sgst)}</span></p>
        <p className="flex justify-between font-bold mt-2 pt-2 border-t text-black">
          <span className="text-black">Grand Total:</span> 
          <span className="text-black">₹{fmt(total)}</span>
        </p>
      </div>
    </div>
  );
}