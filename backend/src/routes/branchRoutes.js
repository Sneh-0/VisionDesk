import { Router } from "express";
import { branchAnalytics, createBranch, listBranches } from "../controllers/branchController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { branchSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listBranches);
router.post("/", authorize("owner"), validate(branchSchema), createBranch);
router.get("/analytics", authorize("owner", "branch_admin"), branchAnalytics);
export default router;
