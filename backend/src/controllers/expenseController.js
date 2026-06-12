import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

export const listExpenses = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT e.*, b.name AS branch_name, s.full_name AS creator_name
     FROM expense e
     JOIN branch b ON b.branch_id = e.branch_id
     LEFT JOIN staff s ON s.staff_id = e.created_by
     ${branchId ? "WHERE e.branch_id = $1" : ""}
     ORDER BY e.expense_date DESC, e.created_at DESC`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const createExpense = asyncHandler(async (req, res) => {
  const { branch_id, category, amount, description, expense_date, paid_to, payment_method } = req.body;
  
  if (!canAccessBranch(req.user, branch_id)) {
    throw new ApiError(403, "Branch access denied");
  }

  const { rows } = await query(
    `INSERT INTO expense (branch_id, category, amount, description, expense_date, paid_to, payment_method, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [branch_id, category, amount, description, expense_date || new Date(), paid_to, payment_method, req.user.staff_id]
  );

  res.status(201).json(rows[0]);
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows: existing } = await query("SELECT branch_id FROM expense WHERE expense_id = $1", [req.params.id]);
  
  if (!existing[0]) throw new ApiError(404, "Expense not found");
  if (!canAccessBranch(req.user, existing[0].branch_id)) throw new ApiError(403, "Branch access denied");

  await query("DELETE FROM expense WHERE expense_id = $1", [req.params.id]);
  res.json({ message: "Expense deleted successfully" });
});
