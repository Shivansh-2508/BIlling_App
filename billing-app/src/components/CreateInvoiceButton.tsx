import Link from "next/link";

interface CreateInvoiceButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CreateInvoiceButton({ 
  variant = 'primary', 
  size = 'md',
  className = ''
}: CreateInvoiceButtonProps) {
  // Base classes
  const baseClasses = "inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors rounded-md";
  
  // Variant classes
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white border border-transparent",
    secondary: "bg-blue-100 hover:bg-blue-200 text-blue-700 border border-transparent",
    outline: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
  };
  
  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  // Icon size based on button size
  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <Link
      href="/invoices/create"
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${iconSize[size]} mr-2`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 4v16m8-8H4" 
        />
      </svg>
      Create Invoice
    </Link>
  );
}