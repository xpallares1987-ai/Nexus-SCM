import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Settings, Bell, Smartphone, Mail, AlertTriangle, Info, CheckCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState({
    highSeverity: { push: true, email: true, sms: true },
    mediumSeverity: { push: true, email: true, sms: false },
    lowSeverity: { push: true, email: false, sms: false }
  });

  const [isLoading, setIsLoading] = useState(false);

  const togglePreference = (severity: 'highSeverity' | 'mediumSeverity' | 'lowSeverity', channel: 'push' | 'email' | 'sms') => {
    setPreferences(prev => ({
      ...prev,
      [severity]: {
        ...prev[severity],
        [channel]: !prev[severity][channel]
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call to save preferences
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsLoading(false);
    toast.success('Preferencias de notificación guardadas correctamente.');
  };

  return (
    <Card className="shadow-sm border-slate-200 bg-white mt-6">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-xl font-bold text-slate-900">
            Preferencias de Notificación (Rol)
          </CardTitle>
        </div>
        <CardDescription className="text-slate-500 mt-1">
          Configura tus canales de preferencia (Push, Email, SMS) según la severidad de la alerta
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-6">
          
          {/* High Severity */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-red-50/50 border border-red-100 rounded-lg">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                <AlertTriangle className="h-4 w-4" />
                Alta Severidad (Críticas)
              </div>
              <p className="text-xs text-slate-600">Retrasos mayores a 4h, quiebres de stock, excepciones aduaneras</p>
            </div>
            <div className="flex gap-2">
              <ToggleBtn active={preferences.highSeverity.push} onClick={() => togglePreference('highSeverity', 'push')} icon={<Bell className="h-4 w-4" />} label="Push" />
              <ToggleBtn active={preferences.highSeverity.email} onClick={() => togglePreference('highSeverity', 'email')} icon={<Mail className="h-4 w-4" />} label="Email" />
              <ToggleBtn active={preferences.highSeverity.sms} onClick={() => togglePreference('highSeverity', 'sms')} icon={<Smartphone className="h-4 w-4" />} label="SMS" />
            </div>
          </div>

          {/* Medium Severity */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
                <Info className="h-4 w-4" />
                Severidad Media (Advertencias)
              </div>
              <p className="text-xs text-slate-600">Retrasos menores, stock de seguridad, ETA actualizada</p>
            </div>
            <div className="flex gap-2">
              <ToggleBtn active={preferences.mediumSeverity.push} onClick={() => togglePreference('mediumSeverity', 'push')} icon={<Bell className="h-4 w-4" />} label="Push" />
              <ToggleBtn active={preferences.mediumSeverity.email} onClick={() => togglePreference('mediumSeverity', 'email')} icon={<Mail className="h-4 w-4" />} label="Email" />
              <ToggleBtn active={preferences.mediumSeverity.sms} onClick={() => togglePreference('mediumSeverity', 'sms')} icon={<Smartphone className="h-4 w-4" />} label="SMS" />
            </div>
          </div>

          {/* Low Severity */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
            <div className="mb-4 sm:mb-0">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-1">
                <CheckCircle className="h-4 w-4" />
                Baja Severidad (Informativas)
              </div>
              <p className="text-xs text-slate-600">Arribos confirmados, despachos completados, reportes diarios</p>
            </div>
            <div className="flex gap-2">
              <ToggleBtn active={preferences.lowSeverity.push} onClick={() => togglePreference('lowSeverity', 'push')} icon={<Bell className="h-4 w-4" />} label="Push" />
              <ToggleBtn active={preferences.lowSeverity.email} onClick={() => togglePreference('lowSeverity', 'email')} icon={<Mail className="h-4 w-4" />} label="Email" />
              <ToggleBtn active={preferences.lowSeverity.sms} onClick={() => togglePreference('lowSeverity', 'sms')} icon={<Smartphone className="h-4 w-4" />} label="SMS" />
            </div>
          </div>
          
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Preferencias'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active 
          ? 'bg-indigo-100 border-indigo-200 text-indigo-700' 
          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
