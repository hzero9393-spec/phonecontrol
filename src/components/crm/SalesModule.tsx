'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Eye, Edit2, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────
interface InventoryItem {
  id: string;
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  imeiNo: string;
  condition: string;
  buyPrice: number;
  status: string;
}

interface BuyerCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: string;
}

interface InvoiceRef {
  id: string;
  invoiceNo: string;
}

interface SaleRecord {
  id: string;
  inventoryId: string;
  buyerId: string;
  salePrice: number;
  paymentStatus: string;
  paidAmount: number;
  pendingAmount: number;
  warrantyMonths: number;
  saleDate: string;
  createdAt: string;
  inventory: InventoryItem;
  buyer: BuyerCustomer;
  invoices: InvoiceRef[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Price formatter ─────────────────────────────────────
const priceFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const fmt = (n: number) => priceFmt.format(n);

// ─── Payment badge ──────────────────────────────────────
function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    full: { label: 'Full', className: 'bg-success/10 text-success border-success/20' },
    partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
    pending: { label: 'Pending', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.className}`}>
      {c.label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function SalesModule() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);

  // Form state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [buyerCustomers, setBuyerCustomers] = useState<BuyerCustomer[]>([]);
  const [form, setForm] = useState({
    inventoryId: '',
    buyerId: '',
    salePrice: '',
    paymentStatus: 'pending',
    paidAmount: '',
    pendingAmount: '',
    warrantyMonths: '3',
    saleDate: new Date().toISOString().slice(0, 10),
  });

  // ─── Fetch sales ─────────────────────────────────────
  const fetchSales = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/crm/sales?${params}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setSales(data.sales || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ─── Search handler ──────────────────────────────────
  const handleSearch = (value: string) => {
    setSearch(value);
    fetchSales(1, value);
  };

  // ─── Pagination ──────────────────────────────────────
  const goToPage = (page: number) => {
    fetchSales(page, search);
  };

  // ─── Open new sale dialog ────────────────────────────
  const openNewDialog = async () => {
    setEditingSale(null);
    setForm({
      inventoryId: '',
      buyerId: '',
      salePrice: '',
      paymentStatus: 'pending',
      paidAmount: '',
      pendingAmount: '',
      warrantyMonths: '3',
      saleDate: new Date().toISOString().slice(0, 10),
    });

    try {
      const [invRes, custRes] = await Promise.all([
        fetch('/api/crm/sales'),
        fetch('/api/crm/customers?type=buyer'),
      ]);

      // Fetch inventory items with status != 'done' from inventory endpoint
      const allSalesRes = await invRes.json();
      // We need to get available inventory - fetch all inventory and filter
      const inventoryRes = await fetch('/api/crm/inventory?status=available');
      const inventoryData = await inventoryRes.json();

      if (inventoryData.inventory) {
        setInventoryItems(inventoryData.inventory);
      } else {
        // Fallback: fetch all inventory
        const allInvRes = await fetch('/api/crm/inventory');
        const allInvData = await allInvRes.json();
        const availableInv = (allInvData.inventory || []).filter(
          (item: InventoryItem) => item.status !== 'done'
        );
        setInventoryItems(availableInv);
      }

      const custData = await custRes.json();
      setBuyerCustomers(custData.customers || []);
    } catch {
      toast.error('Failed to load form data');
    }

    setDialogOpen(true);
  };

  // ─── Open edit dialog ────────────────────────────────
  const openEditDialog = (sale: SaleRecord) => {
    setEditingSale(sale);
    setForm({
      inventoryId: sale.inventoryId,
      buyerId: sale.buyerId,
      salePrice: String(sale.salePrice),
      paymentStatus: sale.paymentStatus,
      paidAmount: String(sale.paidAmount),
      pendingAmount: String(sale.pendingAmount),
      warrantyMonths: String(sale.warrantyMonths),
      saleDate: new Date(sale.saleDate).toISOString().slice(0, 10),
    });
    setInventoryItems([sale.inventory]);
    setBuyerCustomers([sale.buyer]);
    setDialogOpen(true);
  };

  // ─── Handle inventory selection (pre-fill price) ─────
  const handleInventoryChange = (inventoryId: string) => {
    const item = inventoryItems.find((i) => i.id === inventoryId);
    const salePrice = item ? String(item.buyPrice) : '';
    setForm((prev) => ({
      ...prev,
      inventoryId,
      salePrice,
      paidAmount: '',
      pendingAmount: salePrice,
    }));
  };

  // ─── Handle payment status / amounts ─────────────────
  const handlePaymentChange = (status: string) => {
    const total = parseFloat(form.salePrice) || 0;
    let paid = parseFloat(form.paidAmount) || 0;
    let pending = total - paid;

    if (status === 'full') {
      paid = total;
      pending = 0;
    } else if (status === 'pending') {
      paid = 0;
      pending = total;
    }

    setForm((prev) => ({
      ...prev,
      paymentStatus: status,
      paidAmount: String(paid),
      pendingAmount: String(Math.max(0, pending)),
    }));
  };

  const handlePaidAmountChange = (value: string) => {
    const total = parseFloat(form.salePrice) || 0;
    const paid = parseFloat(value) || 0;
    const pending = Math.max(0, total - paid);
    const status = paid >= total ? 'full' : paid > 0 ? 'partial' : 'pending';

    setForm((prev) => ({
      ...prev,
      paidAmount: value,
      pendingAmount: String(pending),
      paymentStatus: status,
    }));
  };

  // ─── Submit (create or update) ───────────────────────
  const handleSubmit = async () => {
    if (!form.inventoryId || !form.buyerId || !form.salePrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const total = parseFloat(form.salePrice) || 0;
    const payload = {
      inventoryId: form.inventoryId,
      buyerId: form.buyerId,
      salePrice: total,
      paymentStatus: form.paymentStatus,
      paidAmount: parseFloat(form.paidAmount) || 0,
      pendingAmount: parseFloat(form.pendingAmount) || 0,
      warrantyMonths: parseInt(form.warrantyMonths, 10) || 0,
      saleDate: form.saleDate,
    };

    setSubmitting(true);
    try {
      if (editingSale) {
        // PUT - update
        const { inventoryId, ...updateData } = payload;
        const res = await fetch(`/api/crm/sales?id=${editingSale.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }
        toast.success('Sale updated successfully');
      } else {
        // POST - create
        const res = await fetch('/api/crm/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
          return;
        }
        toast.success('Sale created successfully');
      }
      setDialogOpen(false);
      fetchSales(pagination.page, search);
    } catch {
      toast.error('Failed to save sale');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt size={24} className="text-primary" />
            Sales
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage phone sales and track payments
          </p>
        </div>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus size={18} />
          New Sale
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by buyer, phone, IMEI..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Invoice No</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Phone</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Buyer</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Sale Price</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Payment</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-muted-foreground" size={28} />
                    <p className="text-sm text-muted-foreground mt-2">Loading sales...</p>
                  </TableCell>
                </TableRow>
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Receipt size={40} className="mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mt-2">No sales found</p>
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">
                      {sale.invoices[0]?.invoiceNo || '—'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.inventory.brand} {sale.inventory.model}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.inventory.ram && sale.inventory.storage
                            ? `${sale.inventory.ram}/${sale.inventory.storage}`
                            : sale.inventory.imeiNo || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.buyer.name}</p>
                        <p className="text-xs text-muted-foreground">{sale.buyer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(sale.salePrice)}
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={sale.paymentStatus} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Paid: {fmt(sale.paidAmount)} | Due: {fmt(sale.pendingAmount)}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sale.saleDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sale)} title="Edit">
                          <Edit2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── New / Edit Sale Dialog ──────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit Sale' : 'New Sale'}</DialogTitle>
            <DialogDescription>
              {editingSale
                ? 'Update the sale details below.'
                : 'Select a phone and buyer to create a new sale.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Inventory */}
            <div className="space-y-2">
              <Label htmlFor="inventory">Phone (Inventory) *</Label>
              <Select
                value={form.inventoryId}
                onValueChange={handleInventoryChange}
                disabled={!!editingSale}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phone..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.brand} {item.model}{' '}
                      {item.imeiNo ? `(IMEI: ${item.imeiNo})` : ''}
                      {' — '}
                      {fmt(item.buyPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buyer */}
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer (Customer) *</Label>
              <Select
                value={form.buyerId}
                onValueChange={(val) => setForm((prev) => ({ ...prev, buyerId: val }))}
                disabled={!!editingSale}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a buyer..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {buyerCustomers.map((cust) => (
                    <SelectItem key={cust.id} value={cust.id}>
                      {cust.name} {cust.phone ? `(${cust.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sale Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price (₹) *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.salePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    const total = parseFloat(val) || 0;
                    const paid = parseFloat(form.paidAmount) || 0;
                    setForm((prev) => ({
                      ...prev,
                      salePrice: val,
                      pendingAmount: String(Math.max(0, total - paid)),
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty (months)</Label>
                <Input
                  id="warranty"
                  type="number"
                  min="0"
                  value={form.warrantyMonths}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, warrantyMonths: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Sale Date */}
            <div className="space-y-2">
              <Label htmlFor="saleDate">Sale Date</Label>
              <Input
                id="saleDate"
                type="date"
                value={form.saleDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, saleDate: e.target.value }))
                }
              />
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={form.paymentStatus} onValueChange={handlePaymentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Payment</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paid & Pending */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.paidAmount}
                  onChange={(e) => handlePaidAmountChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pendingAmount">Pending Amount (₹)</Label>
                <Input
                  id="pendingAmount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.pendingAmount}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {editingSale ? 'Update Sale' : 'Create Sale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
