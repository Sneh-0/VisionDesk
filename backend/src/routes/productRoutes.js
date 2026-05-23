import { Router } from "express";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../controllers/productController.js";
import { authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { idSchema, productSchema } from "../models/schemas.js";

const router = Router();
router.get("/", listProducts);
router.post("/", authorize("owner"), validate(productSchema), createProduct);
router.put("/:id", authorize("owner"), validate(productSchema), updateProduct);
router.delete("/:id", authorize("owner"), validate(idSchema), deleteProduct);
export default router;
