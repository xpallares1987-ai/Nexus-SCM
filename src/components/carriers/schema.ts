import { pgTable, text, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { parties } from "../crm/schema.ts";

export const rates = pgTable("rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").references(() => parties.id).notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  mode: text("mode").notNull(), // 'Sea', 'Air', 'Road'
  currency: text("currency").notNull().default('USD'),
  amount: decimal("amount").notNull(),
  status: text("status").notNull().default('Proposed'), // 'Proposed', 'Approved', 'Rejected'
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
