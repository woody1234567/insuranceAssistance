import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { parseCorsOrigins } from "../../src/config/env.js";
import { requireAuth } from "../../src/middlewares/auth.middleware.js";
import { AppError } from "../../src/utils/app-error.js";

describe("Auth and Environment Configuration", () => {
  describe("parseCorsOrigins", () => {
    it("returns empty array when wildcard is supplied", () => {
      expect(parseCorsOrigins("*")).toEqual([]);
    });

    it("returns empty array when empty string is supplied", () => {
      expect(parseCorsOrigins("")).toEqual([]);
      expect(parseCorsOrigins("   ")).toEqual([]);
    });

    it("parses single origin correctly", () => {
      expect(parseCorsOrigins("http://localhost:5173")).toEqual(["http://localhost:5173"]);
    });

    it("parses comma-separated origins and trims spaces", () => {
      const origins = parseCorsOrigins("http://localhost:5173, https://insurance.example.com , https://admin.example.com");
      expect(origins).toEqual([
        "http://localhost:5173",
        "https://insurance.example.com",
        "https://admin.example.com",
      ]);
    });
  });

  describe("requireAuth Middleware", () => {
    it("authenticates via x-user-id header", async () => {
      const req = {
        headers: {
          "x-user-id": "test-user-123",
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await requireAuth(req, res, next);

      expect(req.user).toEqual({ id: "test-user-123" });
      expect(next).toHaveBeenCalledWith();
    });

    it("authenticates via Authorization Bearer token", async () => {
      const req = {
        headers: {
          authorization: "Bearer user-jwt-token-or-id",
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await requireAuth(req, res, next);

      expect(req.user).toEqual({ id: "user-jwt-token-or-id" });
      expect(next).toHaveBeenCalledWith();
    });

    it("fails with AppError when credentials are missing", async () => {
      const req = {
        headers: {},
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as unknown as NextFunction;

      await requireAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe("UNAUTHORIZED");
    });
  });
});
