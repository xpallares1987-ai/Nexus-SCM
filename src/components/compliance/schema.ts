import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { shipments } from "../shipments/schema.ts";

export const complianceDocuments = pgTable("compliance_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").references(() => shipments.id, { onDelete: "cascade" }),
  documentName: text("document_name").notNull(),
  documentType: text("document_type").notNull(), // 'AEO Certificate', 'FDA Prior Notice', 'Phytosanitary Certificate', 'Dangerous Goods Declaration', etc.
  fileUrl: text("file_url").notNull(), // base64 or path
  fileSize: integer("file_size"), // size in bytes
  mimeType: text("mime_type"), // e.g. 'application/pdf', 'image/png'
  status: text("status").notNull().default('Pending Review'), // 'Pending Review', 'Approved', 'Rejected'
  notes: text("notes"),
  uploadedBy: text("uploaded_by").default('System'),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(), // 'shipments', 'inventory', etc.
  entityId: text("entity_id").notNull(), // ID of the modified entity
  operation: text("operation").notNull(), // 'CREATE', 'READ', 'UPDATE', 'DELETE'
  changedBy: text("changed_by").notNull().default('System'), // User email or ID
  previousState: text("previous_state"), // JSON stringified
  newState: text("new_state"), // JSON stringified
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
