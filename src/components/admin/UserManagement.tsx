import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Label } from '@/components/ui/forms/label';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-display/table';
import { Badge } from '@/components/ui/data-display/badge';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ShieldCheck, Edit2, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/navigation/tabs';
import { Users, Shield, Database } from 'lucide-react';
import { RolePermissionsTab } from './RolePermissionsTab';
import { DatabaseSeederTab } from './DatabaseSeederTab';

export function UserManagement() {
  const { token, profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role === 'Admin') {
      loadUsers();
    }
  }, [profile, token]);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const defaultUserData = {
    email: '', password: '', role: 'Sales',
    firstName: '', lastName: '', street: '',
    postalCode: '', city: '', province: '', country: ''
  };

  const [newUserData, setNewUserData] = useState({ ...defaultUserData });

  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const users = results.data;
        if (!users || users.length === 0) {
          toast.error("The CSV file is empty or invalid.");
          setBulkImporting(false);
          return;
        }

        try {
          const response = await fetchApi('/users/bulk', token as string, {
            method: 'POST',
            body: JSON.stringify({ users })
          });
          
          if (response.errors && response.errors.length > 0) {
            toast.warning(`Import completed with ${response.errors.length} errors. ${response.created?.length || 0} created.`);
            console.error("Bulk import errors:", response.errors);
          } else {
            toast.success(`Successfully imported ${response.created?.length || 0} users.`);
          }
          
          setIsBulkImportOpen(false);
          loadUsers();
        } catch (error: any) {
          toast.error(error.message || 'Failed to import users');
        } finally {
          setBulkImporting(false);
        }
      },
      error: (err) => {
        toast.error("Failed to parse CSV file: " + err.message);
        setBulkImporting(false);
      }
    });
  };


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await fetchApi('/users', token, {
        method: 'POST',
        body: JSON.stringify(newUserData)
      });
      toast.success('User created successfully');
      setIsRegisterOpen(false);
      setNewUserData({ ...defaultUserData });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUserId) return;
    try {
      await fetchApi(`/users/${editingUserId}`, token, {
        method: 'PUT',
        body: JSON.stringify(newUserData)
      });
      toast.success('User updated successfully');
      setIsEditOpen(false);
      setNewUserData({ ...defaultUserData });
      setEditingUserId(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const openEditModal = (user: any) => {
    setNewUserData({
      email: user.email || '',
      password: '', // Leave blank so we only update if provided
      role: user.role || 'Ejecutivo',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      street: user.street || '',
      postalCode: user.postalCode || '',
      city: user.city || '',
      province: user.province || '',
      country: user.country || ''
    });
    setEditingUserId(user.id);
    setIsEditOpen(true);
  };

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await fetchApi('/users', token);
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    try {
      await fetchApi(`/users/${userId}/role`, token, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      toast.success('Role updated successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  if (profile?.role !== 'Admin') {
    return (
      <div className="flex h-[400px] items-center justify-center border rounded-xl border-dashed border-border">
        <div className="text-center">
          <ShieldCheck className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-muted-foreground font-medium">Access Denied</p>
          <p className="text-muted-foreground text-sm">You need Admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">User Management</h2>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Permissions
          </TabsTrigger>
          <TabsTrigger value="seed-database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database Seeder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="m-0 space-y-6">
      <div className="flex justify-between items-center">
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import CSV
          </Button>
          <Button onClick={() => setIsRegisterOpen(true)}>Create User</Button>
        </div>

        
        
        <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bulk Import Users</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with the following headers: 
                <br/><code className="text-xs">email, password, role, firstName, lastName, street, postalCode, city, province, country</code>
              </p>
              <Input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                disabled={bulkImporting}
              />
              {bulkImporting && <p className="text-sm text-blue-500">Importing users, please wait...</p>}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input required value={newUserData.firstName} onChange={e => setNewUserData({...newUserData, firstName: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input required value={newUserData.lastName} onChange={e => setNewUserData({...newUserData, lastName: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <Input type="password" required={true} value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={newUserData.role}
          onChange={e => setNewUserData({...newUserData, role: e.target.value})}
        >
          <option value="Sales">Sales</option>
          <option value="Operations">Operations</option>
          <option value="Admin">Admin</option>
          <option value="Ejecutivo">Ejecutivo</option>
          <option value="Operator">Operator</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Street</Label>
        <Input value={newUserData.street} onChange={e => setNewUserData({...newUserData, street: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={newUserData.city} onChange={e => setNewUserData({...newUserData, city: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Postal Code</Label>
          <Input value={newUserData.postalCode} onChange={e => setNewUserData({...newUserData, postalCode: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Province / State</Label>
          <Input value={newUserData.province} onChange={e => setNewUserData({...newUserData, province: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Country / Region</Label>
          <Input value={newUserData.country} onChange={e => setNewUserData({...newUserData, country: e.target.value})} />
        </div>
      </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">Create User</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input required value={newUserData.firstName} onChange={e => setNewUserData({...newUserData, firstName: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input required value={newUserData.lastName} onChange={e => setNewUserData({...newUserData, lastName: e.target.value})} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Password (leave blank to keep current)</Label>
        <Input type="password" required={false} value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <select 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={newUserData.role}
          onChange={e => setNewUserData({...newUserData, role: e.target.value})}
        >
          <option value="Sales">Sales</option>
          <option value="Operations">Operations</option>
          <option value="Admin">Admin</option>
          <option value="Ejecutivo">Ejecutivo</option>
          <option value="Operator">Operator</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Street</Label>
        <Input value={newUserData.street} onChange={e => setNewUserData({...newUserData, street: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input value={newUserData.city} onChange={e => setNewUserData({...newUserData, city: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Postal Code</Label>
          <Input value={newUserData.postalCode} onChange={e => setNewUserData({...newUserData, postalCode: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Province / State</Label>
          <Input value={newUserData.province} onChange={e => setNewUserData({...newUserData, province: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Country / Region</Label>
          <Input value={newUserData.country} onChange={e => setNewUserData({...newUserData, country: e.target.value})} />
        </div>
      </div>
              <div className="flex justify-end pt-4">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-4">Loading users...</TableCell></TableRow>
              ) : users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div>{u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Unknown User'}</div>
                    <div className="text-xs text-muted-foreground font-normal">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'Admin' ? 'default' : u.role === 'Operador' ? 'secondary' : 'outline'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select 
                        className="inline-flex h-8 items-center justify-between whitespace-nowrap rounded-md border border-input bg-card px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === profile?.uid}
                      >
                        <option value="Ejecutivo">Ejecutivo</option>
                        <option value="Operador">Operador</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(u)} className="h-8 w-8 p-0">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    
        </TabsContent>

        <TabsContent value="permissions" className="m-0">
          <RolePermissionsTab />
        </TabsContent>

        <TabsContent value="seed-database" className="m-0">
          <DatabaseSeederTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}