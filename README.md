# 🌐 Freight Forwarding & Intermodal SCM Control Tower

A production-grade, highly-polished Supply Chain Management (SCM) and Logistics Orchestration Platform designed for modern Freight Forwarders. This Control Tower aggregates real-time marine vessel positions, automates risk-scoring across global ocean legs, provides intelligent intermodal bypass routes, and tracks dynamic KPIs with real-time alerting.

---

## 🌟 Key Capabilities

### 1. Intermodal Route Risk Layer & Bypass Planner
- **Live Interactive World Map**: Rendered using a specialized SVG-based projection system to display shipping lanes, port terminals, and in-transit container vessels.
- **Dynamic Threat Heatmaps**: Visualizes active weather storms, labor union lockouts, customs bottlenecks, and red-zone geopolitical corridors.
- **Intelligent Bypass Planner**: Instantly triggers rail landbridge alternatives with automatic pricing delta calculation and lead-time day savings.

### 2. Automated 1-100 Risk-Scoring Engine
- **Multi-Factor Risk Indices**: Real-time evaluation of Weather, Geopolitical, Port Congestion, and Status risks.
- **Color-Coded Dashboard Indicators**: Visible on all active consignment listings to spot critical cargo vulnerabilities instantly.
- **Full Analytical Tooltips**: Details the precise breakdown of the cargo's exposure directly on hover.

### 3. Comprehensive Logistics Suite & KPI Dashboard
- **Control Tower Dashboard**: Unified workspace featuring dynamic KPIs, fleet utilization rates, ML-based ETA predictions, and live port congestion metrics.
- **Interactive KPI Tracking**: Comparison mode overlaying different KPI trends (e.g., Target vs On-Time Delivery).
- **Automated Alerting**: On-screen toast notifications triggered when monitored KPIs cross critical safety thresholds.
- **Customs & Document Hub**: Manages phytosanitary filings, bills of lading, and compliance checkpoints.

---

## 🏗️ Technical Architecture & Stack
- **Full-Stack Core**: React 18 frontend with a Node.js backend (Fastify), Vite, and TypeScript.
- **Database**: Local Postgres persistence powered by Drizzle ORM.
- **Real-Time Engine**: WebSocket-based event broadcasting for instant Control Tower updates.
- **Data Visualizations**: Recharts (for trend lines and KPI charts) and D3.js.
- **Styling & UI**: Tailwind CSS paired with `lucide-react` icons.

---

## ⚙️ Development & Quickstart

To run the application in your local container or developer workspace:

```bash
# 1. Install required packages
npm install

# 2. Boot the development workspace
npm run dev
```

The application runs on port `3000` with Vite middleware for local development and ESM/CJS transpilation for production builds.
