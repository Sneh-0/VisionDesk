import { Router } from "express";
import { listInventory, transactionHistory, updateInventory } from "../controllers/inventoryController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { inventorySchema } from "../models/schemas.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();
router.get("/", authorize("owner", "branch_admin"), listInventory);
router.put("/", authorize("owner", "branch_admin"), validate(inventorySchema), auditLog("manual_adjustment", "inventory"), updateInventory);
router.get("/transactions", authorize("owner", "branch_admin"), transactionHistory);
export default router;
