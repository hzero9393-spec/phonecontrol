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
  X,
  LogOut,
} from 'lucide-react';

const navItems: { key: Module; label: string; icon: React.ReactNode; roles?: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'customers', label: 'Customers', icon: <Users size={20} /> },
  { key: 'inventory', label: 'Inventory', icon: <Smartphone size={20} /> },
  { key: 'sales', label: 'Sales', icon: <Receipt size={20} /> },
  { key: 'invoices', label: 'Invoices', icon: <FileText size={20} /> },
  { key: 'orders', label: 'Orders', icon: <ShoppingBag size={20} /> },
  { key: 'shop', label: 'Shop Settings', icon: <Store size={20} /> },
  { key: 'admins', label: 'Admin Users', icon: <Shield size={20} />, roles: ['master'] },
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
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF5F00] flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">PhoneCRM</h1>
              <p className="text-xs text-[#8892B0]">Buy & Sell Shop</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-[#8892B0] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-4">
          <p className="px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[#5A6480]">
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
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#FF5F00] flex items-center justify-center text-white text-sm font-bold">
              {admin?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.fullName || 'Admin'}</p>
              <p className="text-xs text-[#8892B0] capitalize">{admin?.role || ''}</p>
            </div>
            <LogOut size={16} className="text-[#8892B0] hover:text-[#FF5F00] cursor-pointer transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}
