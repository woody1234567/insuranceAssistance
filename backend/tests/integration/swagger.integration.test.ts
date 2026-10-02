import { describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import app from "../../src/app.js";
import { swaggerSpec } from "../../src/config/swagger.js";

describe("Swagger Documentation Integration", () => {
  it("generates a valid OpenAPI 3.0 specification", () => {
    expect(swaggerSpec.openapi).toBe("3.0.0");
    expect(swaggerSpec.info.title).toContain("智慧保險諮詢助理 API");
    expect(swaggerSpec.paths).toBeDefined();

    // Verify key paths are documented
    const paths = Object.keys(swaggerSpec.paths);
    expect(paths).toContain("/api/v1/assistant/message");
    expect(paths).toContain("/api/v1/policies");
    expect(paths).toContain("/api/v1/claims/requirements");
    expect(paths).toContain("/api/v1/claims/start");
    expect(paths).toContain("/healthz");

    // Verify security schemes
    expect(swaggerSpec.components.securitySchemes).toHaveProperty("bearerAuth");
    expect(swaggerSpec.components.securitySchemes).toHaveProperty("userIdHeader");
  });

  it("serves OpenAPI JSON schema at /api-docs.json", async () => {
    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api-docs.json`);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.openapi).toBe("3.0.0");
      expect(json.paths["/api/v1/assistant/message"]).toBeDefined();
      expect(json.paths["/api/v1/policies"]).toBeDefined();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it("serves Swagger UI html at /api-docs/", async () => {
    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}/api-docs/`);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain("智慧保險諮詢助理 API Docs");
      expect(html).toContain("swagger-ui");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
