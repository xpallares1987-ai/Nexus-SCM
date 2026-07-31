import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name").notNull(),
  street: text("street"),
  zipCode: text("zip_code"),
  city: text("city"),
  federalState: text("federal_state"),
  countryIsoCode: text("country_iso_code"),
  countryName: text("country_name"),
  unlocode: text("unlocode"),
  taxId: text("tax_id"),
  phone: text("phone"),
  email: text("email"),
  companyType: text("company_type"), // Carrier, Terminal, Agent, Broker, Supplier, Customer, Haulier, Forwarder, Depot, Authority, Inland Container Depot, Warehouse
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const entityContacts = pgTable("entity_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").references(() => entities.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entityBlFormats = pgTable("entity_bl_formats", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").references(() => entities.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  formatText: text("format_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
