'use client';

// app/statements/page.tsx 
import Statement from "@/components/Statement";


export default function StatementPage() {

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/';
  
  return <Statement apiBaseUrl={API_BASE_URL} />;
}