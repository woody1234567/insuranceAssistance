import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

type RequestParts = {
  body: unknown;
  query: unknown;
  params: unknown;
};

export function validateRequest(schema: z.ZodType<RequestParts>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
      req.body = parsed.body;
      req.query = parsed.query as Request["query"];
      req.params = parsed.params as Request["params"];
      next();
    } catch (error) {
      next(error);
    }
  };
}
