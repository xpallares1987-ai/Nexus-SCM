import { pgTable, text, timestamp, uuid, decimal, integer, jsonb } from "drizzle-orm/pg-core";
import { parties } from "../crm/schema.ts";
import { shipments } from "../shipments/schema.ts";

export const partyBlFormats = pgTable("party_bl_formats", {
  id: uuid("id").primaryKey().defaultRandom(),
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  formatText: text("format_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  shipmentId: uuid("shipment_id").references(() => shipments.id),
  partyId: uuid("party_id").references(() => parties.id).notNull(), // Client (Shipper or Consignee)
  amount: decimal("amount").notNull(),
  currency: text("currency").notNull().default('USD'),
  status: text("status").notNull().default('Pending'), // 'Pending', 'Paid', 'Overdue', 'Cancelled'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  amount: decimal("amount").notNull(),
  currency: text("currency").notNull().default('USD'),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  reference: text("reference"), // Transaction ID or Check Number
  method: text("method"), // 'Bank Transfer', 'Credit Card', 'Cash'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shipmentDocuments = pgTable("shipment_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").references(() => shipments.id).notNull(),
  documentType: text("document_type").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // will store base64 string directly
  uploadedBy: text("uploaded_by").default('System'),
  status: text("status").default('Pending'), // 'Pending', 'Approved', 'Rejected'
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  version: integer("version").default(1).notNull(),
  parentDocumentId: uuid("parent_document_id"),
  comments: text("comments"),
  fileSize: text("file_size"),
  extractedMetadata: jsonb("extracted_metadata"),
  tags: text("tags").array(),

  folderId: uuid("folder_id"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g. HBL, MBL, Invoice
  type: text("type").notNull(),
  content: text("content").notNull(), // HTML template with {{variables}}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentFolders = pgTable("document_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"), // self-referencing not directly enforced by constraint for simplicity here
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
