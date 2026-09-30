import {
  mysqlTable,
  char,
  varchar,
  json,
  text,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";
import { insurance } from "./insurance.js";

export type ClaimDocument = {
  name: string;
  isOriginalRequired: boolean;
  description: string;
};

export const claimRequirements = mysqlTable(
  "claim_requirements",
  {
    id: char("id", { length: 36 }).primaryKey(),
    insuranceId: varchar("insurance_id", { length: 50 })
      .notNull()
      .references(() => insurance.id, { onDelete: "cascade" }),
    claimType: varchar("claim_type", { length: 50 }).notNull(),
    requiredDocuments: json("required_documents")
      .$type<ClaimDocument[]>()
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_claim_requirements_lookup").on(
      table.insuranceId,
      table.claimType,
    ),
  ],
);
