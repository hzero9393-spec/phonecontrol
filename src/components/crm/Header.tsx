'use client';

import React from 'react';
import { useCRMStore } from '@/store/use-crm-store';
import { Menu, Bell, LogOut, User } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  inventory: 'Inventory',
  sales: 'Sales',
  invoices: 'Invoices',
  orders: 'Orders',
  shop: 'Shop Settings',
  admins: 'Admin Users',
  profile: 'My Profile',
  settings: 'Settings',
};

export default function Header() {
  const { currentModule, sidebarOpen, toggleSidebar, admin, setAdmin, setCurrentModule } = useCRMStore();
  const [showLogout, setShowLogout] = React.useState(false);

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem('crm-auth-storage');
    window.location.reload();
  };

  const handleProfile = () => {
    setCurrentModule('profile');
    setShowLogout(false);
  };

  return (
    <header className="crm-header">
      <button
        onClick={toggleSidebar}
        className="mr-4 p-2 rounded-lg hover:bg-muted transition-colors duration-200"
      >
        <Menu size={20} className="text-foreground" />
      </button>

      <div>
        <h2 className="text-base font-semibold text-foreground leading-tight">{moduleTitles[currentModule] || 'Dashboard'}</h2>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors duration-200">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
        </button>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {admin?.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground leading-tight">{admin?.fullName || 'Admin'}</p>
              <p className="text-[0.65rem] text-muted-foreground capitalize">{admin?.role || ''}</p>
            </div>
          </button>

          {showLogout && (
            <div className="absolute right-0 top-12 w-48 bg-card rounded-xl border border-border shadow-lg py-1.5 z-50">
              <button onClick={handleProfile} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                <User size={15} className="text-muted-foreground" />
                Profile
              </button>
              <div className="mx-3 my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
