import { Router } from "express";
import { createSupplier, listSuppliers, recordSupply, supplyHistory, updateSupplier } from "../controllers/supplierController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idSchema, supplierSchema, supplySchema } from "../models/schemas.js";

const router = Router();
router.get("/", authorize("owner", "branch_admin"), listSuppliers);
router.post("/", authorize("owner", "branch_admin"), validate(supplierSchema), createSupplier);
router.put("/:id", authorize("owner", "branch_admin"), validate(supplierSchema), updateSupplier);
router.post("/supplies", authorize("owner", "branch_admin"), validate(supplySchema), recordSupply);
router.get("/supplies/history", authorize("owner", "branch_admin"), supplyHistory);
export default router;
