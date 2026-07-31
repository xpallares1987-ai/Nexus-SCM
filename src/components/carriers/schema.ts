import { pgTable, text, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { entities } from "../crm/schema.ts";

export const rates = pgTable("rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  carrierId: uuid("carrier_id").references(() => entities.id).notNull(),
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

export const routings = pgTable("routings", {
  id: uuid("id").primaryKey().defaultRandom(),
  rateId: uuid("rate_id").references(() => rates.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  mode: text("mode").notNull(), 
  transitTimeDays: decimal("transit_time_days"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
