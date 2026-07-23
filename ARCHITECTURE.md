# 🏗️ Freight Forwarding Control Tower - Architecture Design Document

This document outlines the software design, directory structures, modular file boundaries, and implementation patterns of the **Freight Forwarding SCM Control Tower**.

---

## 📂 Logical Folder & Directory Structure

To ensure a highly maintainable, modular, and human-readable codebase, the system is organized under dedicated directories separating UI views, core utilities, contexts, and domain widgets.

```
/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin controls and permissions
│   │   ├── carriers/       # Carrier schedule matrices and vessel parameters
│   │   ├── compliance/     # Regulatory and carbon-offset ledger checks
│   │   ├── crm/            # Customer profile, supplier, and broker directories
│   │   ├── customs/        # Customs filing forms, phytosanitary records, and tariff engines
│   │   ├── dashboard/      # Control Tower main screen and key analytical widgets
│   │   │   ├── ActiveShipmentsTableWidget.tsx  # Interactive shipment table with inline Risk Scores
│   │   │   ├── CongestionAlertsWidget.tsx      # Port backlog warnings and diversion suggestions
│   │   │   └── ... (Other specific widgets)
│   │   ├── documents/      # Bill of Lading, Commercial Invoice, and filing registries
│   │   ├── layout/         # Persistent sidebars, theme layouts, and page containers
│   │   ├── optimization/   # Fuel efficiency and dynamic carbon trackers
│   │   ├── shared/         # Reusable UI controls (dialogs, cards, input tables)
│   │   ├── shipments/      # Shipment tracking, timeline, and mapping panels
│   │   │   └── ShipmentTrackingMap.tsx         # SVG World Map with live vessel bypass routes
│   │   └── warehouse/      # Local distribution center inventory and throughput logs
│   ├── contexts/           # Authentication state providers
│   ├── lib/
│   │   ├── api.ts          # Unified backend fetch wrappers and route handlers
│   │   └── riskScorer.ts   # Core math module for automated 1-100 hazard calculations
│   └── App.tsx             # Application entry point with dynamic routing and layout injection
```

---

## ⚡ The Risk-Scoring Engine (`src/lib/riskScorer.ts`)

The risk-scoring module is written in 100% type-safe TypeScript to evaluate active marine transits on a unified `1 to 100` scale. It calculates risk dynamically rather than storing static mocks.

### Score Attribution Algorithm
The score is composed of four distinct threat vectors:
1. **Weather Proximity (Max 30 Points)**: Monitors low-pressure typhoon paths, wave swell heights, and wind shear.
2. **Geopolitical Exposure (Max 30 Points)**: Appends military corridor threat guidelines, particularly around Suez or regional border trade tariffs.
3. **Port Terminal Congestion (Max 30 Points)**: Injects crane operator disputes, dock yard capacity, and custom phytosanitary filing delays.
4. **Vessel Delay Status (Max 15 Points)**: Evaluates schedule variance against planned Departure/Arrival deadlines.

```typescript
// Core output interface
export interface RiskBreakdown {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  weatherRisk: number;
  politicalRisk: number;
  portDelayRisk: number;
  statusRisk: number;
  reasons: string[];
  mitigations: string[];
}
```

---

## 🗺️ Visual Intermodal Bypass Architecture

When a consignment is exposed to elevated hazards (e.g. `Score >= 45`), the bypass router suggests an alternative gateway:

```
[East Asian Port] ──(Standard Ocean)──> [USLAX / NLRTM Port] (Bottlenecks / Backlog)
       │
       └──(Ocean Leg Diverted)──> [Seattle (USSEA) / Barcelona (ESBCN)] (Clear Yard)
                                                 │
                                                 └──(Class-I Standard Rail)──> [Target Warehouse]
```

### Landbridge Alternatives Model
- **Divert to USSEA (Seattle)**: Bypasses Los Angeles operator slowdowns. BNSF Rail double-stack dispatch shaves 7 days off cargo delivery with a minor flat cost delta.
- **Divert to ESBCN (Barcelona)**: Avoids northern European phytosanitary queues. Utilizes European high-capacity cargo rail corridors linking directly to Central European hubs.

---

## 💅 Visual Design & Styling Decisions

- **Tailwind Tokens**: Built with high-contrast neutral backgrounds (`bg-background` / `text-foreground`) to emphasize colorful data states.
- **Micro-Animations**: Uses pure CSS transitions and pulsing ambient halos to denote active geographical threat vectors.
- **Dynamic Tooltips**: Built-in SVG title indicators and interactive dialog popovers to ensure complete and readable hazard transparency for the operational operator.
