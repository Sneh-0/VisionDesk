import { Router } from "express";
import { addPrescription, createCustomer, deleteCustomer, getPrescriptionHistory, listCustomers, updateCustomer } from "../controllers/customerController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { customerSchema, idSchema, prescriptionSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listCustomers);
router.post("/", validate(customerSchema), createCustomer);
router.put("/:id", authorize("owner"), validate(customerSchema), updateCustomer);
router.delete("/:id", authorize("owner"), validate(idSchema), deleteCustomer);
router.get("/:id/prescriptions", validate(idSchema), getPrescriptionHistory);
router.post("/:id/prescriptions", validate(prescriptionSchema), addPrescription);
export default router;
