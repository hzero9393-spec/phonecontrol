'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Smartphone,
  Wrench,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FormData = {
  brand: string;
  model: string;
  ram: string;
  storage: string;
  color: string;
  imeiNo: string;
  condition: string;
  status: string;
  sellerId: string;
  buyPrice: string;
  repairRequired: boolean;
  repairDetails: string;
  repairCost: string;
  repairStatus: string;
};

const emptyForm: FormData = {
  brand: '',
  model: '',
  ram: '',
  storage: '',
  color: '',
  imeiNo: '',
  condition: 'good',
  status: 'pending',
  sellerId: '',
  buyPrice: '',
  repairRequired: false,
  repairDetails: '',
  repairCost: '',
  repairStatus: 'none',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusBadge: Record<string, string> = {
  pending: 'badge-warning border-amber-200',
  complete: 'badge-success border-green-200',
  done: 'bg-primary/10 text-primary border-primary/20',
};

const conditionBadge: Record<string, string> = {
  good: 'badge-success border-green-200',
  average: 'badge-warning border-amber-200',
  poor: 'badge-danger border-red-200',
};

const repairStatusColor: Record<string, string> = {
  none: 'text-muted-foreground',
  pending: 'text-amber-500',
  in_progress: 'text-primary',
  completed: 'text-green-500',
};

const repairStatusLabel: Record<string, string> = {
  none: 'None',
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InventoryModule() {
  const { toast } = useToast();

  // Data state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  // UI state
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch data ──────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (conditionFilter && conditionFilter !== 'all') params.set('condition', conditionFilter);
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      const res = await fetch(`/api/crm/inventory?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setPagination(data.pagination || pagination);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch items', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error while fetching items', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, conditionFilter, pagination.page, pagination.limit, toast]);

  const fetchSellers = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/inventory?action=sellers');
      const data = await res.json();
      if (res.ok) {
        setSellers(data.sellers || []);
      }
    } catch {
      // Silently fail - sellers are optional
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  // ─── Search with debounce ────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── Form helpers ────────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      brand: item.brand,
      model: item.model,
      ram: item.ram,
      storage: item.storage,
      color: item.color,
      imeiNo: item.imeiNo,
      condition: item.condition,
      status: item.status,
      sellerId: item.sellerId || '',
      buyPrice: item.buyPrice ? item.buyPrice.toString() : '',
      repairRequired: item.repairRequired,
      repairDetails: item.repairDetails,
      repairCost: item.repairCost ? item.repairCost.toString() : '',
      repairStatus: item.repairStatus,
    });
    setFormOpen(true);
  };

  const openDeleteDialog = (item: InventoryItem) => {
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // If repairRequired is toggled on, set default repair status
      if (field === 'repairRequired' && value === true && prev.repairStatus === 'none') {
        updated.repairStatus = 'pending';
      }
      // If repairRequired is toggled off, reset repair fields
      if (field === 'repairRequired' && value === false) {
        updated.repairStatus = 'none';
        updated.repairDetails = '';
        updated.repairCost = '';
      }

      return updated;
    });
  };

  // ─── CRUD operations ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.brand.trim() || !form.model.trim()) {
      toast({ title: 'Validation Error', description: 'Brand and model are required', variant: 'destructive' });
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

      const url = editingItem
        ? `/api/crm/inventory?id=${editingItem.id}`
        : '/api/crm/inventory';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: editingItem ? 'Phone Updated' : 'Phone Added',
          description: `${form.brand} ${form.model} has been ${editingItem ? 'updated' : 'added to inventory'} successfully.`,
        });
        setFormOpen(false);
        fetchItems();
      } else {
        toast({ title: 'Error', description: data.error || 'Operation failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/inventory?id=${deletingItem.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Phone Deleted',
          description: `${deletingItem.brand} ${deletingItem.model} has been removed from inventory.`,
        });
        setDeleteOpen(false);
        setDeletingItem(null);
        fetchItems();
      } else {
        toast({ title: 'Delete Failed', description: data.error || 'Could not delete item', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Pagination ──────────────────────────────────────────────────────────

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  };

  const getPageNumbers = () => {
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <h2 className="text-xl font-semibold text-foreground">Inventory</h2>
          <Badge variant="secondary" className="text-xs">
            {pagination.total} items
          </Badge>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          Add Phone
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by brand, model or IMEI..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPagination((prev) => ({ ...prev, page: 1 })); }}>
            <SelectTrigger className="w-[140px]" size="sm">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={(val) => { setConditionFilter(val); setPagination((prev) => ({ ...prev, page: 1 })); }}>
            <SelectTrigger className="w-[150px]" size="sm">
              <SelectValue placeholder="All Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Condition</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[calc(100vh-340px)] overflow-x-auto overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Brand</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Model</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">RAM/Storage</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Color</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">IMEI</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Condition</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Buy Price</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Repair</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Seller</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Smartphone className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No phones found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' || conditionFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Click "Add Phone" to get started'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell className="font-medium text-foreground">{item.brand}</TableCell>
                    <TableCell className="text-foreground">{item.model}</TableCell>
                    <TableCell className="text-foreground text-xs">
                      {item.ram && item.storage ? `${item.ram} / ${item.storage}` : item.ram || item.storage || '-'}
                    </TableCell>
                    <TableCell className="text-foreground capitalize">{item.color || '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{item.imeiNo || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold capitalize ${conditionBadge[item.condition] || ''}`}
                      >
                        {item.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold capitalize ${statusBadge[item.status] || ''}`}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{formatINR(item.buyPrice)}</TableCell>
                    <TableCell>
                      {item.repairRequired ? (
                        <div className="flex items-center gap-1.5" title={`Repair: ${repairStatusLabel[item.repairStatus] || item.repairStatus}`}>
                          <Wrench className={`h-4 w-4 ${repairStatusColor[item.repairStatus] || 'text-muted-foreground'}`} />
                          <span className="hidden text-xs lg:inline">
                            {repairStatusLabel[item.repairStatus] || item.repairStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground text-sm">
                      {item.seller?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => openDeleteDialog(item)}
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}
              &ndash;
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPageNumbers().map((p, idx) =>
                typeof p === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === pagination.page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add/Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open && !submitting) setFormOpen(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              {editingItem ? 'Edit Phone' : 'Add New Phone'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the phone details below.' : 'Enter the details of the phone to add to inventory.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Brand */}
            <div className="space-y-1.5">
              <Label htmlFor="brand">
                Brand <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                placeholder="e.g. Samsung, Apple"
                value={form.brand}
                onChange={(e) => handleFormChange('brand', e.target.value)}
              />
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                placeholder="e.g. Galaxy S24, iPhone 15"
                value={form.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
              />
            </div>

            {/* RAM */}
            <div className="space-y-1.5">
              <Label htmlFor="ram">RAM</Label>
              <Input
                id="ram"
                placeholder="e.g. 8GB"
                value={form.ram}
                onChange={(e) => handleFormChange('ram', e.target.value)}
              />
            </div>

            {/* Storage */}
            <div className="space-y-1.5">
              <Label htmlFor="storage">Storage</Label>
              <Input
                id="storage"
                placeholder="e.g. 128GB"
                value={form.storage}
                onChange={(e) => handleFormChange('storage', e.target.value)}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g. Midnight Black"
                value={form.color}
                onChange={(e) => handleFormChange('color', e.target.value)}
              />
            </div>

            {/* IMEI */}
            <div className="space-y-1.5">
              <Label htmlFor="imeiNo">IMEI Number</Label>
              <Input
                id="imeiNo"
                placeholder="15-digit IMEI"
                value={form.imeiNo}
                onChange={(e) => handleFormChange('imeiNo', e.target.value)}
              />
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(val) => handleFormChange('condition', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => handleFormChange('status', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Buy Price */}
            <div className="space-y-1.5">
              <Label htmlFor="buyPrice">Buy Price (₹)</Label>
              <Input
                id="buyPrice"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 15000"
                value={form.buyPrice}
                onChange={(e) => handleFormChange('buyPrice', e.target.value)}
              />
            </div>

            {/* Seller */}
            <div className="space-y-1.5">
              <Label>Seller</Label>
              <Select value={form.sellerId} onValueChange={(val) => handleFormChange('sellerId', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select seller (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Repair Section */}
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="repairRequired" className="cursor-pointer">Repair Required</Label>
                </div>
                <Switch
                  id="repairRequired"
                  checked={form.repairRequired}
                  onCheckedChange={(checked) => handleFormChange('repairRequired', checked)}
                />
              </div>

              {form.repairRequired && (
                <div className="ml-1 grid grid-cols-1 gap-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 sm:grid-cols-3">
                  {/* Repair Details */}
                  <div className="space-y-1.5 sm:col-span-3">
                    <Label htmlFor="repairDetails" className="text-amber-800">
                      Repair Details
                    </Label>
                    <Textarea
                      id="repairDetails"
                      placeholder="Describe what needs to be repaired..."
                      value={form.repairDetails}
                      onChange={(e) => handleFormChange('repairDetails', e.target.value)}
                      className="min-h-[60px] resize-none bg-card"
                    />
                  </div>

                  {/* Repair Cost */}
                  <div className="space-y-1.5">
                    <Label htmlFor="repairCost" className="text-amber-800">
                      Repair Cost (₹)
                    </Label>
                    <Input
                      id="repairCost"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 2000"
                      value={form.repairCost}
                      onChange={(e) => handleFormChange('repairCost', e.target.value)}
                      className="bg-card"
                    />
                  </div>

                  {/* Repair Status */}
                  <div className="space-y-1.5">
                    <Label className="text-amber-800">Repair Status</Label>
                    <Select value={form.repairStatus} onValueChange={(val) => handleFormChange('repairStatus', val)}>
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {editingItem ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {editingItem ? 'Update Phone' : 'Add Phone'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ───────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => { if (!open && !submitting) { setDeleteOpen(false); setDeletingItem(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Phone
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deletingItem?.brand} {deletingItem?.model}
              </span>
              {deletingItem?.imeiNo ? (
                <>
                  {' '}with IMEI{' '}
                  <span className="font-mono text-foreground">{deletingItem.imeiNo}</span>
                </>
              ) : null}
              ? This action cannot be undone. Items with sale records cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="gap-1.5 bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
