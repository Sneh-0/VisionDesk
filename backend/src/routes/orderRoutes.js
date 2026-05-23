import { Router } from "express";
import { createOrder, getOrder, listOrders, updateStatus } from "../controllers/orderController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idSchema, orderSchema, statusSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listOrders);
router.post("/", validate(orderSchema), createOrder);
router.get("/:id", validate(idSchema), getOrder);
router.patch("/:id/status", authorize("owner"), validate(statusSchema), updateStatus);
export default router;
