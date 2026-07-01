import { Router } from "express";
import { createStaff, listStaff, updateStaffStatus, resetStaffPassword } from "../controllers/staffController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { auditLog } from "../middleware/audit.js";
import { staffSchema, idSchema, resetPasswordSchema } from "../models/schemas.js";

const router = Router();

router.get("/", authorize("owner", "branch_admin"), listStaff);
router.post("/", authorize("owner", "branch_admin"), validate(staffSchema), createStaff);
router.patch("/:id/status", authorize("owner", "branch_admin"), validate(idSchema), updateStaffStatus);
router.patch("/:id/password", authorize("owner"), validate(resetPasswordSchema), auditLog("reset_password", "staff"), resetStaffPassword);

export default router;
