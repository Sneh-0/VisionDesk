import { Router } from "express";
import { login, me, changePassword } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { loginSchema, changePasswordSchema } from "../models/schemas.js";

const router = Router();
router.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again later." }),
  validate(loginSchema),
  login
);
router.get("/me", authenticate, me);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);
export default router;
