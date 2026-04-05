'use client';

import React, { useState } from 'react';
import { useCRMStore } from '@/store/use-crm-store';
import { Smartphone, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginForm() {
  const { setAdmin } = useCRMStore();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/crm/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      setAdmin(data);
      toast({ title: 'Welcome back!', description: `Logged in as ${data.fullName}` });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EEEEEE] via-[#E5E5E5] to-[#DCDCDC] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF5F00] shadow-lg shadow-[#FF5F00]/25 mb-4">
            <Smartphone size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#00092C]">PhoneCRM</h1>
          <p className="text-[#555555] mt-1">Phone Buy & Sell Shop Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 border border-[#D1D1D1]">
          <h2 className="text-xl font-semibold text-[#00092C] mb-1">Sign In</h2>
          <p className="text-sm text-[#555555] mb-6">Enter your credentials to access the dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-[#FFF5F3] border border-[#B20600]/20 rounded-lg text-sm text-[#B20600]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#00092C] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#D1D1D1] bg-[#FAFAFA] text-[#00092C] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F00] focus:border-transparent transition-all placeholder:text-[#888888]"
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#00092C] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D1D1D1] bg-[#FAFAFA] text-[#00092C] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5F00] focus:border-transparent transition-all placeholder:text-[#888888] pr-10"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#00092C] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#FF5F00] text-white rounded-lg font-medium text-sm hover:bg-[#CC4D00] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 p-3 bg-[#FFF5F0] rounded-lg border border-[#FF5F00]/15">
            <p className="text-xs font-medium text-[#CC4D00] mb-1">Demo Credentials</p>
            <p className="text-xs text-[#994000]">
              Username: <span className="font-mono font-bold">master</span> &nbsp;|&nbsp; Password: <span className="font-mono font-bold">master123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
