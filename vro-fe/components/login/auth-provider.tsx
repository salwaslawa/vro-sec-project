"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/types';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const router = useRouter();
  const pathname = usePathname();
  
  
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    
    if (!isMounted) return;

    if (!isLoggedIn && pathname !== '/login') {
      router.replace('/login');
    }
    else if (isLoggedIn && pathname === '/login') {
      
      router.replace('/'); 
    }
  }, [isLoggedIn, pathname, router, isMounted]);

  
  
  if (!isMounted) {
    return null; 
  }

  if (!isLoggedIn && pathname === '/login') {
      return <>{children}</>;
  }
  
  
  if (!isLoggedIn && pathname !== '/login') {
      return null; 
  }

  return <>{children}</>;
}