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
  login_id: staff.login_id,
  name: staff.full_name,
  full_name: staff.full_name,
  email: staff.email,
  role: normalizeRole(staff.role),
  role_label: roleLabel(staff.role),
  staff_role: normalizeRole(staff.role),
  branch_id: staff.branch_id,
  is_active: staff.is_active,
  must_change_password: Boolean(staff.must_change_password)
});

export const login = asyncHandler(async (req, res) => {
  const { login_id, password } = req.body;
  const { rows } = await query("SELECT * FROM staff WHERE lower(login_id) = lower($1) AND is_active = true", [login_id]);
  const user = rows[0];

  const seededPlainPassword = user?.password_hash?.startsWith("$plain$")
    && user.password_hash.replace("$plain$", "") === password;

  if (seededPlainPassword && process.env.ALLOW_PLAIN_SEEDED_PASSWORDS !== "true") {
    throw new ApiError(401, "Invalid login ID or password");
  }

  if (!user || (!seededPlainPassword && !(await bcrypt.compare(password, user.password_hash)))) {
    throw new ApiError(401, "Invalid login ID or password");
  }

  res.json({
    token: signToken(user),
    user: toApiUser(user)
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  const { rows } = await query("SELECT staff_id, password_hash FROM staff WHERE staff_id = $1", [req.user.staff_id]);
  const user = rows[0];
  if (!user) throw new ApiError(404, "User not found");

  // Seeded plaintext passwords are only valid current-password proof when explicitly allowed (mirrors login).
  const seededPlainPassword = user.password_hash?.startsWith("$plain$")
    && user.password_hash.replace("$plain$", "") === current_password
    && process.env.ALLOW_PLAIN_SEEDED_PASSWORDS === "true";

  const validCurrent = seededPlainPassword
    || (user.password_hash && await bcrypt.compare(current_password, user.password_hash));

  if (!validCurrent) throw new ApiError(400, "Current password is incorrect");

  const hashed = await bcrypt.hash(new_password, 10);
  // The holder is setting their own secret — clear the forced-change flag.
  await query("UPDATE staff SET password_hash = $1, must_change_password = FALSE WHERE staff_id = $2", [hashed, user.staff_id]);

  res.json({ message: "Password updated successfully" });
});
