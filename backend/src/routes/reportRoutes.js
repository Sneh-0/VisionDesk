import { Router } from "express";
import { salesReport, stockReport, inventoryValuation } from "../controllers/reportController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();
router.get("/sales", authorize("owner", "branch_admin"), salesReport);
router.get("/stock", authorize("owner", "branch_admin"), stockReport);
router.get("/valuation", authorize("owner", "branch_admin"), inventoryValuation);
export default router;
