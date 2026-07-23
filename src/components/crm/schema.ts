import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type"), // Legacy
  name: text("name"), // Legacy
  contactEmail: text("contact_email"), // Legacy
  contactPhone: text("contact_phone"), // Legacy
  address: text("address"), // Legacy
  category: text("category").notNull().default("Client"),
  companyName: text("company_name").notNull().default("Unknown"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partyContacts = pgTable("party_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
