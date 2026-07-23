import React from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { 
  ChevronRight, 
  LayoutDashboard, 
  Ship, 
  Package, 
  FileBox, 
  Users, 
  Map, 
  Building2, 
  FileText, 
  Folder, 
  Calendar, 
  Anchor, 
  ShieldCheck, 
  Bell, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  UserCircle, 
  DollarSign,
  TruckIcon
} from 'lucide-react';

interface RouteSegment {
  name: string;
  icon?: React.ElementType;
  path: string;
}

export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Define lookup mapping for segments
  const getSegmentDetails = (segment: string, fullPath: string): { label: string; icon?: React.ElementType } => {
    switch (segment.toLowerCase()) {
      case 'dashboard':
        return { label: t('dashboard_analytics', 'Control Tower'), icon: LayoutDashboard };
      case 'costs':
        return { label: t('cost_analysis', 'Cost Analysis'), icon: DollarSign };
      case 'shipments':
        return { label: t('shipments', 'Shipment Management'), icon: Ship };
      case 'reports':
        return { label: t('shipment_reports', 'Shipment Reports'), icon: FileBox };
      case 'directory':
        return { label: t('address_registry', 'Address Registry'), icon: Users };
      case 'rates':
        return { label: t('quotations', 'Quotations'), icon: Map };
      case 'warehouses':
        return { label: t('warehouses_analytics', 'Warehouses Analytics'), icon: Building2 };
      case 'inventory':
        return { label: t('inventory', 'Inventory'), icon: Package };
      case 'billing':
        return { label: t('billing_invoicing', 'Documentation'), icon: FileText };
      case 'documents':
        return { label: t('document_hub', 'Document Hub'), icon: Folder };
      case 'booking':
        return { label: t('booking_management', 'Booking Management'), icon: Calendar };
      case 'customs':
        return { label: t('customs_clearance', 'Customs Clearance'), icon: Anchor };
      case 'compliance':
        return { label: t('trade_compliance', 'Trade Compliance'), icon: ShieldCheck };
      case 'carriers':
        return { label: t('carrier_management', 'Carrier Management'), icon: TruckIcon };
      case 'warehouse':
        return { label: t('warehouse', 'Warehouse'), icon: Building2 };
      case 'notifications':
        return { label: t('notifications', 'Notifications'), icon: Bell };
      case 'inbound':
        return { label: t('inbound', 'Inbound'), icon: ArrowDownToLine };
      case 'outbound':
        return { label: t('outbound', 'Outbound'), icon: ArrowUpFromLine };
      case 'profile':
        return { label: t('profile_settings', 'Profile Settings'), icon: UserCircle };
      case 'users':
        return { label: t('user_management', 'User Management'), icon: ShieldCheck };
      default:
        // Try to format nicely (e.g. replacing hyphens/underscores with spaces and capitalizing)
        const cleanName = segment
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
        return { label: cleanName };
    }
  };

  // If we are at the root or just login page or a public page, do not render
  if (location.pathname === '/login' || location.pathname.startsWith('/public')) {
    return null;
  }

  // Construct breadcrumbs hierarchy array starting with SCM Home / Control Tower
  const breadcrumbs: RouteSegment[] = [
    {
      name: t('home', 'Home'),
      icon: LayoutDashboard,
      path: '/dashboard',
    },
  ];

  let currentPath = '';
  pathnames.forEach((segment) => {
    currentPath += `/${segment}`;
    const { label, icon } = getSegmentDetails(segment, currentPath);
    breadcrumbs.push({
      name: label,
      icon,
      path: currentPath,
    });
  });

  // If we only have "Home" and we are on dashboard, no need for redundant navigation list
  if (breadcrumbs.length <= 1 || (breadcrumbs.length === 2 && location.pathname === '/dashboard')) {
    return null;
  }

  return (
    <nav 
      id="breadcrumb-navigation" 
      aria-label="Breadcrumb" 
      className="flex items-center gap-2 px-4 py-1.5 bg-card/60 border border-border/85 rounded-xl shadow-sm mb-6 max-w-fit backdrop-blur-sm select-none animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <ol className="flex items-center flex-wrap gap-1 text-sm font-medium text-muted-foreground">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const IconComponent = crumb.icon;

          return (
            <React.Fragment key={crumb.path}>
              {idx > 0 && (
                <li className="flex items-center justify-center text-muted-foreground/40 mx-0.5">
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
              )}
              <li className="flex items-center">
                {isLast ? (
                  <span 
                    id={`breadcrumb-item-last`}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-foreground font-semibold"
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />}
                    <span>{crumb.name}</span>
                  </span>
                ) : (
                  <Link
                    id={`breadcrumb-item-link-${idx}`}
                    to={crumb.path}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-foreground hover:bg-muted/50 transition-all duration-150 active:scale-95"
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5 opacity-70" />}
                    <span>{crumb.name}</span>
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
