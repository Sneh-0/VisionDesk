import { Router } from "express";
import { getInvoice, listInvoices, updatePayment } from "../controllers/invoiceController.js";
import { validate } from "../middleware/validate.js";
import { idSchema, paymentSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listInvoices);
router.get("/:id", validate(idSchema), getInvoice);
router.patch("/:id/payment", validate(idSchema), validate(paymentSchema), updatePayment);
export default router;
