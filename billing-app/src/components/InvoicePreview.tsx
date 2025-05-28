import React from 'react';

interface Item {
  product_name: string;
  packing_qty: number;
  no_of_units?: number;
  units?: number;
  rate_per_kg: number;
  hsn_code?: string;
}

interface PreviewProps {
  form: {
    invoice_no: string;
    date: string;
    buyer_name: string;
    address: string;
    gstin: string;
    items: Item[];
    subtotal?: number;
    cgst?: number;
    sgst?: number;
    total_amount?: number;
  };
}

export function InvoicePreview({ form }: PreviewProps) {
  const { invoice_no, date, buyer_name, address, gstin, items } = form;
  
  // Helper function to safely convert to number
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };
  
  // Calculate totals with proper error handling
  const subtotal = form.subtotal ?? items.reduce((sum, item) => {
    const packingQty = safeNumber(item.packing_qty);
    const units = safeNumber(item.no_of_units ?? item.units ?? 0);
    const ratePerKg = safeNumber(item.rate_per_kg);
    
    return sum + (packingQty * units * ratePerKg);
  }, 0);
  
  const cgst = form.cgst ?? (subtotal * 0.09);
  const sgst = form.sgst ?? (subtotal * 0.09);
  const total = form.total_amount ?? (subtotal + cgst + sgst);
  
  const fmt = (n: number | string) => {
    const num = safeNumber(n);
    return num.toFixed(2);
  };

  const fmtIndian = (n: number) => {
    const num = safeNumber(n);
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(num);
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

  // Fixed Convert number to words function with proper error handling
  const numberToWords = (num: number | string) => {
    // Safely convert input to number
    const safeNum = safeNumber(num);
    
    // Return early for invalid numbers
    if (safeNum < 0) return 'Invalid Amount';
    if (safeNum === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    try {
      const numStr = safeNum.toFixed(2);
      const rupees = Math.floor(safeNum);
      const paise = Math.round((safeNum - rupees) * 100);
      
      const inWords = (n: number): string => {
        // Add safety checks for the input parameter
        const safeN = Math.floor(safeNumber(n));
        
        if (safeN === 0) return '';
        else if (safeN < 20 && safeN > 0) return (ones[safeN] || '') + ' ';
        else if (safeN < 100) {
          const tensIndex = Math.floor(safeN / 10);
          const remainder = safeN % 10;
          return (tens[tensIndex] || '') + ' ' + inWords(remainder);
        }
        else if (safeN < 1000) {
          const hundredsIndex = Math.floor(safeN / 100);
          const remainder = safeN % 100;
          return (ones[hundredsIndex] || '') + ' Hundred ' + inWords(remainder);
        }
        else if (safeN < 100000) {
          const thousands = Math.floor(safeN / 1000);
          const remainder = safeN % 1000;
          return inWords(thousands) + 'Thousand ' + inWords(remainder);
        }
        else if (safeN < 10000000) {
          const lakhs = Math.floor(safeN / 100000);
          const remainder = safeN % 100000;
          return inWords(lakhs) + 'Lakh ' + inWords(remainder);
        }
        else {
          const crores = Math.floor(safeN / 10000000);
          const remainder = safeN % 10000000;
          return inWords(crores) + 'Crore ' + inWords(remainder);
        }
      };
      
      let result = inWords(rupees).trim() + ' Rupees';
      if (paise > 0) {
        result += ' and ' + inWords(paise).trim() + ' Paise';
      }
      
      return result + ' Only';
      
    } catch (error) {
      console.error('Error in numberToWords:', error);
      return 'Amount Calculation Error';
    }
  };

  // Validate and format GSTIN display
  const formatGSTIN = (gstinValue: string | undefined | null) => {
    if (!gstinValue || gstinValue.toString().trim() === '') {
      return 'Not Provided';
    }
    
    const trimmedGSTIN = gstinValue.toString().trim();
    
    if (trimmedGSTIN.length !== 15) {
      console.warn(`Invalid GSTIN length: ${trimmedGSTIN} (should be 15 characters)`);
    }
    
    return trimmedGSTIN.toUpperCase();
  };

  // Get today's date if not provided
  const invoiceDate = date ? formatDate(date) : formatDate(new Date().toISOString());
  const challDate = date ? formatDate(date) : formatDate(new Date().toISOString());
  const challNo = invoice_no || 'Not specified';

  return (
    <div className="w-full border font-sans bg-white text-black print:text-black">
      {/* Header */}
      <div className="border-b p-4 font-serif">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-extrabold tracking-wide text-center font-serif">
            SHIVANSH INKS
          </h1>
          <p className="text-sm text-gray-700 tracking-wider text-center uppercase">
            All Kinds of Flexo & Roto PTG Inks
          </p>
          <p className="text-xs text-gray-600 text-center mt-1">
            Gala no C/9, Gala no 1, Parasnath Complex, Mankoli Dapoda Road, Bhiwandi, Thane 421302
          </p>
          <p className="text-xs text-gray-600 text-center tracking-wider">
            GSTIN: <span className="font-mono font-medium">27AREPK4801E1Z5</span>
          </p>
        </div>

        <div className="text-center text-xl font-bold border-t pt-3 mt-2 tracking-wider">
          TAX INVOICE
        </div>
      </div>

      {/* Invoice Details and Customer Info */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b text-xs">
        <div className='col-span-2 border-r'>
          <p><strong>{buyer_name || 'No buyer selected'}</strong></p>
          <p><strong>Address: </strong> {address || ''}</p>
          <p>
            <strong>GSTIN: </strong>
            <span
              className="ml-1"
              style={{
                color: !gstin?.trim() ? '#999' : 'inherit',
                fontStyle: !gstin?.trim() ? 'italic' : 'normal',
              }}
            >
              {formatGSTIN(gstin)}
            </span>
          </p>
          <p><strong>State: </strong> MAHARASHTRA <strong>Code: </strong> 27</p>
        </div>

        <div>
          <p><strong>Invoice No:</strong> {invoice_no || 'Not specified'}</p>
          <p><strong>Invoice Date:</strong> {invoiceDate}</p>
          <p><strong>Challan No:</strong> {challNo}</p>
          <p><strong>Challan Date:</strong> {challDate}</p>
        </div>
      </div>

      {/* Transport Info */}
      <div className="grid grid-cols-3 gap-4 text-xs p-1 border-b">
        <p><strong>Transporter:</strong></p>
        <p><strong>Vehicle No:</strong></p>
        <p><strong>L/R or R/R No:</strong></p>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden font-sans border-b">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-100 border-y">
              <th className="border p-1 text-left w-[8%]">Sr.No.</th>
              <th className="border p-1 text-left w-[35%]">Description Of Goods</th>
              <th className="border p-1 text-left w-[12%]">HSN Code</th>
              <th className="border p-1 text-right w-[10%]">Quantity</th>
              <th className="border p-1 text-right w-[15%]">KG</th>
              <th className="border p-1 text-right w-[10%]">PRICE</th>
              <th className="border p-1 text-right w-[10%]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items?.length > 0 ? items.map((item, idx) => {
              const packingQty = safeNumber(item.packing_qty);
              const units = safeNumber(item.no_of_units ?? item.units ?? 0);
              const ratePerKg = safeNumber(item.rate_per_kg);
              const totalQty = packingQty * units;
              const amt = totalQty * ratePerKg;
              
              return (
                <tr key={idx} className="border-b">
                  <td className="border p-1 text-center">{idx + 1}</td>
                  <td className="border p-1">{item.product_name || 'Not specified'}</td>
                  <td className="border p-1 text-center">{item.hsn_code || ''}</td>
                  <td className="border p-1 text-right">{packingQty}</td>
                  <td className="border p-1 text-right">{packingQty} x {units} = {totalQty}</td>
                  <td className="border p-1 text-right">{fmt(ratePerKg)}</td>
                  <td className="border p-1 text-right">{fmtIndian(amt)}</td>
                </tr>
              );
            }) : (
              <tr className="border-b">
                <td className="border p-1 text-center" colSpan={7}>No items found</td>
              </tr>
            )}

            {Array(Math.max(0, 8 - (items?.length || 0))).fill(0).map((_, idx) => (
              <tr key={`empty-${idx}`} className="border-b h-[10px]">
                {Array(7).fill(0).map((__, i) => (
                  <td key={i} className="border p-1">&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex border-b text-xs">
        <div className="w-2/3 p-4 border-r">
          <p className="font-semibold">Invoice Amount In Words:</p>
          <p>{numberToWords(total)}</p>

          <div className="mt-2">
            <p className="font-semibold">GST Amount In Words:</p>
            <p>{numberToWords(cgst + sgst)}</p>
          </div>

          <div className="mt-2">
            <p className="font-semibold">Payment Terms</p>
            <p>IMMEDIATE</p>
          </div>

          <div className="mt-2 py-2 border-y text-xs">
            <ol className="list-decimal pl-4">
              <li>Our responsibility ceases as soon as the goods leave our godown.</li>
              <li>Payment to be made by cheque in favor of SHIVANSH INKS</li>
              <li>Interest will be charged @ 36% after Due Date.</li>
              <li>Only our official receipt will be recognized.</li>
              <li>Subject to jurisdiction only. E.&O.E.</li>
            </ol>
          </div>

          <div className="mt-2">
            <p>Our Bank Name: GREATER BANK BHANDUP</p>
            <p>Bank A/C No: 30202380455</p>
            <p>IFSC: GBCB0000022</p>
          </div>
        </div>

        <div className="w-1/3 font-mono p-4">
          <p className="flex justify-between">
            <span>Total:</span> <span>₹{fmt(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>CGST: 9.0%</span> <span>₹{fmtIndian(cgst)}</span>
          </p>
          <p className="flex justify-between">
            <span>SGST: 9.0%</span> <span>₹{fmtIndian(sgst)}</span>
          </p>
          <p className="flex justify-between">
            <span>IGST: 18.0%</span> <span>-</span>
          </p>
          <p className="flex justify-between text-sm font-bold border-t mt-1 pt-1">
            <span>GROSS TOTAL:</span> <span>₹{fmtIndian(total)}</span>
          </p>

          <div className="mt-4">
            <p className="mb-1">Payment details</p>
            <p>DATE:</p>
            <p>CHEQUE NO:</p>
            <p>AMOUNT:</p>
            <p>CASH:</p>
          </div>

          <div className="mt-2 border-t pt-2 text-center">
            <p>For SHIVANSH INKS</p>
            <div className="h-5"></div>
            <p>Proprietor</p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-2 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="italic"> <strong>(ORIGINAL FOR RECIPIENT)</strong></p>
          <p>Certified that the particulars given above are true and correct</p>
        </div>
        <div className="col-span-2 text-center border-l pb-10">
          <p className="mt-1 font-semibold">Receiver's Signature with Rubber Stamp</p>
        </div>
      </div>
    </div>
  );
}