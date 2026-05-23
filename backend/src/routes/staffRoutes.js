import { Router } from "express";
import { createStaff, listStaff, updateStaffStatus } from "../controllers/staffController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { staffSchema, idSchema } from "../models/schemas.js";

const router = Router();

router.get("/", authorize("owner", "branch_admin"), listStaff);
router.post("/", authorize("owner", "branch_admin"), validate(staffSchema), createStaff);
router.patch("/:id/status", authorize("owner", "branch_admin"), validate(idSchema), updateStaffStatus);

export default router;
