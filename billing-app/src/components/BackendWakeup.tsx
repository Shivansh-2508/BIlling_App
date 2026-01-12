"use client";

import { useEffect } from "react";

export default function BackendWakeup() {
  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://billing-app-onzk.onrender.com";

    const interval = setInterval(async () => {
      try {
        await fetch(apiUrl);
        console.log("Backend kept alive 😤",apiUrl);
      } catch (err) {
        console.error("Backend ping failed:", err);
      }
    }, 4 * 60 * 1000); // 4 minutes (your math was off btw)

    return () => clearInterval(interval);
  }, []);

  return null; // invisible, like good infrastructure
}
