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
    gstin: string; // Add this line
    items: Item[];
    subtotal?: number;
    cgst?: number;
    sgst?: number;
    total_amount?: number;
  };
}
export function InvoicePreview({ form }: PreviewProps) {
  const { invoice_no, date, buyer_name, address, items } = form;
  
  // Calculate totals, handling both units and no_of_units property names
  const subtotal = form.subtotal ?? items.reduce((sum, item) => {
    const units = item.no_of_units ?? item.units ?? 0;
    return sum + item.packing_qty * units * item.rate_per_kg;
  }, 0);
  
  const cgst = form.cgst ?? subtotal * 0.09;
  const sgst = form.sgst ?? subtotal * 0.09;
  const total = form.total_amount ?? subtotal + cgst + sgst;
  
  const fmt = (n: number | string) => Number(n).toFixed(2);

  const fmtIndian = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(n);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Convert number to words (for invoice total)
  const numberToWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numStr = num.toFixed(2);
    const rupees = parseInt(numStr);
    const paise = parseInt(numStr.substring(numStr.length - 2));
    
    if (rupees === 0) return 'Zero Rupees';
    
    const inWords = (n: number): string => {
      if (n === 0) return '';
      else if (n < 20) return ones[n] + ' ';
      else if (n < 100) return tens[Math.floor(n / 10)] + ' ' + inWords(n % 10);
      else if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
      else if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
      else if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
      else return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
    };
    
    let result = inWords(rupees).trim() + ' Rupees';
    if (paise > 0) {
      result += ' and ' + inWords(paise).trim() + ' Paise';
    }
    
    return result + ' Only';
  };

  // Get today's date if not provided
  const invoiceDate = date ? formatDate(date) : formatDate(new Date().toISOString());
  const challDate = date ? formatDate(date) : formatDate(new Date().toISOString());
  const challNo = invoice_no || 'Not specified';

  return (
    <div className="w-full border bg-white text-black print:text-black" style={{ minHeight: '29.7cm' }}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex flex-col items-center mb-2">
          <h1 className="text-3xl font-bold text-center">SHIVANSH INKS</h1>
          <p className="text-sm text-center">ALL KINDS OF FLEXO & ROTO PTG INKS</p>
          <p className="text-xs text-center mt-1">
            Gala no C/9, Gala no 1, Parasnath Complex, Mankoli Dapoda Road, Bhiwandi, Thane 421302
          </p>
          <p className="text-xs text-center">GSTIN: 27AACPA8313L1ZU</p>
        </div>
        
        <div className="text-center text-xl font-bold border-y py-2 my-2">
          TAX INVOICE
        </div>
      </div>
      
      {/* Invoice Details and Customer Info */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b">
        <div>
          <p className="text-sm"><strong>Invoice No:</strong> {invoice_no || 'Not specified'}</p>
          <p className="text-sm"><strong>Invoice Date:</strong> {invoiceDate}</p>
          <p className="text-sm"><strong>Challan No:</strong> {challNo}</p>
          <p className="text-sm"><strong>Challan Date:</strong> {challDate}</p>
        </div>
        
       <div>
        <p className="text-sm"><strong>M/s:</strong> {buyer_name || 'No buyer selected'}</p>
        <p className="text-sm">{address || ''}</p>
        <p className="text-sm"><strong>GSTIN:</strong> {form.gstin || '-'}</p> {/* Update this line */}
        <p className="text-sm"><strong>State:</strong> MAHARASHTRA <strong>Code:</strong> 27</p>
      </div>
      </div>
      
      {/* Transport Info */}
      <div className="grid grid-cols-3 gap-4 text-xs p-4 border-b">
        <div>
          <p><strong>Transporter:</strong></p>
        </div>
        <div>
          <p><strong>Vehicle No:</strong></p>
        </div>
        <div>
          <p><strong>L/R or R/R No:</strong></p>
        </div>
      </div>
      
      {/* Items Table */}
      <div className="overflow-x-auto border-b">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-y">
              <th className="border p-2 text-left">Sr.No.</th>
              <th className="border p-2 text-left">HSN Code</th>
              <th className="border p-2 text-left">Description Of Goods</th>
              <th className="border p-2 text-right">Quantity</th>
              <th className="border p-2 text-right">KG</th>
              <th className="border p-2 text-right">PRICE</th>
              <th className="border p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const units = item.no_of_units ?? item.units ?? 0;
              const totalQty = item.packing_qty * units;
              const amt = totalQty * item.rate_per_kg;
              
              return (
                <tr key={idx} className="border-b">
                  <td className="border p-2">{idx + 1}</td>
                  <td className="border p-2">32151990</td>
                  <td className="border p-2">{item.product_name || 'Not specified'}</td>
                  <td className="border p-2 text-right">{item.packing_qty || 0}</td>
                  <td className="border p-2 text-right"> {item.packing_qty} x {item.no_of_units ?? item.units ?? 0} = {totalQty}</td>
                  <td className="border p-2 text-right">{fmt(item.rate_per_kg || 0)}</td>
                  <td className="border p-2 text-right">{fmtIndian(amt)}</td>
                </tr>
              );
            })}
            
            {/* Empty row for visual spacing or if no items */}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="border text-center p-4">No items added</td>
              </tr>
            )}
            
            {/* Empty rows to ensure table has reasonable height */}
            {items.length < 5 && Array(5 - items.length).fill(0).map((_, idx) => (
              <tr key={`empty-${idx}`} className="border-b">
                {Array(7).fill(0).map((_, cellIdx) => (
                  <td key={`empty-cell-${idx}-${cellIdx}`} className="border p-2">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Totals Section */}
      <div className="flex border-b">
        <div className="w-2/3 p-4 border-r">
          <p className="text-sm font-semibold">Invoice Amount In Words:</p>
          <p className="text-sm">{numberToWords(total)}</p>
          
          <div className="mt-4">
            <p className="text-sm font-semibold">GST Amount In Words:</p>
            <p className="text-sm">{numberToWords(cgst + sgst)}</p>
          </div>
          
          <div className="mt-4 text-xs">
            <p className="font-semibold">Payment Terms</p>
            <p>IMMEDIATE</p>
          </div>
          
          <div className="mt-6 text-xs">
            <ol className="list-decimal pl-4">
              <li>Our responsibility ceases as soon as the goods leave our godown.</li>
              <li>Payment to be made by cheque in favor of SHIVANSH INKS</li>
              <li>Interest will be charged @ 36% after Due Date.</li>
              <li>Only our official receipt will be recognized.</li>
              <li>Subject to jurisdiction only. E.&O.E.</li>
            </ol>
          </div>
        </div>
        
        <div className="w-1/3 p-4">
          <p className="flex justify-between text-sm">
            <span>Total:</span>
            <span>₹{fmt(subtotal)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span>CGST: 9.0%</span>
            <span>₹{fmtIndian(cgst)}</span>
          </p>
          <p className="flex justify-between text-sm">
            <span>SGST: 9.0%</span>
            <span>₹{fmtIndian(sgst)}</span>
          </p>
          <p className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
            <span>GROSS TOTAL:</span>
            <span>₹{fmtIndian(total)}</span>
          </p>
          
          <div className="mt-8">
            <p className="text-xs mb-1">Payment details</p>
            <p className="text-xs">DATE:</p>
            <p className="text-xs">CHEQUE NO:</p>
            <p className="text-xs">AMOUNT:</p>
            <p className="text-xs">CASH:</p>
          </div>
          
          <div className="mt-8 border-t pt-2">
            <p className="text-center text-xs">For SHIVANSH INKS</p>
            <div className="h-12"></div>
            <p className="text-center text-xs">Proprietor</p>
          </div>
        </div>
      </div>
      
      {/* Bank Details */}
      <div className="p-4 text-xs grid grid-cols-3 gap-4">
        <div>
          <p><strong>Our Bank Name:</strong> GREATER BANK BHANDUP</p>
          <p><strong>Bank A/C No:</strong> 30202380455</p>
          <p><strong>IFSC:</strong> GBCB0000022</p>
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm italic">(ORIGINAL FOR RECIPIENT)</p>
          <p className="text-xs">Certified that the particulars given above are true and correct</p>
          <p className="mt-4">Receiver's Signature with Rubber Stamp</p>
        </div>
      </div>
    </div>
  );
}