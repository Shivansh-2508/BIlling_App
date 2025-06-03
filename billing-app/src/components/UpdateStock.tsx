"use client";

import { useRouter } from "next/navigation";

export default function UpdateStockButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/stock/update")}
      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium shadow"
    >
      Update Stock
    </button>
  );
}