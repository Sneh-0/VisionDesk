import { supabasePool as pool, supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

export const listPOs = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT po.*, s.name AS supplier_name, b.name AS branch_name, st.full_name AS creator_name
     FROM purchase_order po
     JOIN supplier s ON s.supplier_id = po.supplier_id
     JOIN branch b ON b.branch_id = po.branch_id
     LEFT JOIN staff st ON st.staff_id = po.created_by
     ${branchId ? "WHERE po.branch_id = $1" : ""}
     ORDER BY po.created_at DESC`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const getPO = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const po = await query(
    `SELECT po.*, s.name AS supplier_name, b.name AS branch_name, st.full_name AS creator_name
     FROM purchase_order po
     JOIN supplier s ON s.supplier_id = po.supplier_id
     JOIN branch b ON b.branch_id = po.branch_id
     LEFT JOIN staff st ON st.staff_id = po.created_by
     WHERE po.po_id = $1 ${branchId ? "AND po.branch_id = $2" : ""}`,
    branchId ? [req.params.id, branchId] : [req.params.id]
  );

  if (!po.rows[0]) throw new ApiError(404, "Purchase Order not found");

  const items = await query(
    `SELECT poi.*, i.name AS item_name, i.barcode_no AS sku
     FROM purchase_order_item poi
     JOIN item i ON i.barcode_no = poi.barcode_no
     WHERE poi.po_id = $1`,
    [req.params.id]
  );

  res.json({ ...po.rows[0], items: items.rows });
});

export const receivePO = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { items } = req.body; // Array of { barcode_no, received_qty }
    const poId = req.params.id;

    const poResult = await client.query("SELECT branch_id, status FROM purchase_order WHERE po_id = $1", [poId]);
    const po = poResult.rows[0];

    if (!po) throw new ApiError(404, "Purchase Order not found");
    if (!canAccessBranch(req.user, po.branch_id)) throw new ApiError(403, "Branch access denied");
    if (po.status === "received") throw new ApiError(400, "Purchase Order already fully received");

    for (const item of items) {
      // Update received quantity in PO items
      await client.query(
        `UPDATE purchase_order_item 
         SET received_qty = received_qty + $1 
         WHERE po_id = $2 AND barcode_no = $3`,
        [item.received_qty, poId, item.barcode_no]
      );

      // Update inventory stock level
      await client.query(
        `INSERT INTO inventory (branch_id, barcode_no, stock_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (branch_id, barcode_no) DO UPDATE 
         SET stock_level = inventory.stock_level + EXCLUDED.stock_level, 
             updated_at = NOW()`,
        [po.branch_id, item.barcode_no, item.received_qty]
      );

      // Record stock transaction
      await client.query(
        `INSERT INTO stock_transaction (barcode_no, branch_id, quantity, txn_type, reference_id, created_by)
         VALUES ($1, $2, $3, 'purchase_in', $4, $5)`,
        [item.barcode_no, po.branch_id, item.received_qty, `PO #${poId}`, req.user.staff_id]
      );
    }

    // Check if PO is fully received
    const checkResult = await client.query(
      `SELECT COUNT(*) FROM purchase_order_item WHERE po_id = $1 AND quantity > received_qty`,
      [poId]
    );
    const fullyReceived = parseInt(checkResult.rows[0].count) === 0;

    await client.query(
      `UPDATE purchase_order SET status = $1 WHERE po_id = $2`,
      [fullyReceived ? "received" : "partial", poId]
    );

    await client.query("COMMIT");
    res.json({ message: "PO items received successfully", status: fullyReceived ? "received" : "partial" });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
