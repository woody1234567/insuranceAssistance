import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { env } from "../../src/config/env.js";

const integration = describe.skipIf(!env.DATABASE_URL);

let checkDatabaseConnection: typeof import("../../src/db/index.js").checkDatabaseConnection;
let db: typeof import("../../src/db/index.js").db;
let pool: typeof import("../../src/db/index.js").pool;
let ClaimRequirementRepository: typeof import("../../src/repositories/claim-requirement.repository.js").ClaimRequirementRepository;
let UserInsuranceRepository: typeof import("../../src/repositories/user-insurance.repository.js").UserInsuranceRepository;

integration("repository database integration", () => {
  beforeAll(async () => {
    const database = await import("../../src/db/index.js");
    const claimRepository = await import("../../src/repositories/claim-requirement.repository.js");
    const policyRepository = await import("../../src/repositories/user-insurance.repository.js");
    checkDatabaseConnection = database.checkDatabaseConnection;
    db = database.db;
    pool = database.pool;
    ClaimRequirementRepository = claimRepository.ClaimRequirementRepository;
    UserInsuranceRepository = policyRepository.UserInsuranceRepository;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("connects to MySQL", async () => {
    await expect(checkDatabaseConnection()).resolves.toBeUndefined();
  });

  it("finds only active policies and joins insurance details", async () => {
    const repository = new UserInsuranceRepository(db);
    const policies = await repository.findActiveByUserId("00000000-0000-0000-0000-000000000001");

    expect(policies).toHaveLength(2);
    expect(policies.every((policy) => policy.status === "ACTIVE")).toBe(true);
    expect(policies.map((policy) => policy.policyNumber)).toEqual(
      expect.arrayContaining(["POL-HEALTH-2025-0001", "POL-LIFE-2025-0001"]),
    );
    expect(policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ insuranceName: "守護醫療健康保險", insuranceType: "HEALTH" }),
        expect.objectContaining({ insuranceName: "安心終身壽險", insuranceType: "LIFE" }),
      ]),
    );
  });

  it("finds claim requirements by insurance and claim type", async () => {
    const repository = new ClaimRequirementRepository(db);
    const requirements = await repository.findByInsuranceAndType("INS-HEALTH-001", "hospitalization");

    expect(requirements).toHaveLength(1);
    expect(requirements[0]?.requiredDocuments).toHaveLength(4);
    expect(requirements[0]?.requiredDocuments[0]?.name).toBe("醫療診斷證明書");
  });
});
