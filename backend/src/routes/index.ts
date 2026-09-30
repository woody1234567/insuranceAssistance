import { Router } from "express";
import { assistantRouter } from "./assistant.routes.js";
import { claimRouter } from "./claim.routes.js";
import { policyRouter } from "./policy.routes.js";

const apiRouter = Router();

apiRouter.use(assistantRouter);
apiRouter.use(policyRouter);
apiRouter.use(claimRouter);

export { apiRouter };
