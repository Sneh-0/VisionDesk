import { Router } from "express";
import { listPOs, getPO, receivePO } from "../controllers/purchaseOrderController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", listPOs);
router.get("/:id", getPO);
router.post("/:id/receive", authorize("owner", "branch_admin"), receivePO);

export default router;
