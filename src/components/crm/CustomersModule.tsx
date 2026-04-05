'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Search, Edit, Trash2, Users, Phone, MapPin,
  ChevronLeft, ChevronRight, X, Save, AlertTriangle, Eye,
  CreditCard, IndianRupee, Clock, ShoppingBag, Smartphone,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  aadharNo: string;
  type: string;
  createdAt: string;
}

interface HistoryData {
  customer: { id: string; name: string; phone: string; type: string };
  soldToShop: Array<{
    id: string; brand: string; model: string; imeiNo: string;
    condition: string; buyPrice: number; status: string; addedAt: string;
    soldToCustomer: { salePrice: number; saleDate: string } | null;
  }>;
  totalSoldToShop: number;
  boughtFromShop: Array<{
    id: string; brand: string; model: string; imeiNo: string;
    condition: string; salePrice: number; paidAmount: number;
    pendingAmount: number; paymentStatus: string; saleDate: string;
    warrantyMonths: number;
  }>;
  totalBought: number;
  totalPaid: number;
  totalPending: number;
}

interface PendingPayment {
  customerId: string;
  customerName: string;
  customerPhone: string;
  pendingAmount: number;
  totalAmount: number;
  salesCount: number;
}

type FormData = {
  name: string; phone: string; address: string; aadharNo: string; type: string;
};

