import { fetchWithAuth } from '@/utils/fetchWithAuth';

// Example: Fetch invoices from Flask backend
export async function getInvoices() {
  // Replace with your backend URL
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/invoices';
  const res = await fetchWithAuth(backendUrl);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function getBuyers() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/buyers';
  const res = await fetchWithAuth(backendUrl);
  if (!res.ok) throw new Error('Failed to fetch buyers');
  return res.json();
}

export async function getProducts() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/products';
  const res = await fetchWithAuth(backendUrl);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}
