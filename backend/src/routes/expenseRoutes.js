import { Router } from "express";
import { listExpenses, createExpense, deleteExpense } from "../controllers/expenseController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", listExpenses);
router.post("/", authorize("owner", "branch_admin"), createExpense);
router.delete("/:id", authorize("owner", "branch_admin"), deleteExpense);

export default router;
