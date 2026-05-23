import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

export const listInventory = asyncHandler(async (req, res) => {
  const q = req.query.q || null;
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       (i.branch_id::text || ':' || i.barcode_no) AS inventory_id,
       i.barcode_no AS item_id,
       i.barcode_no,
       i.branch_id,
       i.stock_level AS quantity,
       i.reorder_level,
       i.updated_at,
       it.name,
       it.barcode_no AS sku,
       br.name AS brand,
       pc.name AS category,
       b.name AS branch_name
     FROM inventory i
     JOIN item it ON it.barcode_no=i.barcode_no
     LEFT JOIN brand br ON br.brand_id=it.brand_id
     LEFT JOIN product_category pc ON pc.category_id=it.category_id
     JOIN branch b ON b.branch_id=i.branch_id
     WHERE ($1::bigint IS NULL OR i.branch_id=$1)
       AND ($2::text IS NULL OR it.name ILIKE '%'||$2||'%' OR i.barcode_no::text ILIKE '%'||$2||'%' OR b.name ILIKE '%'||$2||'%')
     ORDER BY b.name, it.name`,
    [branchId ?? req.query.branch_id ?? null, q]
  );
  res.json(rows);
});

export const updateInventory = asyncHandler(async (req, res) => {
  const { item_id, branch_id, quantity, reason } = req.body;
  if (!canAccessBranch(req.user, branch_id)) {
    throw new Error("Branch access denied");
  }
  const current = await query(
    "SELECT stock_level FROM inventory WHERE barcode_no=$1 AND branch_id=$2",
    [item_id, branch_id]
  );
  const before = current.rows[0]?.stock_level || 0;
  const delta = quantity - before;
  const { rows } = await query(
    `INSERT INTO inventory (barcode_no, branch_id, stock_level)
     VALUES ($1,$2,$3)
     ON CONFLICT (branch_id, barcode_no) DO UPDATE SET stock_level=$3, updated_at=NOW()
     RETURNING (branch_id::text || ':' || barcode_no) AS inventory_id,
       barcode_no AS item_id, branch_id, stock_level AS quantity, *`,
    [item_id, branch_id, quantity]
  );
  await query(
    `INSERT INTO stock_transaction (barcode_no, branch_id, quantity, txn_type, reference_id, note, created_by)
     VALUES ($1,$2,$3,'adjustment',$4,$4,$5)`,
    [item_id, branch_id, delta, reason, req.user.staff_id]
  );
  res.json(rows[0]);
});

export const transactionHistory = asyncHandler(async (req, res) => {
  const q = req.query.q || null;
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       st.txn_id AS stock_transaction_id,
       st.barcode_no AS item_id,
       st.branch_id,
       st.quantity AS quantity_change,
       st.txn_type AS transaction_type,
       st.reference_id AS reference,
       st.note,
       st.created_at,
       it.name AS item_name,
       b.name AS branch_name,
       s.full_name AS created_by_name
     FROM stock_transaction st
     JOIN item it ON it.barcode_no=st.barcode_no
     JOIN branch b ON b.branch_id=st.branch_id
     LEFT JOIN staff s ON s.staff_id=st.created_by
     WHERE ($1::bigint IS NULL OR st.branch_id = $1)
       AND ($2::text IS NULL OR it.name ILIKE '%'||$2||'%' OR st.barcode_no::text ILIKE '%'||$2||'%' OR st.txn_type ILIKE '%'||$2||'%')
     ORDER BY st.created_at DESC LIMIT 100`,
    [branchId, q]
  );
  res.json(rows);
});
