import { supabasePool as pool, supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

export const listTransfers = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT st.*, fb.name AS from_branch_name, tb.name AS to_branch_name, 
            cb.full_name AS creator_name, rb.full_name AS receiver_name
     FROM stock_transfer st
     JOIN branch fb ON fb.branch_id = st.from_branch_id
     JOIN branch tb ON tb.branch_id = st.to_branch_id
     LEFT JOIN staff cb ON cb.staff_id = st.created_by
     LEFT JOIN staff rb ON rb.staff_id = st.received_by
     ${branchId ? "WHERE st.from_branch_id = $1 OR st.to_branch_id = $1" : ""}
     ORDER BY st.created_at DESC`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const getTransfer = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const transfer = await query(
    `SELECT st.*, fb.name AS from_branch_name, tb.name AS to_branch_name, 
            cb.full_name AS creator_name, rb.full_name AS receiver_name
     FROM stock_transfer st
     JOIN branch fb ON fb.branch_id = st.from_branch_id
     JOIN branch tb ON tb.branch_id = st.to_branch_id
     LEFT JOIN staff cb ON cb.staff_id = st.created_by
     LEFT JOIN staff rb ON rb.staff_id = st.received_by
     WHERE st.transfer_id = $1`,
    [req.params.id]
  );

  if (!transfer.rows[0]) throw new ApiError(404, "Stock transfer not found");
  
  if (branchId && transfer.rows[0].from_branch_id !== branchId && transfer.rows[0].to_branch_id !== branchId) {
    throw new ApiError(403, "Access denied to this transfer");
  }

  const items = await query(
    `SELECT sti.*, i.name AS item_name, i.barcode_no AS sku
     FROM stock_transfer_item sti
     JOIN item i ON i.barcode_no = sti.barcode_no
     WHERE sti.transfer_id = $1`,
    [req.params.id]
  );

  res.json({ ...transfer.rows[0], items: items.rows });
});

export const initiateTransfer = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { from_branch_id, to_branch_id, notes, items } = req.body;

    if (!canAccessBranch(req.user, from_branch_id)) {
      throw new ApiError(403, "Branch access denied for source branch");
    }

    const transfer = await client.query(
      `INSERT INTO stock_transfer (from_branch_id, to_branch_id, notes, created_by, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [from_branch_id, to_branch_id, notes, req.user.staff_id]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO stock_transfer_item (transfer_id, barcode_no, quantity)
         VALUES ($1, $2, $3)`,
        [transfer.rows[0].transfer_id, item.barcode_no, item.quantity]
      );
      
      // Deduct from source branch immediately or when marked as in-transit?
      // Let's deduct when it goes 'in-transit'.
    }

    await client.query("COMMIT");
    res.status(201).json(transfer.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateTransferStatus = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { status } = req.body;
    const transferId = req.params.id;

    const { rows } = await client.query("SELECT * FROM stock_transfer WHERE transfer_id = $1", [transferId]);
    const transfer = rows[0];

    if (!transfer) throw new ApiError(404, "Transfer not found");

    if (status === "in-transit" && transfer.status === "pending") {
      if (!canAccessBranch(req.user, transfer.from_branch_id)) throw new ApiError(403, "Access denied");
      
      const items = await client.query("SELECT * FROM stock_transfer_item WHERE transfer_id = $1", [transferId]);
      for (const item of items.rows) {
        // Check stock availability
        const stockResult = await client.query(
          "SELECT stock_level FROM inventory WHERE branch_id = $1 AND barcode_no = $2",
          [transfer.from_branch_id, item.barcode_no]
        );
        if ((stockResult.rows[0]?.stock_level || 0) < item.quantity) {
          throw new ApiError(400, `Insufficient stock for item ${item.barcode_no} at source branch`);
        }

        // Deduct from source
        await client.query(
          "UPDATE inventory SET stock_level = stock_level - $1, updated_at = NOW() WHERE branch_id = $2 AND barcode_no = $3",
          [item.quantity, transfer.from_branch_id, item.barcode_no]
        );

        // Record transaction
        await client.query(
          `INSERT INTO stock_transaction (barcode_no, branch_id, quantity, txn_type, reference_id, created_by)
           VALUES ($1, $2, $3, 'transfer_out', $4, $5)`,
          [item.barcode_no, transfer.from_branch_id, -item.quantity, `Transfer #${transferId}`, req.user.staff_id]
        );
      }
    } else if (status === "received" && transfer.status === "in-transit") {
      if (!canAccessBranch(req.user, transfer.to_branch_id)) throw new ApiError(403, "Access denied");

      const items = await client.query("SELECT * FROM stock_transfer_item WHERE transfer_id = $1", [transferId]);
      for (const item of items.rows) {
        // Add to destination
        await client.query(
          `INSERT INTO inventory (branch_id, barcode_no, stock_level)
           VALUES ($1, $2, $3)
           ON CONFLICT (branch_id, barcode_no) DO UPDATE 
           SET stock_level = inventory.stock_level + EXCLUDED.stock_level, 
               updated_at = NOW()`,
          [transfer.to_branch_id, item.barcode_no, item.quantity]
        );

        // Record transaction
        await client.query(
          `INSERT INTO stock_transaction (barcode_no, branch_id, quantity, txn_type, reference_id, created_by)
           VALUES ($1, $2, $3, 'transfer_in', $4, $5)`,
          [item.barcode_no, transfer.to_branch_id, item.quantity, `Transfer #${transferId}`, req.user.staff_id]
        );
      }
      await client.query("UPDATE stock_transfer SET received_by = $1, updated_at = NOW() WHERE transfer_id = $2", [req.user.staff_id, transferId]);
    }

    const updated = await client.query(
      "UPDATE stock_transfer SET status = $1, updated_at = NOW() WHERE transfer_id = $2 RETURNING *",
      [status, transferId]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});
