import { mysqlTable, varchar, text, timestamp, uniqueIndex, index } from "drizzle-orm/mysql-core";

export const insurance = mysqlTable(
  "insurance",
  {
    id: varchar("id", { length: 50 }).primaryKey(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("uk_insurance_code").on(table.code), index("idx_insurance_type").on(table.type)],
);
