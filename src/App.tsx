import PublicDocumentViewer from './components/documents/PublicDocumentViewer';
import { NotificationProvider } from './contexts/NotificationContext';
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/feedback/sonner';
import { useTranslation } from 'react-i18next';
import { Layout } from './components/layout/MainLayout';
import Login from './pages/auth/Login';

// Lazy load major dashboard and view components to optimize initial bundle size
const WarehouseDashboard = lazy(() => import('./components/warehouse/WarehouseDashboard').then(m => ({ default: m.WarehouseDashboard })));
const InventoryDashboard = lazy(() => import('./components/warehouse/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const ControlTower = lazy(() => import('./components/dashboard/ControlTower').then(m => ({ default: m.ControlTower })));
const CostAnalysisDashboard = lazy(() => import('./components/dashboard/CostAnalysisDashboard').then(m => ({ default: m.CostAnalysisDashboard })));
const ShipmentManagement = lazy(() => import('./components/shipments/ShipmentManagement').then(m => ({ default: m.ShipmentManagement })));
const ShipmentReports = lazy(() => import('./components/shipments/ShipmentReports').then(m => ({ default: m.ShipmentReports })));
const PartiesEntities = lazy(() => import('./components/crm/PartiesEntities').then(m => ({ default: m.PartiesEntities })));
const RoutingRates = lazy(() => import('./components/crm/RoutingRates').then(m => ({ default: m.RoutingRates })));
const UserManagement = lazy(() => import('./components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const BillingInvoicing = lazy(() => import('./components/documents/BillingInvoicing').then(m => ({ default: m.BillingInvoicing })));
const DocumentHub = lazy(() => import('./components/documents/DocumentHub').then(m => ({ default: m.DocumentHub })));
const BookingManagement = lazy(() => import('./components/shipments/BookingManagement').then(m => ({ default: m.BookingManagement })));
const WarehouseNotifications = lazy(() => import('./components/warehouse/WarehouseNotifications').then(m => ({ default: m.WarehouseNotifications })));
const WarehouseInbound = lazy(() => import('./components/warehouse/WarehouseInbound').then(m => ({ default: m.WarehouseInbound })));
const WarehouseOutbound = lazy(() => import('./components/warehouse/WarehouseOutbound').then(m => ({ default: m.WarehouseOutbound })));
const CustomsClearance = lazy(() => import('./components/customs/CustomsClearance').then(m => ({ default: m.CustomsClearance })));
const CarrierManagement = lazy(() => import('./components/carriers/CarrierManagement').then(m => ({ default: m.CarrierManagement })));
const ComplianceModule = lazy(() => import('./components/compliance/ComplianceModule').then(m => ({ default: m.ComplianceModule })));
const UserProfileSettings = lazy(() => import('./components/admin/UserProfileSettings').then(m => ({ default: m.UserProfileSettings })));
const FreightOptimizationSuite = lazy(() => import('./components/optimization/FreightOptimizationSuite').then(m => ({ default: m.FreightOptimizationSuite })));
const AdvancedSearch = lazy(() => import('./components/search/AdvancedSearch').then(m => ({ default: m.AdvancedSearch })));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return <div className="flex h-screen items-center justify-center">{t('loading')}</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
          <Routes>
            <Route path="/public/documents/:token" element={<PublicDocumentViewer />} />
            <Route path="/login" element={<Login />} />
            <Route path="/costs" element={<PrivateRoute><Layout><CostAnalysisDashboard /></Layout></PrivateRoute>} />
            <Route path="/dashboard" element={<PrivateRoute><Layout><ControlTower /></Layout></PrivateRoute>} />
            <Route path="/optimization" element={<PrivateRoute><Layout><FreightOptimizationSuite /></Layout></PrivateRoute>} />
            <Route path="/search" element={<PrivateRoute><Layout><AdvancedSearch /></Layout></PrivateRoute>} />
            <Route path="/shipments" element={<PrivateRoute><Layout><ShipmentManagement /></Layout></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Layout><ShipmentReports /></Layout></PrivateRoute>} />
            <Route path="/directory" element={<PrivateRoute><Layout><PartiesEntities /></Layout></PrivateRoute>} />
            <Route path="/rates" element={<PrivateRoute><Layout><RoutingRates /></Layout></PrivateRoute>} />
            <Route path="/warehouses" element={<PrivateRoute><Layout><WarehouseDashboard /></Layout></PrivateRoute>} />
            <Route path="/inventory" element={<PrivateRoute><Layout><InventoryDashboard /></Layout></PrivateRoute>} />
            <Route path="/billing" element={<PrivateRoute><Layout><BillingInvoicing /></Layout></PrivateRoute>} />
            <Route path="/documents" element={<PrivateRoute><Layout><DocumentHub /></Layout></PrivateRoute>} />
            <Route path="/booking" element={<PrivateRoute><Layout><BookingManagement /></Layout></PrivateRoute>} />
            <Route path="/customs" element={<PrivateRoute><Layout><CustomsClearance /></Layout></PrivateRoute>} />
            <Route path="/compliance" element={<PrivateRoute><Layout><ComplianceModule /></Layout></PrivateRoute>} />
            <Route path="/carriers" element={<PrivateRoute><Layout><CarrierManagement /></Layout></PrivateRoute>} />
            <Route path="/warehouse/notifications" element={<PrivateRoute><Layout><WarehouseNotifications /></Layout></PrivateRoute>} />
            <Route path="/warehouse/inbound" element={<PrivateRoute><Layout><WarehouseInbound /></Layout></PrivateRoute>} />
            <Route path="/warehouse/outbound" element={<PrivateRoute><Layout><WarehouseOutbound /></Layout></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Layout><UserProfileSettings /></Layout></PrivateRoute>} />
            <Route path="/users" element={<PrivateRoute><Layout><UserManagement /></Layout></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster />
      </NotificationProvider>
    </AuthProvider>
  );
}
