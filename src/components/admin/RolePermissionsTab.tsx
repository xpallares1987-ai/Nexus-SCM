import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { fetchApi } from '../../lib/api';

const AVAILABLE_ROLES = ['Sales', 'Operations', 'Admin', 'Ejecutivo', 'Operador'];

const PERMISSIONS = [
  { id: 'read:shipments', label: 'Read Shipments', desc: 'Can view shipment lists and details' },
  { id: 'write:shipments', label: 'Manage Shipments', desc: 'Can create, edit, and delete shipments' },
  { id: 'read:inventory', label: 'Read Inventory', desc: 'Can view warehouse inventory' },
  { id: 'write:inventory', label: 'Manage Inventory', desc: 'Can create and update inventory records' },
  { id: 'manage:users', label: 'Manage Users', desc: 'Can add, edit, and change roles of users' },
  { id: 'view:finance', label: 'View Financials', desc: 'Can view cost estimators and billing' },
];

export function RolePermissionsTab() {
  const { token } = useAuth();
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    if (!token) return;
    try {
      const data = await fetchApi('/roles/permissions', token);
      const permMap: Record<string, string[]> = {};
      data.forEach((p: any) => {
        try {
          permMap[p.role] = JSON.parse(p.permissions);
        } catch(e) {
          permMap[p.role] = [];
        }
      });
      setRolePerms(permMap);
    } catch (err: any) {
      toast.error('Failed to load permissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (role: string, permId: string) => {
    setRolePerms(prev => {
      const current = prev[role] || [];
      if (current.includes(permId)) {
        return { ...prev, [role]: current.filter(id => id !== permId) };
      } else {
        return { ...prev, [role]: [...current, permId] };
      }
    });
  };

  const handleSave = async (role: string) => {
    if (!token) return;
    setSaving(role);
    try {
      await fetchApi('/roles/permissions', token, {
        method: 'PUT',
        body: JSON.stringify({ role, permissions: rolePerms[role] || [] })
      });
      toast.success(`Permissions updated for ${role}`);
    } catch (err: any) {
      toast.error('Failed to update permissions: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>;

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Role Permissions Overview</h3>
        <p className="text-sm text-muted-foreground">Configure fine-grained access control across different platform modules.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AVAILABLE_ROLES.map(role => (
          <Card key={role} className="flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-md font-semibold">{role}</CardTitle>
                  <CardDescription className="text-xs">
                    {role === 'Admin' ? 'Has full unrestricted access' : 'Customizable access limits'}
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  disabled={saving === role || role === 'Admin'} 
                  onClick={() => handleSave(role)}
                >
                  {saving === role ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <div className="space-y-3">
                {PERMISSIONS.map(perm => {
                  const isChecked = role === 'Admin' || (rolePerms[role] || []).includes(perm.id);
                  return (
                    <div key={perm.id} className="flex items-start space-x-3">
                      <input 
                        type="checkbox" 
                        id={`${role}-${perm.id}`}
                        checked={isChecked}
                        disabled={role === 'Admin'}
                        onChange={() => togglePermission(role, perm.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <label htmlFor={`${role}-${perm.id}`} className="flex flex-col cursor-pointer">
                        <span className="text-sm font-medium leading-none mb-1 text-foreground">
                          {perm.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {perm.desc}
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
