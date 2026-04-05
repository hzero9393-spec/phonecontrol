'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Store,
  Camera,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Trash2,
  Shield,
  Palette,
} from 'lucide-react';
import { useCRMStore, THEMES, type ThemeId } from '@/store/use-crm-store';
import { useToast } from '@/hooks/use-toast';

type Tab = 'personal' | 'password' | 'shop' | 'photo' | 'themes';

interface AdminData {
  id: string;
  username: string;
  role: string;
  fullName: string;
  mobile: string;
  email: string;
  theme: string;
  createdAt: string;
}

interface ShopData {
  id: string;
  shopName: string;
  gstNo: string;
  address: string;
  phone: string;
}

export default function ProfileModule() {
  const { admin, setAdmin, theme, setTheme } = useCRMStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [loading, setLoading] = useState(false);

  // Personal info
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Shop
  const [shopName, setShopName] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [savingShop, setSavingShop] = useState(false);

  // Photo
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);

  // Theme
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/profile', { headers: { 'x-admin-id': admin?.id || '' } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.admin) {
        setFullName(data.admin.fullName || '');
        setMobile(data.admin.mobile || '');
        setEmail(data.admin.email || '');
        // Sync theme from DB
        if (data.admin.theme) setTheme(data.admin.theme as ThemeId);
      }
      if (data.shop) {
        setShopName(data.shop.shopName || '');
        setGstNo(data.shop.gstNo || '');
        setShopAddress(data.shop.address || '');
        setShopPhone(data.shop.phone || '');
      }
      if (admin?.id) {
        const jpgUrl = `/profiles/${admin.id}.jpg`;
        const pngUrl = `/profiles/${admin.id}.png`;
        const img = new Image();
        img.onload = () => { setCurrentPhotoUrl(jpgUrl); };
        img.onerror = () => {
          const img2 = new Image();
          img2.onload = () => { setCurrentPhotoUrl(pngUrl); };
          img2.onerror = () => {};
          img2.src = pngUrl;
        };
        img.src = jpgUrl;
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /* ─── Save Handlers ─── */

  const handleSavePersonal = async () => {
    if (!fullName.trim()) { toast({ title: 'Error', description: 'Full name is required', variant: 'destructive' }); return; }
    try {
      setSavingPersonal(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-id': admin?.id || '' },
        body: JSON.stringify({ type: 'personal', fullName, mobile, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (admin) setAdmin({ ...admin, fullName, mobile, email });
      toast({ title: 'Saved!', description: 'Personal info updated successfully' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    } finally { setSavingPersonal(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { toast({ title: 'Error', description: 'All fields required', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' }); return; }
    if (newPassword.length < 4) { toast({ title: 'Error', description: 'Password must be at least 4 characters', variant: 'destructive' }); return; }
    try {
      setSavingPassword(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-id': admin?.id || '' },
        body: JSON.stringify({ type: 'password', oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      toast({ title: 'Password Changed!', description: 'Your password has been updated' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to change password', variant: 'destructive' });
    } finally { setSavingPassword(false); }
  };

  const handleSaveShop = async () => {
    try {
      setSavingShop(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-id': admin?.id || '' },
        body: JSON.stringify({ type: 'shop', shopName, gstNo, address: shopAddress, phone: shopPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Saved!', description: 'Shop details updated successfully' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    } finally { setSavingShop(false); }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({ title: 'Invalid', description: 'Only JPG/PNG allowed', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Too Large', description: 'Max 2MB allowed', variant: 'destructive' });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) { toast({ title: 'Error', description: 'Select a photo first', variant: 'destructive' }); return; }
    try {
      setUploadingPhoto(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-id': admin?.id || '' },
        body: JSON.stringify({ type: 'photo', imageData: photoPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentPhotoUrl(data.photoUrl);
      setPhotoPreview(null);
      setPhotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Uploaded!', description: 'Profile photo updated' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Upload failed', variant: 'destructive' });
    } finally { setUploadingPhoto(false); }
  };

  /* ─── Theme Handler ─── */
  const selectTheme = useCallback(async (themeId: ThemeId) => {
    // Apply instantly on body
    document.body.className = document.body.className
      .replace(/theme-\S+/g, '')
      .trim() + ' ' + themeId;

    // Update store
    setTheme(themeId);

    // Save to DB via API
    try {
      setSavingTheme(true);
      const res = await fetch('/api/crm/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': admin?.id || '' },
        body: JSON.stringify({ type: 'theme', theme: themeId }),
      });
      if (res.ok) {
        toast({ title: 'Theme Applied', description: `${THEMES.find(t => t.id === themeId)?.name} theme saved` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save theme', variant: 'destructive' });
    } finally {
      setSavingTheme(false);
    }
  }, [admin?.id, setTheme, toast]);

  /* ─── Tabs Config ─── */
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'personal', label: 'Personal Info', icon: <User size={18} /> },
    { key: 'password', label: 'Change Password', icon: <Lock size={18} /> },
    { key: 'shop', label: 'Shop Details', icon: <Store size={18} /> },
    { key: 'photo', label: 'Profile Photo', icon: <Camera size={18} /> },
    { key: 'themes', label: 'Theme', icon: <Palette size={18} /> },
  ];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-10 bg-muted rounded-lg w-64 animate-pulse" />
        <div className="crm-card animate-pulse h-[400px]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="crm-card flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden">
            {currentPhotoUrl ? (
              <img src={currentPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              admin?.fullName?.charAt(0) || 'A'
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center">
            <Shield size={12} className="text-primary" />
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{admin?.fullName || 'Admin'}</h2>
          <p className="text-sm text-muted-foreground">@{admin?.username}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-primary/10 text-primary">{admin?.role}</span>
            <span className="text-xs text-muted-foreground">Joined {admin?.id ? 'recently' : ''}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="crm-card !p-0 overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all relative whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.key && (
                <motion.div layoutId="profileTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ═══ Personal Info ═══ */}
            {activeTab === 'personal' && (
              <motion.div key="personal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Personal Information</h3>
                  <p className="text-sm text-muted-foreground">Update your name, mobile number and email address.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="crm-label">Full Name <span className="text-destructive">*</span></label>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" className="crm-input" />
                  </div>
                  <div>
                    <label className="crm-label">Mobile</label>
                    <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter mobile number" className="crm-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="crm-label">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" className="crm-input" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleSavePersonal} disabled={savingPersonal} className="crm-btn-primary">
                    <Save size={16} />
                    {savingPersonal ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ Change Password ═══ */}
            {activeTab === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Change Password</h3>
                  <p className="text-sm text-muted-foreground">Enter your current password and choose a new one.</p>
                </div>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="crm-label">Current Password <span className="text-destructive">*</span></label>
                    <div className="relative">
                      <input type={showOld ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" className="crm-input pr-10" />
                      <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showOld ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="crm-label">New Password <span className="text-destructive">*</span></label>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="crm-input pr-10" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showNew ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <div>
                    <label className="crm-label">Confirm Password <span className="text-destructive">*</span></label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`crm-input ${confirmPassword && confirmPassword !== newPassword ? 'border-destructive' : ''}`}
                    />
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle size={12} />Passwords do not match</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleChangePassword} disabled={savingPassword} className="crm-btn-primary">
                    <Lock size={16} />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ Shop Details ═══ */}
            {activeTab === 'shop' && (
              <motion.div key="shop" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Shop Details</h3>
                  <p className="text-sm text-muted-foreground">Manage your shop name, GST number, address and contact.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="crm-label">Shop Name</label>
                    <input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Enter shop name" className="crm-input" />
                  </div>
                  <div>
                    <label className="crm-label">GST Number</label>
                    <input value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="Enter GST number" className="crm-input" />
                  </div>
                  <div>
                    <label className="crm-label">Phone Number</label>
                    <input value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="Enter shop phone" className="crm-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="crm-label">Address</label>
                    <textarea value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Enter shop address" rows={2} className="crm-input resize-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleSaveShop} disabled={savingShop} className="crm-btn-primary">
                    <Save size={16} />
                    {savingShop ? 'Saving...' : 'Save Shop Details'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══ Profile Photo ═══ */}
            {activeTab === 'photo' && (
              <motion.div key="photo" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Profile Photo</h3>
                  <p className="text-sm text-muted-foreground">Upload JPG/PNG image, max 2MB. It will be saved as your profile picture.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Current</p>
                    <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold overflow-hidden border-4 border-card shadow-lg">
                      {currentPhotoUrl ? (
                        <img src={currentPhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        admin?.fullName?.charAt(0) || 'A'
                      )}
                    </div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
                      <span className="text-muted-foreground">→</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Preview</p>
                    <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center text-muted-foreground overflow-hidden border-4 border-dashed border-border">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <Camera size={24} className="mx-auto mb-1 opacity-40" />
                          <p className="text-xs">No file</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handlePhotoSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <Camera size={16} />
                    Choose Photo
                  </button>
                  {photoPreview && (
                    <>
                      <button onClick={handleUploadPhoto} disabled={uploadingPhoto} className="crm-btn-primary">
                        <Check size={16} />
                        {uploadingPhoto ? 'Uploading...' : 'Upload & Save'}
                      </button>
                      <button onClick={() => { setPhotoPreview(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm text-destructive hover:bg-destructive/5 transition-colors cursor-pointer">
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </>
                  )}
                </div>

                {photoFile && (
                  <div className="text-xs text-foreground bg-success/10 border border-success/20 rounded-lg px-4 py-2 flex items-center gap-2">
                    <Check size={14} className="text-success" />
                    {photoFile.name} — {(photoFile.size / 1024).toFixed(1)}KB
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Theme Customization ═══ */}
            {activeTab === 'themes' && (
              <motion.div key="themes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">Theme Customization</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color theme. Each admin has their own theme that applies across all pages.
                  </p>
                </div>

                {savingTheme && (
                  <div className="text-xs text-primary bg-primary/5 border border-primary/15 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Saving theme...
                  </div>
                )}

                {/* Theme Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      data-theme={t.id}
                      onClick={() => selectTheme(t.id)}
                      className={`theme-card text-left ${theme === t.id ? 'selected' : ''}`}
                    >
                      {/* Checkmark overlay */}
                      <div className="theme-check bg-primary text-primary-foreground">
                        <Check size={12} strokeWidth={3} />
                      </div>

                      {/* Color strips preview */}
                      <div className="w-full rounded-[6px] overflow-hidden mb-2.5" style={{ height: '52px' }}>
                        <div className="color-strip" style={{ backgroundColor: t.primary, height: '18px' }} />
                        <div className="color-strip" style={{ backgroundColor: t.secondary, height: '12px' }} />
                        <div className="color-strip" style={{ backgroundColor: t.accent, height: '12px' }} />
                        <div className="color-strip" style={{ backgroundColor: t.bg, height: '10px' }} />
                      </div>

                      {/* Theme name */}
                      <p className="text-xs font-semibold text-foreground leading-tight">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{t.id}</p>
                    </button>
                  ))}
                </div>

                {/* Current theme info */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="w-5 h-5 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Current Theme: <span className="text-primary font-semibold">{THEMES.find(t => t.id === theme)?.name || 'Default'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Primary: <span className="font-mono">{THEMES.find(t => t.id === theme)?.primary}</span> · 
                      Accent: <span className="font-mono">{THEMES.find(t => t.id === theme)?.accent}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
