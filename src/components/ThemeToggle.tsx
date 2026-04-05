'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="relative w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        <div className="w-4 h-4 rounded bg-muted-foreground/20 animate-pulse" />
      </button>
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  const currentIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  const CurrentIcon = currentIcon;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors duration-200"
        title="Toggle theme"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={theme}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentIcon size={18} className="text-muted-foreground" />
          </motion.div>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-36 bg-card rounded-xl border border-border shadow-lg py-1.5 z-50"
            >
              {options.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setShowMenu(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-primary bg-primary/5 font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={15} />
                    {opt.label}
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