const emptyForm: FormData = { name: '', phone: '', address: '', aadharNo: '', type: 'both' };

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const typeBadge: Record<string, string> = {
  seller: 'badge-info', buyer: 'badge-success', both: 'badge-default',
};

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
export default function CustomersModule() {
  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // UI
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);

  // History modal
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Pending payments
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [showPending, setShowPending] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'list' | 'pending'>('list');

  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch ────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) p.set('search', search);
      const res = await fetch(`/api/crm/customers?${p}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
        setTotalCustomers(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        showToast(data.error || 'Failed to fetch', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/customers?limit=1000');
      const data = await res.json();
      if (!res.ok) return;

      // For each customer that could be a buyer, check their pending sales
      const allCustomers = data.customers || [];
      const pending: PendingPayment[] = [];

      // Get all sales with pending/partial payment
      const salesRes = await fetch('/api/crm/sales?limit=1000');
      const salesData = await salesRes.json();

      if (salesRes.ok && salesData.sales) {
        const salesByBuyer: Record<string, Array<{ pendingAmount: number; salePrice: number }>> = {};
        for (const sale of salesData.sales) {
          if (sale.paymentStatus !== 'full' && sale.pendingAmount > 0) {
            if (!salesByBuyer[sale.buyerId]) salesByBuyer[sale.buyerId] = [];
            salesByBuyer[sale.buyerId].push({ pendingAmount: sale.pendingAmount, salePrice: sale.salePrice });
          }
        }

        for (const [buyerId, sales] of Object.entries(salesByBuyer)) {
          const cust = allCustomers.find((c: Customer) => c.id === buyerId);
          if (cust) {
            pending.push({
              customerId: cust.id,
              customerName: cust.name,
              customerPhone: cust.phone,
              pendingAmount: sales.reduce((s: number, x: { pendingAmount: number }) => s + x.pendingAmount, 0),
              totalAmount: sales.reduce((s: number, x: { salePrice: number }) => s + x.salePrice, 0),
              salesCount: sales.length,
            });
          }
        }
      }

      setPendingPayments(pending.sort((a, b) => b.pendingAmount - a.pendingAmount));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Form ────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone, address: c.address, aadharNo: c.aadharNo, type: c.type });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required', 'err'); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/crm/customers?id=${editId}` : '/api/crm/customers';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        showToast(editId ? 'Customer updated!' : 'Customer added!');
        setShowForm(false);
        fetchCustomers();
      } else {
        showToast(data.error || 'Failed', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/customers?id=${deleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Customer deleted');
        setDeleteConfirm(null);
        fetchCustomers();
      } else {
        const data = await res.json();
        showToast(data.error || 'Delete failed', 'err');
      }
    } catch {
      showToast('Network error', 'err');
    } finally {
      setSaving(false);
    }
  };

  // ─── History ─────────────────────────────────────────────
  const openHistory = async (c: Customer) => {
    setHistoryCustomer(c);
    setHistoryLoading(true);
    setShowPending(false);
    try {
      const res = await fetch(`/api/crm/customers/history?id=${c.id}`);
      const data = await res.json();
      if (res.ok) setHistory(data);
      else showToast(data.error || 'Failed to load history', 'err');
    } catch {
      showToast('Network error', 'err');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPendingTab = () => {
    setShowPending(true);
    fetchPendingPayments();
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

      {/* ═══ History Modal ═══ */}
      <AnimatePresence>
        {historyCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setHistoryCustomer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h3 className="font-bold text-foreground text-base">{historyCustomer.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone size={11} /> {historyCustomer.phone || 'No phone'}
                    <span className="ml-2">{typeBadge[historyCustomer.type] && <span className={`badge ${typeBadge[historyCustomer.type]}`}>{historyCustomer.type}</span>}</span>
                  </p>
                </div>
                <button onClick={() => setHistoryCustomer(null)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(85vh-64px)] p-6">
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : history ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Sold to Shop</p>
                        <p className="text-lg font-bold text-foreground">{formatINR(history.totalSoldToShop)}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{history.soldToShop.length} phones</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Bought from Shop</p>
                        <p className="text-lg font-bold text-foreground">{formatINR(history.totalBought)}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{history.boughtFromShop.length} phones</p>
                      </div>
                      <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-lg font-bold text-emerald-500 dark:text-emerald-400">{formatINR(history.totalPaid)}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center border ${history.totalPending > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-muted/50 border-border'}`}>
                        <p className="text-xs text-muted-foreground">Pending Amount</p>
                        <p className={`text-lg font-bold ${history.totalPending > 0 ? 'text-destructive' : 'text-foreground'}`}>{formatINR(history.totalPending)}</p>
                      </div>
                    </div>

                    {/* Phones Sold to Shop */}
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                        <ShoppingBag size={15} className="text-primary" />
                        Phones Sold to Shop ({history.soldToShop.length})
                      </h4>
                      {history.soldToShop.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No phones sold to shop</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="crm-table">
                            <thead>
                              <tr><th>Date</th><th>Brand</th><th>Model</th><th>IMEI</th><th>Condition</th><th>Buy Price</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              {history.soldToShop.map((item) => (
                                <tr key={item.id}>
                                  <td className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{item.addedAt}</td>
                                  <td className="font-medium">{item.brand}</td>
                                  <td>{item.model}</td>
                                  <td className="font-mono text-xs">{item.imeiNo || '-'}</td>
                                  <td><span className={`badge ${typeBadge[item.condition] ? '' : 'badge-default'}`}>{item.condition}</span></td>
                                  <td className="font-semibold">{formatINR(item.buyPrice)}</td>
                                  <td>
                                    {item.status === 'done' ? (
                                      <span className="badge badge-info">Sold ₹{formatINR(item.soldToCustomer?.salePrice || 0)}</span>
                                    ) : (
                                      <span className={`badge ${item.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>{item.status}</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Phones Bought from Shop */}
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                        <Smartphone size={15} className="text-primary" />
                        Phones Bought ({history.boughtFromShop.length})
                      </h4>
                      {history.boughtFromShop.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No phones bought from shop</p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="crm-table">
                            <thead>
                              <tr><th>Date</th><th>Phone</th><th>Sale Price</th><th>Paid</th><th>Pending</th><th>Payment</th><th>Warranty</th></tr>
                            </thead>
                            <tbody>
                              {history.boughtFromShop.map((sale) => (
                                <tr key={sale.id}>
                                  <td className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{sale.saleDate}</td>
                                  <td className="font-medium">{sale.brand} {sale.model}</td>
                                  <td className="font-semibold">{formatINR(sale.salePrice)}</td>
                                  <td className="text-emerald-500 dark:text-emerald-400">{formatINR(sale.paidAmount)}</td>
                                  <td className={sale.pendingAmount > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}>{formatINR(sale.pendingAmount)}</td>
                                  <td>
                                    <span className={`badge ${sale.paymentStatus === 'full' ? 'badge-success' : sale.paymentStatus === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                                      {sale.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="text-xs">{sale.warrantyMonths > 0 ? `${sale.warrantyMonths} months` : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">Failed to load history</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Delete Confirmation ═══ */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !saving && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Delete Customer</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-foreground mb-5">
                Delete <strong>{deleteConfirm.name}</strong>? This may affect related sales, invoices, and orders.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirm(null)} disabled={saving} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Add/Edit Form ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="crm-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <UserPlus size={16} className="text-primary" />
                {editId ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="crm-label">Name <span className="text-destructive">*</span></label>
                <input className="crm-input" placeholder="Customer name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="crm-label">Phone</label>
                <input className="crm-input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="crm-label">Address</label>
                <textarea className="crm-input min-h-[60px] resize-none" placeholder="Full address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <label className="crm-label">Aadhar Number</label>
                <input className="crm-input" placeholder="Aadhar card number" value={form.aadharNo} onChange={(e) => setForm({ ...form, aadharNo: e.target.value })} />
              </div>
              <div>
                <label className="crm-label">Type</label>
                <select className="crm-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="seller">Seller</option>
                  <option value="buyer">Buyer</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4 pt-2">
              <button onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="crm-btn-primary">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={15} /> {editId ? 'Update' : 'Create'}</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Header ═══ */}
      {!showForm && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Customers
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{totalCustomers}</span>
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={openPendingTab} className="px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5 text-foreground">
              <CreditCard size={14} className="text-destructive" /> Pending Payments
            </button>
            <button onClick={openAdd} className="crm-btn-primary">
              <UserPlus size={15} /> Add Customer
            </button>
          </div>
        </div>
      )}

      {/* ═══ Pending Payments Section ═══ */}
      {showPending && !showForm && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CreditCard size={16} className="text-destructive" />
              Pending Payments
            </h3>
            <button onClick={() => setShowPending(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              <X size={16} />
            </button>
          </div>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No pending payments</p>
              <p className="text-xs mt-1">All customers have paid in full</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="crm-table">
                <thead>
                  <tr><th>Customer</th><th>Phone</th><th>Unpaid Sales</th><th>Total Amount</th><th>Pending</th></tr>
                </thead>
                <tbody>
                  {pendingPayments.map((pp) => (
                    <tr key={pp.customerId}>
                      <td className="font-medium text-foreground">{pp.customerName}</td>
                      <td className="text-muted-foreground">{pp.customerPhone || '-'}</td>
                      <td>{pp.salesCount} sale{pp.salesCount > 1 ? 's' : ''}</td>
                      <td>{formatINR(pp.totalAmount)}</td>
                      <td className="font-bold text-destructive">{formatINR(pp.pendingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══ Search & Filter ═══ */}
      {!showForm && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border border-border bg-card p-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="crm-input pl-9" placeholder="Search by name or phone..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <select className="crm-input w-[130px]" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>
            <option value="seller">Seller</option>
            <option value="buyer">Buyer</option>
            <option value="both">Both</option>
          </select>
        </div>
      )}

      {/* ═══ Customer List ═══ */}
      {!showForm && (
        <div className="crm-card p-0 overflow-hidden">
          <div className="max-h-[calc(100vh-340px)] overflow-x-auto overflow-y-auto">
            <table className="crm-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="hidden md:table-cell">Address</th>
                  <th className="hidden lg:table-cell">Aadhar</th>
                  <th>Type</th>
                  <th className="hidden sm:table-cell">Added</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading customers...</span>
                      </div>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-muted-foreground">
                      <Users size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No customers found</p>
                      <p className="text-xs mt-1">{search ? 'Try a different search' : 'Click "Add Customer" to start'}</p>
                    </td>
                  </tr>
                ) : (
                  customers
                    .filter((c) => typeFilter === 'all' || c.type === typeFilter)
                    .map((c) => (
                    <tr key={c.id} className="group">
                      <td>
                        <button onClick={() => openHistory(c)} className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                          <Eye size={13} className="text-muted-foreground group-hover:text-primary" />
                          {c.name}
                        </button>
                      </td>
                      <td className="text-muted-foreground flex items-center gap-1">
                        <Phone size={12} /> {c.phone || '-'}
                      </td>
                      <td className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-muted-foreground/60 flex-shrink-0" />{c.address || '-'}</span>
                      </td>
                      <td className="hidden lg:table-cell text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><CreditCard size={12} className="text-muted-foreground/60" />{c.aadharNo || '-'}</span>
                      </td>
                      <td><span className={`badge ${typeBadge[c.type] || 'badge-default'}`}>{c.type}</span></td>
                      <td className="hidden sm:table-cell text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openHistory(c)} className="p-1.5 rounded-lg hover:bg-primary/5 text-primary transition-colors" title="History"><Eye size={14} /></button>
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-primary/5 text-primary transition-colors" title="Edit"><Edit size={14} /></button>
                          <button onClick={() => setDeleteConfirm(c)} className="p-1.5 rounded-lg hover:bg-destructive/5 text-destructive transition-colors" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
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
      )}
    </div>
  );
}
