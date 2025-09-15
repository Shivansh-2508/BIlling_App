'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PUBLIC_PATHS = new Set<string>([
  '/',
  '/login',
  '/signup',
]);

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip on public paths
    if (PUBLIC_PATHS.has(pathname)) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.replace('/login');
      return;
    }
  }, [pathname, router]);

  return <>{children}</>;
}
