'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  currentUser: { username: string } | null;
  onLogout: () => void;
  onOpenHouseholds: () => void;
}

export default function Navigation({ currentUser, onLogout, onOpenHouseholds }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Piano Pasti', icon: 'bi-calendar-week' },
    { href: '/recipes', label: 'Le Mie Ricette', icon: 'bi-book' },
    { href: '/grocery', label: 'Lista Spesa', icon: 'bi-cart3' },
    { href: '/tasks', label: 'Task Familiari', icon: 'bi-check2-square' },
    { href: '/settings', label: 'Impostazioni', icon: 'bi-gear' },
  ];

  return (
    <>
      <div className="sticky-header">
        <button 
          className="menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </button>
        <div className="app-title">🍳 Lazy Cook</div>
      </div>

      <div className={`nav-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="nav-header">
          <h2>🍳 Lazy Cook</h2>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="nav-footer">
          <div className="nav-user">
            <i className="bi bi-person-circle"></i>
            <span className="nav-username">{currentUser?.username || 'Guest'}</span>
          </div>
          <button 
            className="nav-item"
            onClick={() => {
              onOpenHouseholds();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-people-fill"></i>
            <span>Famiglie</span>
          </button>
          <button 
            className="nav-item logout"
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
          className="nav-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
