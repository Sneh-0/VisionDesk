import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { branchScope } from "../utils/roles.js";

export const listBranches = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       branch_id,
       name,
       address,
       city,
       state,
       pincode,
       phone,
       email,
       is_active,
       created_at
     FROM branch
     ${branchId ? "WHERE branch_id = $1" : ""}
     ORDER BY name`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const createBranch = asyncHandler(async (req, res) => {
  const { name, address, city, state, pincode, phone, email } = req.body;
  const { rows } = await query(
    `INSERT INTO branch (name, address, city, state, pincode, phone, email)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, address, city, state, pincode, phone, email]
  );
  res.status(201).json(rows[0]);
});

export const branchAnalytics = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       b.branch_id,
       b.name,
       COALESCE(SUM(si.total_amount),0)::numeric(12,2) AS sales,
       COUNT(DISTINCT so.order_id)::int AS orders,
       COALESCE(SUM(i.stock_level),0)::int AS stock_units
     FROM branch b
     LEFT JOIN sales_order so ON so.branch_id=b.branch_id
     LEFT JOIN sales_invoice si ON si.order_id=so.order_id
     LEFT JOIN inventory i ON i.branch_id=b.branch_id
     ${branchId ? "WHERE b.branch_id = $1" : ""}
     GROUP BY b.branch_id
     ORDER BY sales DESC`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});
