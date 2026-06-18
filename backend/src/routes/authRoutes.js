import { Router } from "express";
import { login, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { loginSchema } from "../models/schemas.js";

const router = Router();
router.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Please try again later." }),
  validate(loginSchema),
  login
);
router.get("/me", authenticate, me);
export default router;
