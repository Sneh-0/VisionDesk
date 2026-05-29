import bcrypt from "bcryptjs";
import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, isOwner, normalizeRole } from "../utils/roles.js";

export const listStaff = asyncHandler(async (req, res) => {
  const branchId = isOwner(req.user) ? req.query.branch_id || null : branchScope(req.user);
  const { rows } = await query(
    `SELECT
       s.staff_id,
       s.login_id,
       s.full_name,
       s.email,
       s.phone,
       s.role,
       s.is_active,
       s.branch_id,
       b.name as branch_name,
       s.created_at
     FROM staff s
     JOIN branch b ON s.branch_id = b.branch_id
     ${branchId ? "WHERE s.branch_id = $1" : ""}
     ORDER BY s.full_name`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const createStaff = asyncHandler(async (req, res) => {
  const { branch_id, full_name, login_id, email, phone, role, password } = req.body;
  
  // Check permissions: Branch Admin can only create staff for their branch
  if (!isOwner(req.user)) {
    if (String(branch_id) !== String(req.user.branch_id)) {
      throw new ApiError(403, "You can only create staff for your own branch");
    }
    if (normalizeRole(role) !== "staff") {
      throw new ApiError(403, "Branch admins can only create staff accounts");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const { rows } = await query(
      `INSERT INTO staff (branch_id, full_name, login_id, email, phone, role, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING staff_id, login_id, full_name, email, phone, role, branch_id, is_active, created_at`,
      [branch_id, full_name, login_id, email, phone, role, hashedPassword]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.message?.includes("unique constraint")) {
      throw new ApiError(400, "Login ID already exists");
    }
    throw error;
  }
});

export const updateStaffStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  const { rows: staffRows } = await query("SELECT branch_id FROM staff WHERE staff_id = $1", [id]);
  if (!staffRows[0]) throw new ApiError(404, "Staff not found");

  if (!isOwner(req.user) && String(staffRows[0].branch_id) !== String(req.user.branch_id)) {
    throw new ApiError(403, "You can only manage staff for your own branch");
  }

  const { rows } = await query(
    "UPDATE staff SET is_active = $1 WHERE staff_id = $2 RETURNING staff_id, is_active",
    [is_active, id]
  );
  res.json(rows[0]);
});
