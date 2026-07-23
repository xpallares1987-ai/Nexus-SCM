import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { shipments } from "../shipments/schema.ts";

export const customsDeclarations = pgTable("customs_declarations", {
  id: uuid("id").primaryKey().defaultRandom(),
  declarationId: text("declaration_id").notNull().unique(), // e.g., 'CUST-2026-001'
  shipmentRef: text("shipment_ref").notNull(),
  shipmentId: uuid("shipment_id").references(() => shipments.id), // Link to actual shipment if available
  type: text("type").notNull(), // 'Import', 'Export', 'Transit'
  status: text("status").notNull(), // 'Cleared', 'Pending', 'Under Review', 'Action Required'
  originCountry: text("origin_country"),
  destinationCountry: text("destination_country"),
  duties: text("duties"), // e.g., '$4,500'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
