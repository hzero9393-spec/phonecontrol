'use client';

import React, { useState } from 'react';
import { useCRMStore } from '@/store/use-crm-store';
import { Smartphone, Eye, EyeOff, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';

async function tryLogin(username: string, password: string): Promise<Response> {
  const res = await fetch('/api/crm/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res;
}

export default function LoginForm() {
  const { setAdmin, setTheme } = useCRMStore();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRetryCount(0);

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    // Auto-retry up to 3 times if server doesn't respond
    const maxRetries = 3;
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt > 1 ? attempt : 0);
        const res = await tryLogin(username, password);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            setError('Invalid username or password');
          } else {
            setError(data.error || `Login failed (Error ${res.status})`);
          }
          setLoading(false);
          return;
        }

        // Success!
        setAdmin(data);
        if (data.theme) setTheme(data.theme);
        toast({ title: 'Welcome back!', description: `Logged in as ${data.fullName}` });
        setLoading(false);
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Login attempt ${attempt} failed:`, lastError);

        if (attempt < maxRetries) {
          // Wait before retry (1s, 2s)
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }

    // All retries failed
    setError('Server is not responding. Please refresh the page and try again.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-600 shadow-xl shadow-primary/25 mb-4">
            <Smartphone size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">PhoneCRM</h1>
          <p className="text-muted-foreground mt-1 text-sm">Phone Buy & Sell Shop Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Enter your credentials to continue</p>
            </div>
            <ThemeToggle />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-destructive/5 border border-destructive/15 rounded-lg text-sm text-destructive flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="crm-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="crm-input"
                placeholder="Enter your username"
                disabled={loading}
                autoFocus
              />
            </div>

            <div>
              <label className="crm-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="crm-input pr-10"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="crm-btn-primary w-full"
            >
              {loading ? (
                <>
                  {retryCount > 0 && <RotateCw size={15} className="mr-1 animate-spin" />}
                  <Loader2 size={17} className="animate-spin" />
                  {retryCount > 0 ? `Retrying (${retryCount}/3)...` : 'Signing in...'}
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <p className="text-xs font-medium text-primary mb-1">Demo Credentials</p>
            <p className="text-xs text-muted-foreground">
              Username: <span className="font-mono font-bold text-foreground">goutamji100</span> &nbsp;|&nbsp; Password: <span className="font-mono font-bold text-foreground">goutamji100</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
