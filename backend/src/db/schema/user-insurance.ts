import { mysqlTable, char, varchar, date, timestamp, index } from "drizzle-orm/mysql-core";
import { insurance } from "./insurance.js";
import { users } from "./users.js";

export const userInsurance = mysqlTable(
  "user_insurance",
  {
    id: char("id", { length: 36 }).primaryKey(),
    userId: char("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    insuranceId: varchar("insurance_id", { length: 50 }).notNull().references(() => insurance.id, { onDelete: "restrict" }),
    policyNumber: varchar("policy_number", { length: 100 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("idx_user_insurance_lookup").on(table.userId, table.status)],
);
