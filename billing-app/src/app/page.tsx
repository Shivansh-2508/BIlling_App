
'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import ActionCard from "@/components/ActionCard";
import CreateInvoiceButton from "@/components/CreateInvoiceButton";
import UpdateStockButton from "@/components/UpdateStock";
import { LogIn, UserPlus } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  const menuItems = [
    {
      title: "Statements",
      description: "View and manage buyer statements",
      icon: "document-text",
      link: "/statement"
    },
    {
      title: "Invoices",
      description: "Browse and search all invoices",
      icon: "document-search",
      link: "/invoices"
    },
    {
      title: "Buyers",
      description: "Manage your buyer directory",
      icon: "users",
      link: "/buyers"
    },
    {
      title: "Create Invoice",
      description: "Generate financial reports",
      icon: "chart-bar",
      link: "/invoices/create"
    },
    {
      title: "Update Stock",
      description: "Update your product stock levels",
      icon: "refresh", 
      link: "/stock/update"
    },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto text-center mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">Billing App</h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto sm:mx-0">
              Manage your invoices, statements, and reports in one place
            </p>
          </div>
          
          {/* Auth Buttons - only show when not authenticated */}
          {!isAuthenticated && (
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Section - only show when authenticated */}
      {isAuthenticated && (
        <div className="max-w-7xl mx-auto mb-8 sm:mb-12">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Quick Actions</h2>
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4">
              <CreateInvoiceButton />
              <UpdateStockButton />
              <Link 
                href="/statement" 
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                View Statements
              </Link>
              <Link 
                href="/invoices" 
                className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                Browse Invoices
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section for unauthenticated users */}
      {!isAuthenticated && (
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Welcome to Shivansh Inks</h2>
            <p className="text-sm sm:text-lg mb-4 sm:mb-6 text-indigo-100 leading-relaxed">
              Streamline your billing process with our comprehensive invoice management system. 
              Create, track, and manage invoices, buyers, and inventory all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-indigo-600 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                Get Started - Sign Up
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-indigo-600 transition-colors duration-200 font-medium text-sm sm:text-base"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                Already have an account?
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Cards - only show when authenticated */}
      {isAuthenticated && (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {menuItems.map((item) => (
              <ActionCard 
                key={item.title}
                title={item.title}
                description={item.description}
                icon={item.icon}
                link={item.link}
              />
            ))}
          </div>
        </div>
      )}

      {/* Features Section for unauthenticated users */}
      {!isAuthenticated && (
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">Everything you need to manage your business</h3>
            <p className="text-sm sm:text-base text-gray-600">Powerful features designed for modern businesses</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Invoice Management</h4>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Create, edit, and track invoices with ease. Generate professional PDFs and manage payment status.</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Buyer Directory</h4>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Maintain a comprehensive database of your customers with contact details and transaction history.</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Inventory Tracking</h4>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Keep track of your stock levels, update inventory, and get alerts when items run low.</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-12 sm:mt-16 text-center text-xs sm:text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Billing App - All rights reserved</p>
      </div>
    </main>
  );
}