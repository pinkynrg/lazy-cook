'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation/Navigation';
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
  const [enableFamilyTasks, setEnableFamilyTasks] = useState(true);

  const isAuthPage = pathname?.startsWith('/auth/');

  useEffect(() => {
    setIsMounted(true);
    loadCurrentUser();
    loadSettings();
  }, []);

  // Reload user when pathname changes (e.g., after login)
  useEffect(() => {
    if (isMounted && !isAuthPage) {
      loadCurrentUser();
      loadSettings();
    }
  }, [pathname, isMounted, isAuthPage]);

  // Listen for settings updates from other components
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettings();
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

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

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setEnableFamilyTasks(data.enableFamilyTasks !== undefined ? data.enableFamilyTasks : true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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
        <title>Lazy Cook - Organizza i tuoi pasti</title>
        <meta name="description" content="Pianifica i tuoi pasti settimanali, gestisci ricette e crea liste della spesa automaticamente." />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body>
        {isMounted && !isAuthPage && (
          <Navigation
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenHouseholds={() => setShowHouseholdManager(true)}
            enableFamilyTasks={enableFamilyTasks}
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

