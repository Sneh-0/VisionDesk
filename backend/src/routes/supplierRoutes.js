import { Router } from "express";
import { createSupplier, listSuppliers, recordSupply, supplyHistory, updateSupplier } from "../controllers/supplierController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idSchema, supplierSchema, supplySchema } from "../models/schemas.js";

const router = Router();
router.get("/", listSuppliers);
router.post("/", authorize("owner"), validate(supplierSchema), createSupplier);
router.put("/:id", authorize("owner"), validate(supplierSchema), updateSupplier);
router.post("/supplies", authorize("owner"), validate(supplySchema), recordSupply);
router.get("/supplies/history", supplyHistory);
export default router;
