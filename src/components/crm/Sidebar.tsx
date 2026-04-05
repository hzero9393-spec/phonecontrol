'use client';

import React from 'react';
import { useCRMStore, Module } from '@/store/use-crm-store';
import {
  LayoutDashboard,
  Users,
  Smartphone,
  Receipt,
  FileText,
  ShoppingBag,
  Store,
  Shield,
  UserCircle,
  X,
  LogOut,
} from 'lucide-react';

const navItems: { key: Module; label: string; icon: React.ReactNode; roles?: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
  { key: 'customers', label: 'Customers', icon: <Users size={19} /> },
  { key: 'inventory', label: 'Inventory', icon: <Smartphone size={19} /> },
  { key: 'sales', label: 'Sales', icon: <Receipt size={19} /> },
  { key: 'invoices', label: 'Invoices', icon: <FileText size={19} /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag size={19} /> },
  { key: 'shop', label: 'Shop Settings', icon: <Store size={19} /> },
  { key: 'admins', label: 'Admin Users', icon: <Shield size={19} />, roles: ['master'] },
  { key: 'profile', label: 'My Profile', icon: <UserCircle size={19} /> },
];

export default function Sidebar() {
  const { currentModule, setCurrentModule, sidebarOpen, setSidebarOpen, admin } = useCRMStore();

  const handleNav = (module: Module) => {
    setCurrentModule(module);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && <div className="crm-overlay visible" onClick={() => setSidebarOpen(false)} />}

      <aside className={`crm-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Smartphone size={19} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">PhoneCRM</h1>
              <p className="text-[0.65rem] text-sidebar-foreground/50 font-medium tracking-wider uppercase">Buy & Sell</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-sidebar-foreground/50 hover:text-white transition-colors p-1 rounded-md hover:bg-sidebar-accent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-0">
          <p className="px-7 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/30">
            Main Menu
          </p>
          {navItems
            .filter((item) => !item.roles || (admin?.role && item.roles.includes(admin.role)))
            .map((item) => (
              <div
                key={item.key}
                className={`crm-nav-item ${currentModule === item.key ? 'active' : ''}`}
                onClick={() => handleNav(item.key)}
              >
                <span className={currentModule === item.key ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
        </nav>

        {/* Bottom user section */}
        <div className="flex-shrink-0 border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary/20 flex-shrink-0">
              {admin?.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin?.fullName || 'Admin'}</p>
              <p className="text-xs text-sidebar-foreground/40 capitalize">{admin?.role || ''}</p>
            </div>
            <button
              onClick={() => {
                setAdmin(null);
                localStorage.removeItem('crm-auth-storage');
                window.location.reload();
              }}
              className="text-sidebar-foreground/30 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-red-500/10"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
