'use client';

import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import HouseholdManager from '@/components/HouseholdManager';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showHouseholdManager, setShowHouseholdManager] = useState(false);

  const isAuthPage = pathname?.startsWith('/auth/');

  useEffect(() => {
    setIsMounted(true);
    loadCurrentUser();
  }, []);

  // Reload user when pathname changes (e.g., after login)
  useEffect(() => {
    if (isMounted && !isAuthPage) {
      loadCurrentUser();
    }
  }, [pathname, isMounted, isAuthPage]);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/check');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <html lang="it">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body>
        {isMounted && !isAuthPage && (
          <Navigation
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenHouseholds={() => setShowHouseholdManager(true)}
          />
        )}
        {children}
        {showHouseholdManager && (
          <HouseholdManager onClose={() => setShowHouseholdManager(false)} />
        )}
      </body>
    </html>
  );
}

