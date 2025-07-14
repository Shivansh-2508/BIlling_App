"use client";

import { useAuth } from '@/context/AuthContext';

export default function LogoutButton() {
  const { logout, user } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={logout}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
    >
      Logout
    </button>
  );
}
