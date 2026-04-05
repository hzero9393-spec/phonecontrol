'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Smartphone } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="crm-footer">
      <div className="flex items-center justify-center gap-2">
        <Smartphone size={13} className="text-primary" />
        <p>&copy; {year} PhoneCRM — Phone Buy & Sell Shop Management System</p>
      </div>
    </footer>
  );
}
