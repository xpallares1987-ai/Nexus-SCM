import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { parties } from "../crm/schema.ts";

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceNumber: text("reference_number").notNull().unique(), // e.g., FFW-2023-001
  trackingNumber: text("tracking_number").unique(),
  priority: text("priority").default('Normal'), // 'High', 'Normal', 'Low'
  type: text("type").notNull(), // 'Sea-FCL', 'Sea-LCL', 'Air', 'Road'
  status: text("status").notNull(), // 'Draft', 'Booked', 'InTransit', 'Arrived', 'Delivered'
  
  shipperId: uuid("shipper_id").references(() => parties.id),
  consigneeId: uuid("consignee_id").references(() => parties.id),
  carrierId: uuid("carrier_id").references(() => parties.id),
  
  originPort: text("origin_port"),
  destinationPort: text("destination_port"),
  
  eta: timestamp("eta"), // Estimated Time of Arrival
  etd: timestamp("etd"), // Estimated Time of Departure
  ata: timestamp("ata"), // Actual Time of Arrival
  atd: timestamp("atd"), // Actual Time of Departure
  
  hbl: text("hbl"), // House Bill of Lading
  mbl: text("mbl"), // Master Bill of Lading
  awb: text("awb"), // Air Waybill

  // Financials
  freightCost: text("freight_cost"), // Stored as text/decimal for simplicity
  customsCost: text("customs_cost"),
  insuranceCost: text("insurance_cost"),
  currency: text("currency").default("USD"),
  weight: text("weight"), // Shipment weight in kg
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shipmentEvents = pgTable("shipment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").references(() => shipments.id).notNull(),
  eventType: text("event_type").notNull(), // 'Status Change', 'Document Upload', 'General Update'
  description: text("description").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  performedBy: text("performed_by").default('System'), // Would be user ID in a real app
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
