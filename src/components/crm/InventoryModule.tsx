'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit, Trash2, Smartphone, Wrench,
  ChevronLeft, ChevronRight, X, Save, AlertTriangle, UserPlus, Eye,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface Seller {
  id: string;
  name: string;
  phone: string;
  type: string;
}

interface InventoryItem {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  imeiNo: string;
  condition: string;
  status: string;
  sellerId: string | null;
  buyPrice: number;
  repairRequired: boolean;
  repairDetails: string;
  repairCost: number;
  repairStatus: string;
  addedAt: string;
  seller: { id: string; name: string; phone: string } | null;
}

type FormData = {
  brand: string; model: string; ram: string; storage: string;
  color: string; imeiNo: string; condition: string; status: string;
  sellerId: string; buyPrice: string;
  repairRequired: boolean; repairDetails: string; repairCost: string; repairStatus: string;
};

const emptyForm: FormData = {
  brand: '', model: '', ram: '', storage: '', color: '', imeiNo: '',
  condition: 'good', status: 'pending', sellerId: '', buyPrice: '0',
  repairRequired: false, repairDetails: '', repairCost: '0', repairStatus: 'none',
};

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const RAM_OPTIONS = ['2 GB', '3 GB', '4 GB', '6 GB', '8 GB', '12 GB'];
const STORAGE_OPTIONS = ['16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB'];

