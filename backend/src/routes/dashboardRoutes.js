import { Router } from "express";
import { getDashboard, getOwnerDashboard } from "../controllers/dashboardController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();
router.get("/", authorize("owner", "branch_admin", "staff"), getDashboard);
router.get("/owner", authorize("owner"), getOwnerDashboard);
export default router;
