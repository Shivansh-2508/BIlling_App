'use client';

import { useRouter } from 'next/navigation';

export default function TopBar() {
  const router = useRouter();

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
    } catch {}
    router.replace('/login');
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-sm sm:text-base font-semibold text-gray-800">Shivansh Inks</div>
        <button
          onClick={handleLogout}
          className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
