
import Link from "next/link";
import ActionCard from "@/components/ActionCard";
import CreateInvoiceButton from "@/components/CreateInvoiceButton";
import UpdateStockButton from "@/components/UpdateStock";
import BackendWakeup from "@/components/BackendWakeup";



export default function Home() {
  const menuItems = [
    {
      title: "Financial Dashboard",
      description: "Monitor profit, loss, revenue, and expenses",
      icon: "chart-bar",
      link: "/financial"
    },
    {
      title: "Purchases",
      description: "Track and manage purchase orders",
      icon: "shopping-cart",
      link: "/purchases"
    },
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
      title: "Buyer Accounts",
      description: "Track invoices, payments & balances",
      icon: "wallet",
      link: "/buyers/accounts"
    },
    {
      title: "Suppliers",
      description: "Manage your supplier directory",
      icon: "truck",
      link: "/suppliers"
    },
    {
      title: "Create Invoice",
      description: "Generate new invoices",
      icon: "file-plus",
      link: "/invoices/create"
    },
    {
      title: "Update Stock",
      description: "Update your product stock levels",
      icon: "refresh",
      link: "/stock/update"
    },
    {
      title: "Records",
      description: "Browse archived financial year invoices",
      icon: "archive",
      link: "/records"
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <BackendWakeup />
      {/* Header Section */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Billing App</h1>
        <p className="text-lg text-gray-700 max-w-2xl mx-auto">
          Complete business management system for invoices, purchases, inventory & financial analytics
        </p>
      </div>

      {/* Quick Action Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <CreateInvoiceButton />
            <UpdateStockButton />
            <Link
              href="/statement"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Statements
            </Link>
            <Link
              href="/invoices"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Browse Invoices
            </Link>
            <Link
              href="/records"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Records
            </Link>
          </div>
        </div>
      </div>


      {/* Main Navigation Cards */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
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

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-16 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Billing App - All rights reserved</p>
      </div>
    </main>
  );
}