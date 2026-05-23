import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabaseQuery as query } from "../config/supabase.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeRole, roleLabel } from "../utils/roles.js";

const signToken = (user) => jwt.sign(
  { userId: user.staff_id, role: normalizeRole(user.role), branchId: user.branch_id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
);

const toApiUser = (staff) => ({
  user_id: staff.staff_id,
  staff_id: staff.staff_id,
  name: staff.full_name,
  full_name: staff.full_name,
  email: staff.email,
  role: normalizeRole(staff.role),
  role_label: roleLabel(staff.role),
  staff_role: normalizeRole(staff.role),
  branch_id: staff.branch_id,
  is_active: staff.is_active
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await query("SELECT * FROM staff WHERE email = $1 AND is_active = true", [email]);
  const user = rows[0];

  const seededPlainPassword = user?.password_hash?.startsWith("$plain$")
    && user.password_hash.replace("$plain$", "") === password;

  if (!user || (!seededPlainPassword && !(await bcrypt.compare(password, user.password_hash)))) {
    throw new ApiError(401, "Invalid email or password");
  }

  res.json({
    token: signToken(user),
    user: toApiUser(user)
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
