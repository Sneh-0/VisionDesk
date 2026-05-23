import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";
import { supabaseQuery as query } from "../config/supabase.js";
import { normalizeRole, roleLabel } from "../utils/roles.js";

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

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Missing authorization token");

    const token = header.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query(
      "SELECT staff_id, full_name, email, role, branch_id, is_active FROM staff WHERE staff_id = $1",
      [payload.userId]
    );

    if (!rows[0] || !rows[0].is_active) throw new ApiError(401, "Invalid user session");
    req.user = toApiUser(rows[0]);
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" ? new ApiError(401, "Invalid token") : error);
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  const userRole = normalizeRole(req.user?.role);
  const allowedRoles = roles.map(normalizeRole);
  if (!allowedRoles.includes(userRole)) return next(new ApiError(403, "Insufficient permissions"));
  next();
};
