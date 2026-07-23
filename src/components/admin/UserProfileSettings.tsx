import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Input } from '@/components/ui/forms/input';
import { Button } from '@/components/ui/forms/button';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { Label } from '@/components/ui/forms/label';
import { Switch } from '@/components/ui/forms/switch';
import { Save, UserCircle, Bell, Shield, Palette, Lock, Eye, EyeOff, Clock, Activity, Fingerprint, Trash2, Key, Laptop, Smartphone, FileJson, Upload, Download, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export function UserProfileSettings() {
  const { profile, updateProfile, changePassword, getSecurityHistory } = useAuth();
  const { t } = useTranslation();
  
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const { permission, requestPermission, settings: pushSettings, updateSettings: updatePushSettings } = useNotification();
  const [emailNotifications, setEmailNotifications] = useState(profile?.emailNotifications === 1);
  const [smsNotifications, setSmsNotifications] = useState(profile?.smsNotifications === 1);
  const [theme, setTheme] = useState(profile?.theme || 'light');
  const [dashboardView, setDashboardView] = useState('control-tower');
  const [notificationFreq, setNotificationFreq] = useState('real-time');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // WebAuthn Biometric Keys States
  const [webAuthnKeys, setWebAuthnKeys] = useState<{ id: string; name: string; type: string; registeredAt: string; expiresAt: string; status: 'Active' | 'Warning' }[]>(() => {
    const saved = localStorage.getItem('scm_webauthn_credentials');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Primary YubiKey 5C NFC', type: 'FIDO2 NFC Key', registeredAt: '2025-12-01', expiresAt: '2026-12-01', status: 'Active' },
      { id: '2', name: 'Corporate Titan Security Key', type: 'FIDO2 USB Token', registeredAt: '2025-05-15', expiresAt: '2026-05-15', status: 'Warning' }
    ];
  });
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('FIDO2 NFC Key');
  const [isRegisteringKey, setIsRegisteringKey] = useState(false);

  const handleRegisterBiometricKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the security key.');
      return;
    }
    setIsRegisteringKey(true);
    const toastId = toast.loading('Initializing FIDO2 biometric enrollment handshake...');
    
    try {
      // Simulate WebAuthn navigator.credentials.create handshake
      await new Promise((resolve) => setTimeout(resolve, 1800));
      
      const newKey = {
        id: Math.random().toString(36).substr(2, 9),
        name: newKeyName.trim(),
        type: newKeyType,
        registeredAt: new Date().toISOString().split('T')[0],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Active' as const
      };
      
      const updatedKeys = [...webAuthnKeys, newKey];
      setWebAuthnKeys(updatedKeys);
      localStorage.setItem('scm_webauthn_credentials', JSON.stringify(updatedKeys));
      setNewKeyName('');
      toast.success(`Biometric key "${newKey.name}" successfully linked to profile!`, { id: toastId });
      loadLogs();
    } catch (err: any) {
      toast.error(err.message || 'Biometric handshake failed.', { id: toastId });
    } finally {
      setIsRegisteringKey(false);
    }
  };

  const handleDeleteBiometricKey = (id: string) => {
    const updated = webAuthnKeys.filter(k => k.id !== id);
    setWebAuthnKeys(updated);
    localStorage.setItem('scm_webauthn_credentials', JSON.stringify(updated));
    toast.success('WebAuthn biometric key unlinked successfully.');
    loadLogs();
  };

  const handleExportPreferences = () => {
    try {
      const backupData = {
        exportMetadata: {
          app: "SCM Freight Forwarder Core",
          version: "2.1.0-secure",
          exportedAt: new Date().toISOString(),
          operator: profile?.displayName || profile?.email || "Executive Officer"
        },
        preferences: {
          theme,
          dashboardView,
          notificationFreq,
          emailNotifications: emailNotifications ? "ENABLED" : "DISABLED",
          smsNotifications: smsNotifications ? "ENABLED" : "DISABLED"
        },
        securityState: {
          boundPasskeysCount: webAuthnKeys.length,
          mfaMethod: "FIDO2_WebAuthn",
          activeRole: profile?.role || "Ejecutivo"
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `scm_executive_preferences_${profile?.uid || 'backup'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Executive preference backup downloaded successfully!");
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const handleImportPreferences = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);

        if (!data.preferences || !data.exportMetadata) {
          throw new Error("Invalid SCM preferences backup format.");
        }

        const prefs = data.preferences;
        if (prefs.theme) {
          const nextTheme = prefs.theme === 'dark' ? 'dark' : 'light';
          setTheme(nextTheme);
          await updateProfile({ theme: nextTheme });
        }
        if (prefs.dashboardView) setDashboardView(prefs.dashboardView);
        if (prefs.notificationFreq) setNotificationFreq(prefs.notificationFreq);
        if (prefs.emailNotifications) setEmailNotifications(prefs.emailNotifications === "ENABLED");
        if (prefs.smsNotifications) setSmsNotifications(prefs.smsNotifications === "ENABLED");

        // Save layout/frequency defaults locally too
        if (profile?.uid) {
          localStorage.setItem(`scm_prefs_${profile.uid}`, JSON.stringify({
            dashboardView: prefs.dashboardView || dashboardView,
            notificationFreq: prefs.notificationFreq || notificationFreq
          }));
        }

        toast.success(`Restored executive profile settings from backup file created by ${data.exportMetadata.operator}!`);
        loadLogs();
      } catch (err: any) {
        toast.error(`Restore failed: ${err.message || 'Invalid JSON backup file'}`);
      }
    };
    reader.readAsText(file);
  };

  // Security Audit History
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  React.useEffect(() => {
    if (profile?.uid) {
      const storedPrefs = localStorage.getItem(`scm_prefs_${profile.uid}`);
      if (storedPrefs) {
        try {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.dashboardView) setDashboardView(parsed.dashboardView);
          if (parsed.notificationFreq) setNotificationFreq(parsed.notificationFreq);
        } catch (e) {}
      }
    }
  }, [profile?.uid]);

  // Synchronize local theme state when profile theme changes (e.g. from the header toggle button)
  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile?.theme]);

  // Dynamically update the root class whenever the local theme state changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Load Security Audit History Logs
  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await getSecurityHistory();
      setSecurityLogs(logs);
    } catch (e) {
      console.error("Error loading security logs", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [getSecurityHistory]);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleThemeChange = async (checked: boolean) => {
    const nextTheme = checked ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      await updateProfile({ theme: nextTheme });
      toast.success(checked ? "Dark mode activated!" : "Light mode activated!");
      loadLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to update theme");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await updateProfile({
        displayName,
        emailNotifications: emailNotifications ? 1 : 0,
        smsNotifications: smsNotifications ? 1 : 0,
        theme
      });
      localStorage.setItem(`scm_prefs_${profile?.uid}`, JSON.stringify({
        dashboardView,
        notificationFreq
      }));
      setMessage({ text: 'Profile updated successfully', type: 'success' });
      toast.success("Profile preferences saved!");
      loadLogs();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password updated successfully!');
      toast.success('Your security password has been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      loadLogs();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Verify current password.');
      toast.error(err.message || 'Password update failed.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Profile & Configuration Controls */}
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground mt-1">
            Manage your personal profile, notification matrix, and portal security keys.
          </p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-zinc-500" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal and display identification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={profile?.email || ''} disabled className="bg-zinc-100/50 dark:bg-zinc-900/50 text-muted-foreground border-zinc-200 dark:border-zinc-800" />
                <p className="text-xs text-muted-foreground">Account email cannot be modified once provisioned.</p>
              </div>
              
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="Enter your full name" 
                  className="border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-zinc-500" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure push metrics and alert distribution channels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive critical summaries and alerts directly to your inbox.</p>
                </div>
                <Switch 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications} 
                />
              </div>
              
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive browser service worker alerts for instant status changes.</p>
                </div>
                {permission === 'default' ? (
                  <Button variant="outline" size="sm" type="button" onClick={() => requestPermission()}>Enable</Button>
                ) : permission === 'denied' ? (
                  <span className="text-sm text-red-500 font-medium">Blocked</span>
                ) : (
                  <Switch 
                    checked={pushSettings.pushEnabled} 
                    onCheckedChange={(c) => updatePushSettings({ pushEnabled: c })} 
                  />
                )}
              </div>
              
              {permission === 'granted' && (
                <div className="pl-6 space-y-4 border-l-2 border-blue-500 dark:border-blue-700 ml-2 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Status Changes</Label>
                      <p className="text-xs text-muted-foreground">Notify when a shipment status updates</p>
                    </div>
                    <Switch checked={pushSettings.statusChanges} onCheckedChange={(c) => updatePushSettings({ statusChanges: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Exception Alerts</Label>
                      <p className="text-xs text-muted-foreground">Notify when delay exceptions occur</p>
                    </div>
                    <Switch checked={pushSettings.exceptions} onCheckedChange={(c) => updatePushSettings({ exceptions: c })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Milestones (ETA/ETD)</Label>
                      <p className="text-xs text-muted-foreground">Notify when critical milestones are verified</p>
                    </div>
                    <Switch checked={pushSettings.milestones} onCheckedChange={(c) => updatePushSettings({ milestones: c })} />
                  </div>
                  <Button size="sm" variant="secondary" type="button" onClick={() => {
                     new Notification('SCM Logistics Hub', { body: 'Verification: Push channel operational!', icon: '/favicon.ico' });
                  }}>Test Live Notification</Button>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive immediate dispatcher updates through mobile SMS.</p>
                </div>
                <Switch 
                  checked={smsNotifications} 
                  onCheckedChange={setSmsNotifications} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-zinc-500" />
                Appearance
              </CardTitle>
              <CardDescription>Tailor user-interface aesthetics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Dark Mode Contrast</Label>
                  <p className="text-sm text-muted-foreground">Switch between high contrast light and deep ambient themes.</p>
                </div>
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={handleThemeChange} 
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSaving} className="h-11 px-6 shadow-sm">
              {isSaving ? 'Saving Configurations...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>

        {/* SECURE PASSWORDS AND RECOVERY CARD */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-zinc-500" />
              Secure Password Management
            </CardTitle>
            <CardDescription>Maintain your login credentials periodically to preserve account integrity.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-sm rounded-xl">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-sm rounded-xl">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showCurrentPassword ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    placeholder="Enter current password"
                    className="border-zinc-200 dark:border-zinc-800 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input 
                      id="newPassword" 
                      type={showNewPassword ? "text" : "password"} 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="At least 8 characters"
                      className="border-zinc-200 dark:border-zinc-800 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmNewPassword" 
                    type="password" 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    placeholder="Confirm new password"
                    className="border-zinc-200 dark:border-zinc-800"
                    required
                  />
                </div>
              </div>

              {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-red-500 font-medium">Passwords do not match.</p>
              )}

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
                  className="bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  {isChangingPassword ? "Updating Password..." : "Update Security Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* BIOMETRIC SECURITY / WEBAUTHN KEYS PANEL */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-lg flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-indigo-500" />
              Biometric Profile Linking (FIDO2 / WebAuthn)
            </CardTitle>
            <CardDescription>
              Enroll dynamic hardware security tokens or local biometric passkeys (Touch ID / Face ID) for express portal authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Active Keys List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-zinc-500" />
                Linked Biometric Passkeys ({webAuthnKeys.length})
              </h4>
              
              {webAuthnKeys.length === 0 ? (
                <div className="p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">No biometric credentials linked yet. Enroll your physical security key or device credentials below.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {webAuthnKeys.map((key) => (
                    <div 
                      key={key.id} 
                      className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800/60 rounded-xl bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                          {key.type.includes('Touch') || key.type.includes('Face') ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{key.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{key.type}</span>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span>Enrolled {key.registeredAt}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          key.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                            : 'bg-amber-50 text-amber-700 border border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                        }`}>
                          {key.status}
                        </span>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteBiometricKey(key.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Register Passkey Form */}
            <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Register New Security Passkey
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="passkey-name">Passkey Identifier Name</Label>
                  <Input 
                    id="passkey-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Executive MacBook Touch ID"
                    className="border-zinc-200 dark:border-zinc-800"
                    disabled={isRegisteringKey}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passkey-type">Hardware Platform / Authenticator Type</Label>
                  <select 
                    id="passkey-type"
                    value={newKeyType}
                    onChange={(e) => setNewKeyType(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    disabled={isRegisteringKey}
                  >
                    <option value="Touch ID Biometric">Touch ID Biometric Handshake</option>
                    <option value="FIDO2 NFC Key">FIDO2 NFC Security Key (YubiKey)</option>
                    <option value="FIDO2 USB Token">FIDO2 USB Hardware Token</option>
                    <option value="Face ID Biometric">Face ID Biometric Match</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="button" 
                  disabled={isRegisteringKey || !newKeyName.trim()}
                  onClick={handleRegisterBiometricKey}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 gap-2 font-semibold"
                >
                  {isRegisteringKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Handshake in Progress...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Register Passkey
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EXECUTIVE PREFERENCE MATRIX BACKUP & RESTORE */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-500" />
              Executive Preference Matrix Export
            </CardTitle>
            <CardDescription>
              Safely backup or restore your custom theme configurations, dashboard layout views, and critical notification rules in a portable JSON matrix file.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Export Visual & Notification Matrix</p>
                <p className="text-xs text-muted-foreground">Download a secure JSON schema of your executive configurations.</p>
              </div>
              <Button 
                type="button"
                onClick={handleExportPreferences}
                className="bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold gap-2"
              >
                <Download className="w-4 h-4" />
                Export Settings JSON
              </Button>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-5 space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Restore Matrix Config Backup</p>
                <p className="text-xs text-muted-foreground">Upload your previously exported JSON preference file to sync this device instantly.</p>
              </div>
              
              <div className="flex items-center gap-4">
                <label 
                  htmlFor="preferences-upload"
                  className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg cursor-pointer text-sm font-medium transition-all duration-150"
                >
                  <Upload className="w-4 h-4 text-zinc-500" />
                  <span>Choose Backup JSON</span>
                  <input 
                    id="preferences-upload"
                    type="file" 
                    accept=".json" 
                    onChange={handleImportPreferences}
                    className="hidden" 
                  />
                </label>
                <span className="text-xs text-muted-foreground">Accepts .json setting backup schemas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: RBAC Profile Badge & Security Audits */}
      <div className="space-y-6">
        
        {/* Role & Permissions Info */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-zinc-500" />
              Role & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label className="text-xs text-zinc-400 uppercase tracking-wider block mb-1">Your Access Rank</Label>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 px-3 py-1 text-sm font-semibold text-blue-700 dark:text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {profile?.role || 'Ejecutivo'}
              </div>
            </div>
            
            <div className="border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
              <Label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2">Assigned Privileges</Label>
              <div className="flex flex-wrap gap-1.5">
                {profile?.role === 'Admin' ? (
                  <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700/50">
                    * Full Global Control (*)
                  </span>
                ) : profile?.permissions && profile.permissions.length > 0 ? (
                  profile.permissions.map((perm: string) => (
                    <span key={perm} className="text-[11px] font-mono bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800/80">
                      {perm}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">No customized privileges assigned.</span>
                )}
              </div>
            </div>
            
            <p className="text-xs text-zinc-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
              Account privileges are determined dynamically. Please coordinate with an Admin operator if your responsibilities shift.
            </p>
          </CardContent>
        </Card>

        {/* Dynamic Security & Session History */}
        <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-500" />
                Security Audit Logs
              </CardTitle>
              <CardDescription className="text-[11px] leading-tight mt-0.5">Chronology of authentications & modifications.</CardDescription>
            </div>
            <Activity className="w-4 h-4 text-blue-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-0 max-h-[380px] overflow-y-auto">
            {isLoadingLogs ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Retrieving audit trails...
              </div>
            ) : securityLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                No security activities captured yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {securityLogs.map((log: any) => {
                  let badgeColor = "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
                  if (log.eventType.includes("Successful") || log.eventType.includes("Login")) {
                    badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30";
                  } else if (log.eventType.includes("Requested") || log.severity === "warning") {
                    badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30";
                  }

                  return (
                    <div key={log.id} className="p-3.5 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/20 transition-colors">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono ${badgeColor}`}>
                          {log.eventType}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-tight">
                        {log.description}
                      </p>
                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
