import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../db/schema/index.js";
import { claimRequirements } from "../db/schema/index.js";
import type { ClaimDocument } from "../db/schema/claim-requirements.js";

export type ClaimRequirement = {
  id: string;
  insuranceId: string;
  claimType: string;
  requiredDocuments: ClaimDocument[];
  notes: string | null;
};

export interface IClaimRequirementRepository {
  findByInsuranceAndType(insuranceId: string, claimType: string): Promise<ClaimRequirement[]>;
}

export class ClaimRequirementRepository implements IClaimRequirementRepository {
  private readonly db: MySql2Database<typeof schema>;

  public constructor(db: MySql2Database<typeof schema>) {
    this.db = db;
  }

  public async findByInsuranceAndType(insuranceId: string, claimType: string): Promise<ClaimRequirement[]> {
    return this.db
      .select({
        id: claimRequirements.id,
        insuranceId: claimRequirements.insuranceId,
        claimType: claimRequirements.claimType,
        requiredDocuments: claimRequirements.requiredDocuments,
        notes: claimRequirements.notes,
      })
      .from(claimRequirements)
      .where(and(eq(claimRequirements.insuranceId, insuranceId), eq(claimRequirements.claimType, claimType)));
  }
}
