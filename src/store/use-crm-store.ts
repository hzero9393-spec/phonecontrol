import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminUser = {
  id: string;
  username: string;
  role: string;
  fullName: string;
  mobile: string;
  email: string;
};

export const THEMES = [
  { id: 'theme-blue',   name: 'Ocean Blue',    primary: '#2563EB', secondary: '#3B82F6', bg: '#F8FAFC', accent: '#10B981' },
  { id: 'theme-dark',   name: 'Dark Neon',     primary: '#22C55E', secondary: '#16A34A', bg: '#0F172A', accent: '#F59E0B' },
  { id: 'theme-purple', name: 'Royal Purple',  primary: '#7C3AED', secondary: '#9333EA', bg: '#FAF5FF', accent: '#EC4899' },
  { id: 'theme-orange', name: 'Sunset Orange', primary: '#EA580C', secondary: '#F97316', bg: '#FFF7ED', accent: '#DC2626' },
  { id: 'theme-teal',   name: 'Cool Teal',     primary: '#0D9488', secondary: '#14B8A6', bg: '#F0FDFA', accent: '#6366F1' },
  { id: 'theme-rose',   name: 'Rose Red',      primary: '#E11D48', secondary: '#F43F5E', bg: '#FFF1F2', accent: '#F59E0B' },
  { id: 'theme-indigo', name: 'Deep Indigo',   primary: '#4338CA', secondary: '#6366F1', bg: '#EEF2FF', accent: '#10B981' },
  { id: 'theme-green',  name: 'Fresh Green',   primary: '#16A34A', secondary: '#22C55E', bg: '#F0FDF4', accent: '#2563EB' },
  { id: 'theme-slate',  name: 'Classic Slate', primary: '#475569', secondary: '#64748B', bg: '#F1F5F9', accent: '#EF4444' },
  { id: 'theme-amber',  name: 'Golden Amber',  primary: '#D97706', secondary: '#F59E0B', bg: '#FFFBEB', accent: '#7C3AED' },
  { id: 'theme-cyan',   name: 'Sky Cyan',      primary: '#0891B2', secondary: '#06B6D4', bg: '#ECFEFF', accent: '#F97316' },
  { id: 'theme-pink',   name: 'Hot Pink',      primary: '#DB2777', secondary: '#EC4899', bg: '#FDF2F8', accent: '#06B6D4' },
] as const;

export type ThemeId = typeof THEMES[number]['id'];

export type Module =
  | 'dashboard'
  | 'customers'
  | 'inventory'
  | 'sales'
  | 'invoices'
  | 'orders'
  | 'reports'
  | 'print-pdf'
  | 'shop'
  | 'admins'
  | 'profile'
  | 'settings';

interface CRMState {
  // Auth
  admin: AdminUser | null;
  setAdmin: (admin: AdminUser | null) => void;
  isAuthenticated: () => boolean;
  isMasterAdmin: () => boolean;

  // Navigation
  currentModule: Module;
  setCurrentModule: (module: Module) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Theme
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      // Auth
      admin: null,
      setAdmin: (admin) => set({ admin }),
      isAuthenticated: () => get().admin !== null,
      isMasterAdmin: () => get().admin?.role === 'master',

      // Navigation
      currentModule: 'dashboard',
      setCurrentModule: (module) => set({ currentModule: module }),

      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Theme
      theme: 'theme-blue',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'crm-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
);
