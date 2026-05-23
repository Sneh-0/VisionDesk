import { Router } from "express";
import { getInvoice, listInvoices } from "../controllers/invoiceController.js";
import { validate } from "../middleware/validate.js";
import { idSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listInvoices);
router.get("/:id", validate(idSchema), getInvoice);
export default router;
