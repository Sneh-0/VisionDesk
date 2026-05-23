import { Router } from "express";
import { listInventory, transactionHistory, updateInventory } from "../controllers/inventoryController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { inventorySchema } from "../models/schemas.js";

const router = Router();
router.get("/", listInventory);
router.put("/", authorize("owner"), validate(inventorySchema), updateInventory);
router.get("/transactions", transactionHistory);
export default router;
