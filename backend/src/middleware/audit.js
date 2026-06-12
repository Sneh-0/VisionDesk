import { supabaseQuery as query } from "../config/supabase.js";

export const auditLog = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function (data) {
    res.locals.auditData = data;
    return originalJson.apply(this, arguments);
  };

  res.on("finish", async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const staffId = req.user?.staff_id;
        const entityId = req.params.id || res.locals.auditData?.id || res.locals.auditData?.barcode_no || null;
        
        await query(
          `INSERT INTO audit_logs (staff_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            staffId,
            action,
            entityType,
            entityId?.toString(),
            JSON.stringify(req.body),
            req.ip,
            req.get("User-Agent")
          ]
        );
      } catch (error) {
        console.error("Failed to save audit log:", error);
      }
    }
  });

  next();
};
