import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  street: text("street"),
  postalCode: text("postal_code"),
  city: text("city"),
  province: text("province"),
  country: text("country"),

  emailNotifications: integer("email_notifications").default(1),
  smsNotifications: integer("sms_notifications").default(0),
  theme: text("theme").default('light'),
  role: text("role").notNull().default('Ejecutivo'), // 'Admin', 'Operador', 'Ejecutivo'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: text("event_type").notNull(), // 'Shipment Update', 'User Registration', 'Alert', etc.
  description: text("description").notNull(),
  severity: text("severity").default('info'), // 'info', 'warning', 'critical'
  referenceId: text("reference_id"), // Optional ID linking to user/shipment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
  role: text("role").primaryKey(),
  permissions: text("permissions").notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }), // if null, global/role-based? Let's say user-specific, or we can use target_role
  targetRole: text("target_role"), // 'Admin', 'Manager', etc.
  type: text("type").notNull(), // 'Alert', 'Info', etc.
  message: text("message").notNull(),
  isRead: integer("is_read").default(0).notNull(),
  referenceId: text("reference_id"), // Document ID, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
