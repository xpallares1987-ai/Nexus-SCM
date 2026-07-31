import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/data-display/card";
import { Package, Truck, AlertTriangle, RefreshCw } from "lucide-react";
import { fetchApi } from "../../lib/api";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/forms/button";
import { ShipmentMap } from "./ShipmentMap";
import { AlertDeliveryAnalytics } from "./AlertDeliveryAnalytics";
import { NotificationPreferencesPanel } from "./NotificationPreferencesPanel";
import { KPITrendChart } from "./KPITrendChart";
import { motion, AnimatePresence } from "motion/react";

interface ControlTowerData {
  totalShipments: number;
  inTransit: number;
  exceptions: number;
}

// Generate 30 days of mock trend data
const generateTrendData = () => {
  const data = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const total = Math.floor(Math.random() * 50) + 100;
    const inTransit = Math.floor(total * 0.6);
    const delayed = Math.floor(total * 0.1);
    const delivered = total - inTransit - delayed;
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      All: total,
      "In Transit": inTransit,
      Delayed: delayed,
      Delivered: delivered,
    });
  }
  return data;
};

export function ControlTower() {
  const [data, setData] = useState<ControlTowerData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { token } = useAuth();

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        const response = await fetchApi("/api/dashboard/control-tower", token);
        setData(response);
        setTrendData(generateTrendData());
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("No se pudieron cargar los datos del dashboard.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
        <Button
          onClick={() => {
            setError(null);
            fetchDashboardData(true);
          }}
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Control Tower
          </h1>
          <p className="text-slate-500 mt-1">
            Resumen de operaciones y alertas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            {["All", "In Transit", "Delayed", "Delivered"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === status ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                {status === "All"
                  ? "Todos"
                  : status === "In Transit"
                    ? "En Tránsito"
                    : status === "Delayed"
                      ? "Retrasados"
                      : "Entregados"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => fetchDashboardData(true)}
            disabled={isLoading || isRefreshing}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Shipments */}
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Embarques
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">
                {data?.totalShipments || 0}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">En el sistema</p>
          </CardContent>
        </Card>

        {/* Shipments In Transit */}
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              En Tránsito
            </CardTitle>
            <Truck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">
                {data?.inTransit || 0}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">Operaciones activas</p>
          </CardContent>
        </Card>

        {/* Exception Alerts */}
        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Alertas de Excepción
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">
                {data?.exceptions || 0}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px]">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="skeleton-map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full w-full">
                <Skeleton className="h-full w-full rounded-xl" />
              </motion.div>
            ) : (
              <motion.div
                key={`map-${statusFilter}`}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full w-full"
              >
                <ShipmentMap statusFilter={statusFilter} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Card className="shadow-sm border-slate-200 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-slate-800">
              Tendencia de Volumen (30 Días)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="skeleton-chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-[300px] flex items-center justify-center w-full">
                  <Skeleton className="h-full w-full rounded-xl" />
                </motion.div>
              ) : (
                <motion.div
                  key={`chart-${statusFilter}`}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickMargin={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickMargin={10}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey={statusFilter}
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{
                        r: 6,
                        fill: "#3b82f6",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <div className="pt-4">
        <KPITrendChart />
      </div>

      {/* Stakeholder Alert Delivery Logs & Response Analytics */}
      <div className="pt-4">
        <AlertDeliveryAnalytics />
      </div>

      <div className="pt-4">
        <NotificationPreferencesPanel />
      </div>
    </div>
  );
}
