'use client';

import React from 'react';
import { useCRMStore } from '@/store/use-crm-store';
import { Menu, Bell, LogOut, User } from 'lucide-react';

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  inventory: 'Inventory',
  sales: 'Sales',
  invoices: 'Invoices',
  orders: 'Orders',
  shop: 'Shop Settings',
  admins: 'Admin Users',
  settings: 'Settings',
};

export default function Header() {
  const { currentModule, sidebarOpen, toggleSidebar, admin, setAdmin } = useCRMStore();
  const [showLogout, setShowLogout] = React.useState(false);

  const handleLogout = () => {
    setAdmin(null);
    localStorage.removeItem('crm-auth-storage');
    window.location.reload();
  };

  return (
    <header className="crm-header">
      <button
        onClick={toggleSidebar}
        className="mr-4 p-2 rounded-lg hover:bg-[#F0F0F0] transition-colors"
      >
        <Menu size={20} className="text-[#00092C]" />
      </button>

      <h2 className="text-lg font-semibold text-[#00092C]">{moduleTitles[currentModule] || 'Dashboard'}</h2>

      <div className="ml-auto flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-[#F0F0F0] transition-colors">
          <Bell size={20} className="text-[#555555]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#B20600] rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowLogout(!showLogout)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#F0F0F0] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF5F00] flex items-center justify-center text-white text-sm font-bold">
              {admin?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-[#00092C]">{admin?.fullName || 'Admin'}</p>
              <p className="text-xs text-[#555555] capitalize">{admin?.role || ''}</p>
            </div>
          </button>

          {showLogout && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-[#D1D1D1] py-1 z-50">
              <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#00092C] hover:bg-[#F0F0F0]">
                <User size={16} />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-[#B20600] hover:bg-[#FFF5F3]"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
