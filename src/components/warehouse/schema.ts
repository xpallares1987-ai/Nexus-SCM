import { pgTable, text, timestamp, integer, uuid, decimal } from "drizzle-orm/pg-core";
import { shipments } from "../shipments/schema.ts";

export const warehouses = pgTable("warehouses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id).notNull(),
  sku: text("sku").notNull(),
  description: text("description"),
  quantity: decimal("quantity").notNull().default("0"),
  binLocation: text("bin_location"),
  batchNumber: text("batch_number"),
  serialNumber: text("serial_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  inventoryId: uuid("inventory_id").references(() => inventory.id).notNull(),
  type: text("type").notNull(), // 'IN', 'OUT'
  quantity: decimal("quantity").notNull(),
  reference: text("reference"), // e.g. PO number or Shipment ID
  shipmentId: uuid("shipment_id").references(() => shipments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
