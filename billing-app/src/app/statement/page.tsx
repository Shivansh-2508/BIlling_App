'use client';

// app/statements/page.tsx 
import Statement from "@/components/Statement";

export default function StatementPage() {
  // Define the API base URL - ideally from environment variables
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  return <Statement apiBaseUrl={API_BASE_URL} />;
}