import { and, desc, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../db/schema/index.js";
import { insurance, userInsurance } from "../db/schema/index.js";

export type UserInsuranceDetail = {
  id: string;
  userId: string;
  insuranceId: string;
  policyNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  insuranceName: string;
  insuranceType: string;
};

export interface IUserInsuranceRepository {
  findActiveByUserId(userId: string): Promise<UserInsuranceDetail[]>;
}

export class UserInsuranceRepository implements IUserInsuranceRepository {
  private readonly db: MySql2Database<typeof schema>;

  public constructor(db: MySql2Database<typeof schema>) {
    this.db = db;
  }

  public async findActiveByUserId(userId: string): Promise<UserInsuranceDetail[]> {
    return this.db
      .select({
        id: userInsurance.id,
        userId: userInsurance.userId,
        insuranceId: userInsurance.insuranceId,
        policyNumber: userInsurance.policyNumber,
        status: userInsurance.status,
        startDate: userInsurance.startDate,
        endDate: userInsurance.endDate,
        insuranceName: insurance.name,
        insuranceType: insurance.type,
      })
      .from(userInsurance)
      .innerJoin(insurance, eq(userInsurance.insuranceId, insurance.id))
      .where(and(eq(userInsurance.userId, userId), eq(userInsurance.status, "ACTIVE")))
      .orderBy(desc(userInsurance.startDate));
  }
}
