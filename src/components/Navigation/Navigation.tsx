'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './Navigation.module.scss';

interface NavigationProps {
  currentUser: { username: string } | null;
  onLogout: () => void;
  onOpenHouseholds: () => void;
  enableFamilyTasks?: boolean;
}

export default function Navigation({ currentUser, onLogout, onOpenHouseholds, enableFamilyTasks = true }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const allMenuItems = [
    { href: '/', label: 'Piano Pasti', icon: 'bi-calendar-week' },
    { href: '/recipes', label: 'Le Mie Ricette', icon: 'bi-book' },
    { href: '/grocery', label: 'Lista Spesa', icon: 'bi-cart3' },
    { href: '/tasks', label: 'Task Familiari', icon: 'bi-check2-square' },
    { href: '/settings', label: 'Impostazioni', icon: 'bi-gear' },
  ];

  // Filter out tasks if disabled
  const menuItems = allMenuItems.filter(item => 
    item.href !== '/tasks' || enableFamilyTasks
  );

  return (
    <>
      <div className={styles.stickyHeader}>
        <button 
          className={styles.menuToggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </button>
        <div className={styles.appTitle}>
          <Image src="/logo.svg" alt="Logo" width={36} height={36} className={styles.logo} />
          Lazy Cook
        </div>
      </div>

      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2>
            <Image src="/logo.svg" alt="Logo" width={48} height={48} className={styles.logo} />
            Lazy Cook
          </h2>
        </div>

        <nav>
          <ul className={styles.navList}>
            {menuItems.map((item) => (
              <li key={item.href} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={pathname === item.href ? 'active' : ''}
                  onClick={() => setIsOpen(false)}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.navFooter}>
          <div className={styles.navUser}>
            <i className="bi bi-person-circle"></i>
            <span>{currentUser?.username || 'Guest'}</span>
          </div>
          <button 
            className={styles.navButton}
            onClick={() => {
              onOpenHouseholds();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-people-fill"></i>
            <span>Famiglie</span>
          </button>
          <button 
            className={styles.navButton}
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Esci</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div 
          className={`${styles.overlay} ${!isOpen ? styles.hidden : ''}`}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
