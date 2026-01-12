'use client';

import { useState, useEffect } from 'react';
import BackToHome from '@/components/BackToHome';
import { Upload } from 'lucide-react';

interface Supplier {
  _id: string;
  name: string;
  address: string;
  contact: string;
}

export default function CreatePurchasePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    purchase_no: `PUR-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    amount: '',
    invoice_number: '',
    description: '',
    reference: ''
  });

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/suppliers`);
      const data = await response.json();
      setSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplier_name || !formData.amount) {
      setError('Please fill in supplier and amount');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const purchaseData = {
        purchase_no: formData.purchase_no,
        date: formData.date,
        supplier_name: formData.supplier_name,
        amount: parseFloat(formData.amount),
        invoice_number: formData.invoice_number || null,
        invoice_file: fileName || null,
        description: formData.description,
        reference: formData.reference,
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });

      if (response.ok) {
        setSuccess('Purchase recorded successfully!');
        setTimeout(() => {
          window.location.href = '/purchases';
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to record purchase');
      }
    } catch (err) {
      setError('Error recording purchase');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <BackToHome />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Record Purchase</h1>
          <p className="text-gray-600 mt-2">Add a simple purchase record with optional invoice</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
              {success}
            </div>
          )}

          {/* Basic Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Purchase Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase #</label>
                <input
                  type="text"
                  name="purchase_no"
                  value={formData.purchase_no}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Details */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-bold text-gray-900">Optional Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  placeholder="e.g., INV-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference / PO #</label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleInputChange}
                  placeholder="Your purchase order #"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any additional details or notes about this purchase..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Invoice Upload */}
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-bold text-gray-900">Attach Invoice (Optional)</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-500 mb-2" />
              <label className="block cursor-pointer">
                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  {fileName ? `✓ ${fileName}` : 'Click to upload or drag invoice file'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-600 mt-2">PDF, JPG, PNG or DOC up to 10MB</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium transition"
            >
              {loading ? 'Recording...' : 'Record Purchase'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
