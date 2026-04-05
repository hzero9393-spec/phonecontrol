'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCRMStore } from '@/store/use-crm-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  role: string;
  fullName: string;
  mobile: string;
  email: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const roleColors: Record<string, string> = {
  master: 'bg-amber-100 text-amber-800 border-amber-300',
  admin: 'bg-primary/10 text-primary border-primary/20',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

const emptyForm = {
  username: '',
  password: '',
  role: 'admin',
  fullName: '',
  mobile: '',
  email: '',
};

export default function AdminModule() {
  const { toast } = useToast();
  const { admin: loggedInAdmin, isMasterAdmin } = useCRMStore();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    if (!isMasterAdmin()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/crm/admins', {
        headers: { 'x-admin-id': loggedInAdmin?.id || '' },
      });
      const data = await res.json();
      if (res.ok) {
        setAdmins(data);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to fetch admins', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isMasterAdmin, loggedInAdmin?.id, toast]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSubmit = async () => {
    if (!form.username) {
      toast({ title: 'Validation Error', description: 'Username is required', variant: 'destructive' });
      return;
    }
    if (!editingId && !form.password) {
      toast({ title: 'Validation Error', description: 'Password is required for new admin', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId ? `/api/crm/admins?id=${editingId}` : '/api/crm/admins';
      const method = editingId ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = { ...form };
      // Don't send empty password for edits
      if (editingId && !form.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': loggedInAdmin?.id || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (!editingId) {
          // New admin created — show credentials clearly
          toast({
            title: '✅ Admin Created Successfully!',
            description: `Username: ${form.username}  |  Password: ${form.password}. You can now login with these credentials.`,
            duration: 6000,
          });
        } else {
          toast({ title: '✅ Admin Updated', description: `${form.username} has been updated.` });
        }
        setDialogOpen(false);
        setForm(emptyForm);
        setEditingId(null);
        setShowPassword(false);
        fetchAdmins();
      } else {
        toast({ title: 'Error', description: data.error || 'Operation failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (adminUser: AdminUser) => {
    setEditingId(adminUser.id);
    setForm({
      username: adminUser.username,
      password: '',
      role: adminUser.role,
      fullName: adminUser.fullName,
      mobile: adminUser.mobile,
      email: adminUser.email,
    });
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/admins?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': loggedInAdmin?.id || '' },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Admin Deleted', description: 'Admin user has been removed' });
        setDeleteConfirm(null);
        fetchAdmins();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openNewAdmin = () => {
    setEditingId(null);
    setForm({ ...emptyForm, role: 'admin' });
    setShowPassword(false);
    setDialogOpen(true);
  };

  if (!isMasterAdmin()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Shield size={48} className="mb-4 opacity-50" />
        <p className="text-lg font-medium">Access Denied</p>
        <p className="text-sm mt-1">Only master admins can manage users</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Admin Users</h2>
          <p className="text-sm text-muted-foreground">Manage admin accounts and permissions</p>
        </div>
        <Button onClick={openNewAdmin} className="bg-primary hover:bg-primary/90 text-white">
          <Plus size={16} className="mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Logged-in admin indicator */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
        <UserCheck size={18} className="text-primary shrink-0" />
        <p className="text-sm text-foreground">
          Logged in as <span className="font-semibold">{loggedInAdmin?.fullName || loggedInAdmin?.username}</span>
          <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-300 text-xs">Master</Badge>
        </p>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Shield size={40} className="mb-3 opacity-50" />
            <p className="font-medium">No admin users found</p>
            <p className="text-sm mt-1">Add a new admin to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">Username</TableHead>
                  <TableHead className="font-semibold text-foreground">Full Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-foreground">Mobile</TableHead>
                  <TableHead className="font-semibold text-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-foreground">Created</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((adminUser) => {
                  const isSelf = adminUser.id === loggedInAdmin?.id;
                  const isMaster = adminUser.role === 'master';

                  return (
                    <TableRow key={adminUser.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {adminUser.username}
                        {isSelf && (
                          <span className="ml-2 text-xs text-primary font-normal">(you)</span>
                        )}
                      </TableCell>
                      <TableCell>{adminUser.fullName || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[adminUser.role] || ''} border text-xs font-semibold capitalize`}>
                          {adminUser.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{adminUser.mobile || '-'}</TableCell>
                      <TableCell>{adminUser.email || '-'}</TableCell>
                      <TableCell>{formatDate(adminUser.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(adminUser)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            disabled={isMaster && !isSelf}
                          >
                            <Edit size={15} />
                          </Button>
                          {!isSelf && !isMaster && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(adminUser.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 size={15} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Admin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update admin user details below' : 'Create a new admin account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username *</Label>
              <Input
                id="admin-username"
                placeholder="Enter username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Password {editingId && <span className="text-muted-foreground font-normal">(leave blank to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editingId ? 'Enter new password' : 'Enter password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  {editingId && (
                    <SelectItem value="master">Master</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="admin-fullname">Full Name</Label>
              <Input
                id="admin-fullname"
                placeholder="Enter full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="admin-mobile">Mobile</Label>
              <Input
                id="admin-mobile"
                placeholder="Enter mobile number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
              {editingId ? 'Update Admin' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              Delete Admin
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this admin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={submitting}
            >
              {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