const statusBadge: Record<string, string> = {
  pending: 'badge-warning', complete: 'badge-success', done: 'badge-info',
};
const conditionBadge: Record<string, string> = {
  good: 'badge-success', average: 'badge-warning', poor: 'badge-danger',
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function InventoryModule() {
  // Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  // UI
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<InventoryItem | null>(null);
  const [showQuickSeller, setShowQuickSeller] = useState(false);
  const [quickSellerName, setQuickSellerName] = useState('');
  const [quickSellerPhone, setQuickSellerPhone] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch ────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (statusFilter !== 'all') p.set('status', statusFilter);
      if (conditionFilter !== 'all') p.set('condition', conditionFilter);
      p.set('page', String(page));
      p.set('limit', String(limit));

      const res = await fetch(`/api/crm/inventory?${p}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotalItems(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        showToast(data.error || 'Failed to fetch', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, conditionFilter, page]);

  const fetchSellers = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/inventory?action=sellers');
      const data = await res.json();
      if (res.ok) setSellers(data.sellers || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Form ────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(emptyForm); setView('form'); };
  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setForm({
      brand: item.brand, model: item.model, ram: item.ram, storage: item.storage,
      color: item.color, imeiNo: item.imeiNo, condition: item.condition,
      status: item.status, sellerId: item.sellerId || '', buyPrice: String(item.buyPrice),
      repairRequired: item.repairRequired, repairDetails: item.repairDetails,
      repairCost: String(item.repairCost), repairStatus: item.repairStatus,
    });
    setView('form');
  };

  const setField = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => {
      const u = { ...prev, [field]: value };
      if (field === 'repairRequired' && value === true && prev.repairStatus === 'none') u.repairStatus = 'pending';
      if (field === 'repairRequired' && value === false) {
        u.repairStatus = 'none'; u.repairDetails = ''; u.repairCost = '0';
      }
      return u;
    });
  };

  // ─── Quick Add Seller ────────────────────────────────────
  const handleQuickSeller = async () => {
    if (!quickSellerName.trim()) return;
    try {
      const res = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: quickSellerName.trim(), phone: quickSellerPhone.trim(), type: 'seller' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Seller added successfully');
        setQuickSellerName('');
        setQuickSellerPhone('');
        setShowQuickSeller(false);
        fetchSellers();
        // Auto-select the new seller
        setForm((prev) => ({ ...prev, sellerId: data.customer.id }));
      } else {
        showToast(data.error || 'Failed to add seller', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    }
  };

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.brand.trim() || !form.model.trim()) {
      showToast('Brand and model are required', 'err');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        buyPrice: parseFloat(form.buyPrice) || 0,
        repairCost: parseFloat(form.repairCost) || 0,
        sellerId: form.sellerId || null,
      };
      const url = editId ? `/api/crm/inventory?id=${editId}` : '/api/crm/inventory';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        showToast(editId ? 'Phone updated!' : 'Phone added!');
        setView('list');
        fetchItems();
      } else {
        showToast(data.error || 'Operation failed', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/inventory?id=${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(`${deleteConfirm.brand} ${deleteConfirm.model} deleted`);
        setDeleteConfirm(null);
        fetchItems();
      } else {
        showToast(data.error || 'Delete failed', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'ok' ? 'bg-emerald-500 text-white' : 'bg-destructive text-white'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LIST VIEW ═══ */}
      {view === 'list' && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Smartphone size={20} className="text-primary" />
                Inventory
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalItems} items</span>
              </h2>
            </div>
            <button onClick={openAdd} className="crm-btn-primary">
              <Plus size={16} /> Add Phone
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border border-border bg-card p-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="crm-input pl-9"
                placeholder="Search by brand, model, IMEI..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                className="crm-input w-[130px]"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
                <option value="done">Sold</option>
              </select>
              <select
                className="crm-input w-[140px]"
                value={conditionFilter}
                onChange={(e) => { setConditionFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Condition</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="crm-card p-0 overflow-hidden">
            <div className="max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
              <table className="crm-table">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>RAM/Storage</th>
                    <th>IMEI</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Buy Price</th>
                    <th>Repair</th>
                    <th>Seller</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Loading inventory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-16 text-muted-foreground">
                        <Smartphone size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No phones found</p>
                        <p className="text-xs mt-1">{search ? 'Try different filters' : 'Click "Add Phone" to start'}</p>
                      </td>
                    </tr>
                  ) : items.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="font-medium text-foreground">{item.brand}</td>
                      <td>{item.model}</td>
                      <td className="text-xs text-muted-foreground">
                        {item.ram && item.storage ? `${item.ram} / ${item.storage}` : item.ram || item.storage || '-'}
                      </td>
                      <td className="font-mono text-xs text-muted-foreground">{item.imeiNo || '-'}</td>
                      <td><span className={`badge ${conditionBadge[item.condition] || 'badge-default'}`}>{item.condition}</span></td>
                      <td>
                        {item.status === 'done' ? (
                          <span className="badge bg-primary/10 text-primary border-primary/20 font-bold">SOLD</span>
                        ) : (
                          <span className={`badge ${statusBadge[item.status] || 'badge-default'}`}>{item.status}</span>
                        )}
                      </td>
                      <td className="font-semibold text-foreground">{formatINR(item.buyPrice)}</td>
                      <td>
                        {item.repairRequired ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                            <Wrench size={13} /> {item.repairStatus === 'completed' ? 'Done' : item.repairStatus === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-sm">{item.seller?.name || '-'}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.status !== 'done' && (
                            <>
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-primary/5 text-primary transition-colors" title="Edit">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => setDeleteConfirm(item)} className="p-1.5 rounded-lg hover:bg-destructive/5 text-destructive transition-colors" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {item.status === 'done' && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {Math.min((page - 1) * limit + 1, totalItems)}–{Math.min(page * limit, totalItems)} of {totalItems}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft size={14} /></button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}>{p}</button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ ADD / EDIT FORM ═══ */}
      {view === 'form' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Smartphone size={20} className="text-primary" />
              {editId ? 'Edit Phone' : 'Add New Phone'}
            </h2>
            <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <X size={18} />
            </button>
          </div>

          {/* Section 1: Phone Details */}
          <div className="crm-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Smartphone size={15} className="text-primary" />
              Phone Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="crm-label">Brand <span className="text-destructive">*</span></label>
                <input className="crm-input" placeholder="e.g. Samsung, Apple" value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
              </div>
              <div>
                <label className="crm-label">Model <span className="text-destructive">*</span></label>
                <input className="crm-input" placeholder="e.g. Galaxy S24" value={form.model} onChange={(e) => setField('model', e.target.value)} />
              </div>
              <div>
                <label className="crm-label">RAM</label>
                <select className="crm-input" value={form.ram} onChange={(e) => setField('ram', e.target.value)}>
                  <option value="">Select RAM</option>
                  {RAM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="crm-label">Storage</label>
                <select className="crm-input" value={form.storage} onChange={(e) => setField('storage', e.target.value)}>
                  <option value="">Select Storage</option>
                  {STORAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="crm-label">Color</label>
                <input className="crm-input" placeholder="e.g. Midnight Black" value={form.color} onChange={(e) => setField('color', e.target.value)} />
              </div>
              <div>
                <label className="crm-label">IMEI Number</label>
                <input className="crm-input" placeholder="15-digit IMEI" value={form.imeiNo} onChange={(e) => setField('imeiNo', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 2: Condition & Price */}
          <div className="crm-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Eye size={15} className="text-primary" />
              Condition & Price
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Condition Radio */}
              <div>
                <label className="crm-label">Condition</label>
                <div className="flex gap-3 mt-1">
                  {['good', 'average', 'poor'].map((c) => (
                    <label key={c} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio" name="condition" value={c}
                        checked={form.condition === c}
                        onChange={(e) => setField('condition', e.target.value)}
                        className="accent-primary"
                      />
                      <span className={`badge ${conditionBadge[c]}`}>{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Status */}
              <div>
                <label className="crm-label">Status</label>
                <select className="crm-input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="complete">Complete</option>
                  <option value="done">Done (Sold)</option>
                </select>
              </div>
              {/* Buy Price */}
              <div>
                <label className="crm-label">Buy Price (₹)</label>
                <input className="crm-input" type="number" min="0" step="1" placeholder="e.g. 15000" value={form.buyPrice} onChange={(e) => setField('buyPrice', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 3: Seller Details */}
          <div className="crm-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserPlus size={15} className="text-primary" />
              Seller Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="crm-label">Seller</label>
                <select className="crm-input" value={form.sellerId} onChange={(e) => setField('sellerId', e.target.value)}>
                  <option value="">No Seller (Walk-in)</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                {!showQuickSeller ? (
                  <button onClick={() => setShowQuickSeller(true)} className="text-sm text-primary hover:underline flex items-center gap-1 pb-2.5">
                    <Plus size={14} /> Add New Seller
                  </button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <input className="crm-input flex-1" placeholder="Seller name" value={quickSellerName} onChange={(e) => setQuickSellerName(e.target.value)} />
                    <input className="crm-input w-[120px]" placeholder="Phone" value={quickSellerPhone} onChange={(e) => setQuickSellerPhone(e.target.value)} />
                    <button onClick={handleQuickSeller} className="crm-btn-primary whitespace-nowrap px-3">
                      <Save size={14} />
                    </button>
                    <button onClick={() => { setShowQuickSeller(false); setQuickSellerName(''); setQuickSellerPhone(''); }} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Repair */}
          <div className="crm-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wrench size={15} className="text-primary" />
              Repair Information
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-foreground font-medium">Repair Required:</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="repairRequired" checked={form.repairRequired === false} onChange={() => setField('repairRequired', false)} className="accent-primary" />
                <span className="text-sm">No</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="repairRequired" checked={form.repairRequired === true} onChange={() => setField('repairRequired', true)} className="accent-primary" />
                <span className="text-sm">Yes</span>
              </label>
            </div>

            {form.repairRequired && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="crm-label text-amber-700 dark:text-amber-400">Repair Details</label>
                    <textarea className="crm-input min-h-[60px] resize-none" placeholder="Describe what needs to be repaired..." value={form.repairDetails} onChange={(e) => setField('repairDetails', e.target.value)} />
                  </div>
                  <div>
                    <label className="crm-label text-amber-700 dark:text-amber-400">Repair Cost (₹)</label>
                    <input className="crm-input" type="number" min="0" step="1" placeholder="e.g. 2000" value={form.repairCost} onChange={(e) => setField('repairCost', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="crm-label text-amber-700 dark:text-amber-400">Repair Status</label>
                    <select className="crm-input" value={form.repairStatus} onChange={(e) => setField('repairStatus', e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Done</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setView('list')} disabled={submitting} className="px-5 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted transition-colors font-medium text-sm">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="crm-btn-primary">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : editId ? (
                <><Save size={16} /> Update Phone</>
              ) : (
                <><Plus size={16} /> Add Phone</>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══ Delete Confirmation ═══ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !submitting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Delete Phone</h3>
                  <p className="text-sm text-muted-foreground">This cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-5">
                Delete <strong>{deleteConfirm.brand} {deleteConfirm.model}</strong>
                {deleteConfirm.imeiNo ? ` (IMEI: ${deleteConfirm.imeiNo})` : ''}?
                {deleteConfirm.status === 'done' && <span className="block mt-1 text-destructive font-medium">This phone has been sold!</span>}
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} disabled={submitting} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
