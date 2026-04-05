'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { useCRMStore } from '@/store/use-crm-store';
import Sidebar from '@/components/crm/Sidebar';
import Header from '@/components/crm/Header';
import Footer from '@/components/crm/Footer';
import LoginForm from '@/components/crm/LoginForm';
import Dashboard from '@/components/crm/Dashboard';
import CustomersModule from '@/components/crm/CustomersModule';
import InventoryModule from '@/components/crm/InventoryModule';
import SalesModule from '@/components/crm/SalesModule';
import InvoicesModule from '@/components/crm/InvoicesModule';
import OrdersModule from '@/components/crm/OrdersModule';
import ShopSettings from '@/components/crm/ShopSettings';
import AdminModule from '@/components/crm/AdminModule';
import ProfileModule from '@/components/crm/ProfileModule';
import ReportsModule from '@/components/crm/ReportsModule';
import PrintPdfModule from '@/components/crm/PrintPdfModule';

const emptySubscribe = () => () => {};

export default function CRMPage() {
  const { admin, currentModule, sidebarOpen, theme } = useCRMStore();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Apply theme class to body whenever theme changes
  useEffect(() => {
    if (!mounted) return;
    // Remove any existing theme-xxx classes
    document.body.className = document.body.className
      .replace(/theme-\S+/g, '')
      .trim();
    // Add current theme
    document.body.classList.add(theme);
  }, [theme, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show login
  if (!admin) {
    return <LoginForm />;
  }

  // Authenticated → show CRM layout
  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <CustomersModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'sales':
        return <SalesModule />;
      case 'invoices':
        return <InvoicesModule />;
      case 'orders':
        return <OrdersModule />;
      case 'reports':
        return <ReportsModule />;
      case 'print-pdf':
        return <PrintPdfModule />;
      case 'shop':
        return <ShopSettings />;
      case 'admins':
        return <AdminModule />;
      case 'profile':
        return <ProfileModule />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="crm-layout">
      <Sidebar />
      <div className={`crm-main ${!sidebarOpen ? 'expanded' : ''}`}>
        <Header />
        <main className="crm-content">{renderModule()}</main>
        <Footer />
      </div>
    </div>
  );
}
