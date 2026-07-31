import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/data-display/card";
import {
  Send,
  CheckCircle2,
  Eye,
  MessageSquare,
  Clock,
  Filter,
  Search,
  BellRing,
  Smartphone,
  Mail,
  RefreshCw,
  Download,
  AlertCircle
} from "lucide-react";
import { fetchApi } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/forms/button";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

interface NotificationLog {
  id: string;
  timestamp: string;
  stakeholder: string;
  email: string;
  role: string;
  alertType: string;
  reference: string;
  channels: string[];
  deliveryStatus: "Entregado" | "Fallido" | "Pendiente";
  readStatus: "Leído" | "No Leído";
  responseStatus: "Confirmado" | "Acción Tomada" | "En Espera" | "Sin Respuesta" | "Pendiente";
  responseTime: string;
}

interface AnalyticsData {
  summary: {
    totalSent: number;
    deliveredRate: string;
    openRate: string;
    responseRate: string;
    avgResponseTime: string;
  };
  logs: NotificationLog[];
  channelBreakdown: Array<{
    channel: string;
    sent: number;
    delivered: number;
    read: number;
    responded: number;
  }>;
}

export function AlertDeliveryAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchApi("/api/notifications/delivery-analytics", token);
      setData(res);
    } catch (err) {
      console.error("Error loading notification delivery analytics:", err);
      setError("No se pudieron cargar los datos de trazabilidad de alertas.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const filteredLogs = data?.logs.filter((log) => {
    const matchesSearch =
      log.stakeholder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "read" && log.readStatus === "Leído") ||
      (statusFilter === "unread" && log.readStatus === "No Leído") ||
      (statusFilter === "responded" && (log.responseStatus === "Acción Tomada" || log.responseStatus === "Confirmado"));

    const matchesRole =
      roleFilter === "all" || log.role.toLowerCase().includes(roleFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesRole;
  }) || [];

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ["ID", "Fecha/Hora", "Interesado", "Email", "Rol", "Tipo Alerta", "Referencia", "Canales", "Entrega", "Lectura", "Respuesta", "Tiempo Respuesta"];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      `"${l.stakeholder}"`,
      l.email,
      `"${l.role}"`,
      `"${l.alertType}"`,
      l.reference,
      `"${l.channels.join(', ')}"`,
      l.deliveryStatus,
      l.readStatus,
      l.responseStatus,
      l.responseTime
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `alert_delivery_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-red-200 bg-red-50/50">
        <CardContent className="p-6 text-center text-red-600 space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
          <p className="font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={loadAnalytics} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary || {
    totalSent: 0,
    deliveredRate: "0",
    openRate: "0",
    responseRate: "0",
    avgResponseTime: "0 min"
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-slate-200 bg-white">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-xl font-bold text-slate-900">
                Trazabilidad de Entrega & Respuesta de Alertas
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500 mt-1">
              Monitoreo en tiempo real de recepciones, lecturas y tasas de respuesta de los interesados
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
            <Button variant="default" size="sm" onClick={handleExportCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Notificaciones Enviadas</span>
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{summary.totalSent}</span>
                <span className="text-xs text-slate-500">alertas</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tasa de Entrega</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">{summary.deliveredRate}%</span>
                <span className="text-xs text-emerald-600 font-medium">exitosa</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tasa de Apertura / Lectura</span>
                <Eye className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-indigo-600">{summary.openRate}%</span>
                <span className="text-xs text-indigo-600 font-medium">leído</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tasa de Respuesta</span>
                <MessageSquare className="h-4 w-4 text-violet-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-violet-600">{summary.responseRate}%</span>
                <span className="text-xs text-violet-600 font-medium">confirmado</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <span>Tiempo Prom. Respuesta</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600">{summary.avgResponseTime}</span>
                <span className="text-xs text-slate-500">promedio</span>
              </div>
            </div>
          </div>

          {/* Delivery Performance by Channel Chart */}
          {data?.channelBreakdown && data.channelBreakdown.length > 0 && (
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <span>Rendimiento de Notificación por Canal de Comunicación</span>
              </h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.channelBreakdown} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="channel" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="sent" name="Enviados" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delivered" name="Entregados" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="read" name="Leídos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="responded" name="Responded/Confirmados" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-100/80 p-3 rounded-lg">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar interesado, email, alerta o ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mr-1">
                <Filter className="h-3.5 w-3.5" />
                <span>Filtros:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="read">Leídos</option>
                <option value="unread">No Leídos</option>
                <option value="responded">Con Respuesta / Acción</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs rounded-md px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los Roles</option>
                <option value="operador">Operador de Almacén</option>
                <option value="aduanero">Agente Aduanero</option>
                <option value="transportista">Transportista</option>
                <option value="supervisora">Supervisora</option>
              </select>
            </div>
          </div>

          {/* Delivery Logs Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Interesado / Rol</th>
                  <th className="p-3">Alerta & Ref</th>
                  <th className="p-3">Canales</th>
                  <th className="p-3">Entrega</th>
                  <th className="p-3">Lectura</th>
                  <th className="p-3">Estado Respuesta</th>
                  <th className="p-3 text-right">Tiempo Resp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se encontraron registros de entrega con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 text-sm">{log.stakeholder}</div>
                        <div className="text-slate-500 text-[11px]">{log.email} • <span className="font-medium text-slate-600">{log.role}</span></div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-indigo-700">{log.alertType}</div>
                        <div className="text-slate-500 text-[11px] font-mono">{log.reference}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.channels.map((ch, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {ch === "Web Push" ? <Smartphone className="h-3 w-3 text-indigo-500" /> : <Mail className="h-3 w-3 text-blue-500" />}
                              {ch}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          log.deliveryStatus === 'Entregado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <CheckCircle2 className="h-3 w-3" />
                          {log.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          log.readStatus === 'Leído' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <Eye className="h-3 w-3" />
                          {log.readStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          log.responseStatus === 'Acción Tomada' || log.responseStatus === 'Confirmado'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.responseStatus === 'En Espera'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {log.responseStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 font-medium">
                        {log.responseTime}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
