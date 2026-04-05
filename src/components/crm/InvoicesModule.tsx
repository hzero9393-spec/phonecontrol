'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Eye, Printer, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ───────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  invoiceNo: string;
  saleId: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  gstAmount: number;
  createdAt: string;
  sale: {
    id: string;
    salePrice: number;
    paymentStatus: string;
    warrantyMonths: number;
    saleDate: string;
    inventory: {
      id: string;
      brand: string;
      model: string;
      imeiNo: string;
    };
    buyer: {
      id: string;
      name: string;
      phone: string;
    };
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
}

interface InvoiceDetail extends InvoiceItem {
  sale: {
    id: string;
    salePrice: number;
    paymentStatus: string;
    paidAmount: number;
    pendingAmount: number;
    warrantyMonths: number;
    saleDate: string;
    inventory: {
      id: string;
      brand: string;
      model: string;
      ram: string;
      storage: string;
      color: string;
      imeiNo: string;
      condition: string;
      buyPrice: number;
    };
    buyer: {
      id: string;
      name: string;
      phone: string;
      address: string;
      aadharNo: string;
      type: string;
    };
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    aadharNo: string;
    type: string;
  };
}

interface ShopDetails {
  id: string;
  shopName: string;
  gstNo: string;
  address: string;
  phone: string;
  logo: string;
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

// ─── Invoice Print View ─────────────────────────────────
function InvoicePrintView({
  invoice,
  shop,
}: {
  invoice: InvoiceDetail;
  shop: ShopDetails | null;
}) {
  const shopName = shop?.shopName || 'Phone Buy & Sell Shop';
  const shopAddress = shop?.address || '';
  const shopPhone = shop?.phone || '';
  const shopGst = shop?.gstNo || '';

  const baseAmount = invoice.totalAmount - invoice.gstAmount;
  const cgst = invoice.gstAmount / 2;
  const sgst = invoice.gstAmount / 2;

  return (
    <div id="invoice-print-area" className="bg-white text-black p-8 max-w-2xl mx-auto">
      {/* Shop header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{shopName}</h1>
        {shopAddress && <p className="text-sm text-foreground mt-1">{shopAddress}</p>}
        {shopPhone && <p className="text-sm text-foreground">Phone: {shopPhone}</p>}
        {shopGst && <p className="text-sm text-foreground">GSTIN: {shopGst}</p>}
      </div>

      <Separator className="my-4" />

      {/* Invoice title */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold">TAX INVOICE</h2>
          <p className="text-sm text-foreground">{invoice.invoiceNo}</p>
        </div>
        <div className="text-right text-sm text-foreground">
          <p>Date: {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Customer details */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-bold text-foreground mb-2">Bill To:</h3>
        <p className="font-semibold">{invoice.customer.name}</p>
        {invoice.customer.phone && <p className="text-sm text-foreground">Phone: {invoice.customer.phone}</p>}
        {invoice.customer.address && <p className="text-sm text-foreground">Address: {invoice.customer.address}</p>}
      </div>

      {/* Item details */}
      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 font-semibold">#</th>
            <th className="text-left py-2 font-semibold">Item Description</th>
            <th className="text-left py-2 font-semibold">IMEI</th>
            <th className="text-right py-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <td className="py-3">1</td>
            <td>
              <p className="font-medium">{invoice.sale.inventory.brand} {invoice.sale.inventory.model}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.sale.inventory.ram && invoice.sale.inventory.storage
                  ? `${invoice.sale.inventory.ram} / ${invoice.sale.inventory.storage}`
                  : ''}
                {invoice.sale.inventory.color ? ` • ${invoice.sale.inventory.color}` : ''}
                {invoice.sale.inventory.condition ? ` • ${invoice.sale.inventory.condition}` : ''}
              </p>
            </td>
            <td className="text-foreground">{invoice.sale.inventory.imeiNo || '—'}</td>
            <td className="text-right font-semibold">{fmt(baseAmount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Price breakdown */}
      <div className="border-t-2 border-gray-300 pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-foreground">Subtotal</span>
          <span className="font-medium">{fmt(baseAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground">CGST (9%)</span>
          <span className="font-medium">{fmt(cgst)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground">SGST (9%)</span>
          <span className="font-medium">{fmt(sgst)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground">GST Total (18%)</span>
          <span className="font-medium">{fmt(invoice.gstAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-lg font-bold">
          <span>Grand Total</span>
          <span>{fmt(invoice.totalAmount)}</span>
        </div>
      </div>

      {/* Payment info */}
      <div className="mt-6 p-4 bg-muted rounded-lg text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-foreground">Paid Amount:</span>
          <span className="font-semibold text-success">{fmt(invoice.paidAmount)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-foreground">Pending Amount:</span>
          <span className={`font-semibold ${invoice.pendingAmount > 0 ? 'text-destructive' : 'text-success'}`}>
            {fmt(invoice.pendingAmount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground">Payment Status:</span>
          <PaymentBadge status={invoice.sale.paymentStatus} />
        </div>
      </div>

      {/* Warranty */}
      {invoice.sale.warrantyMonths > 0 && (
        <div className="mt-4 text-sm text-foreground">
          <p className="font-medium">Warranty: {invoice.sale.warrantyMonths} months from date of purchase</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
        <p>Thank you for your purchase!</p>
        <p className="mt-1">This is a computer-generated invoice.</p>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function InvoicesModule() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // View dialog state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceDetail | null>(null);
  const [viewShop, setViewShop] = useState<ShopDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Fetch invoices list ─────────────────────────────
  const fetchInvoices = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/crm/invoices?${params}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setInvoices(data.invoices || []);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ─── Search handler ──────────────────────────────────
  const handleSearch = (value: string) => {
    setSearch(value);
    fetchInvoices(1, value);
  };

  // ─── Pagination ──────────────────────────────────────
  const goToPage = (page: number) => {
    fetchInvoices(page, search);
  };

  // ─── View invoice detail ─────────────────────────────
  const handleView = async (invoiceId: string) => {
    setLoadingDetail(true);
    setViewOpen(true);
    try {
      const res = await fetch(`/api/crm/invoices?id=${invoiceId}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setViewOpen(false);
        return;
      }
      setViewInvoice(data.invoice);
      setViewShop(data.shop);
    } catch {
      toast.error('Failed to load invoice');
      setViewOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ─── Print invoice ───────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText size={24} className="text-primary" />
            Invoices
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all sales invoices
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice no, customer, phone..."
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
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Customer</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Total</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Paid</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Pending</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">GST</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-muted-foreground" size={28} />
                    <p className="text-sm text-muted-foreground mt-2">Loading invoices...</p>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <FileText size={40} className="mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mt-2">No invoices found</p>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {inv.invoiceNo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{inv.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{inv.customer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right text-success font-medium">
                      {fmt(inv.paidAmount)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${inv.pendingAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                      {fmt(inv.pendingAmount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmt(inv.gstAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(inv.id)}
                          title="View"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(inv.id)}
                          title="Print"
                        >
                          <Printer size={16} />
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

      {/* ─── Invoice View / Print Dialog ─────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={20} />
              Invoice: {viewInvoice?.invoiceNo || ''}
            </DialogTitle>
            <DialogDescription>
              Full invoice details with GST breakdown
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
              <p className="ml-3 text-muted-foreground">Loading invoice...</p>
            </div>
          ) : viewInvoice ? (
            <>
              <InvoicePrintView invoice={viewInvoice} shop={viewShop} />

              <div className="flex justify-end gap-3 no-print pt-2">
                <Button variant="outline" onClick={() => setViewOpen(false)}>
                  Close
                </Button>
                <Button onClick={handlePrint} className="gap-2">
                  <Printer size={16} />
                  Print Invoice
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
