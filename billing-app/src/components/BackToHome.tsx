import Link from "next/link";

interface BackToHomeProps {
  variant?: 'text' | 'button';
  className?: string;
}

export default function BackToHome({ variant = 'text', className = '' }: BackToHomeProps) {
  if (variant === 'button') {
    return (
      <Link
        href="/"
        className={`inline-flex items-center px-5 py-3 border border-gray-300 rounded-md shadow-sm text-base font-semibold text-black bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mr-2 text-black"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 17l-5-5m0 0l5-5m-5 5h12"
          />
        </svg>
        {/* Back to Home */}
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`inline-flex items-center text-base font-semibold text-black not-first: ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-2 text-black"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 17l-5-5m0 0l5-5m-5 5h12"
        />
      </svg>
      {/* Back to Home */}
    </Link>
  );
}
