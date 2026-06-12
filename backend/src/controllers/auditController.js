import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT al.*, s.full_name AS staff_name, s.login_id AS staff_login
     FROM audit_logs al
     LEFT JOIN staff s ON s.staff_id = al.staff_id
     ORDER BY al.created_at DESC LIMIT 500`
  );
  res.json(rows);
});
