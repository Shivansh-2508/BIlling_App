"use client";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div
        className="p-4 bg-white rounded-lg shadow cursor-pointer hover:shadow-md"
        onClick={() => router.push("/buyers")}
      >
        <h2 className="text-lg font-semibold">Buyers</h2>
        <p className="text-sm text-gray-500">Manage your buyers</p>
      </div>
    </div>
  );
}