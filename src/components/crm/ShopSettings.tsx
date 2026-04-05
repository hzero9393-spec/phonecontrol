'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCRMStore } from '@/store/use-crm-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Store, Loader2, Save } from 'lucide-react';

interface ShopData {
  id: string;
  adminId: string;
  shopName: string;
  gstNo: string;
  address: string;
  phone: string;
  logo: string;
}

export default function ShopSettings() {
  const { toast } = useToast();
  const { admin } = useCRMStore();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shopName: '',
    gstNo: '',
    address: '',
    phone: '',
    logo: '',
  });

  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (admin?.id) params.set('adminId', admin.id);
      const res = await fetch(`/api/crm/shops?${params}`);
      const data = await res.json();
      if (res.ok) {
        setShop(data);
        setForm({
          shopName: data.shopName || '',
          gstNo: data.gstNo || '',
          address: data.address || '',
          phone: data.phone || '',
          logo: data.logo || '',
        });
      } else {
        toast({ title: 'Error', description: 'Failed to load shop settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [admin?.id, toast]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleSave = async () => {
    if (!shop?.id) {
      toast({ title: 'Error', description: 'No shop record found', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/crm/shops?id=${shop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Settings Saved', description: 'Shop details updated successfully' });
        setShop(data);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Shop Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your shop details and business information</p>
      </div>

      {/* Shop Information Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Store size={18} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Shop Information</h3>
            <p className="text-xs text-muted-foreground">Basic details about your shop</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shopName">Shop Name</Label>
            <Input
              id="shopName"
              placeholder="Enter your shop name"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
          </div>

          {/* GST Number */}
          <div className="space-y-2">
            <Label htmlFor="gstNo">GST Number</Label>
            <Input
              id="gstNo"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={form.gstNo}
              onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
              className="uppercase"
            />
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              placeholder="Enter your shop address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
            >
              {saving ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
