import { supabasePool as pool, supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

export const listSuppliers = asyncHandler(async (_req, res) => {
  const q = _req.query.q || null;
  const { rows } = await query(
    `SELECT
       supplier_id,
       name,
       contact_name AS contact_person,
       contact_no AS phone,
       email,
       address,
       created_at
     FROM supplier
     WHERE ($1::text IS NULL OR name ILIKE '%'||$1||'%' OR contact_no ILIKE '%'||$1||'%' OR supplier_id::text ILIKE '%'||$1||'%')
     ORDER BY name`,
    [q]
  );
  res.json(rows);
});

export const createSupplier = asyncHandler(async (req, res) => {
  const { name, contact_person, phone, email, address } = req.body;
  const { rows } = await query(
    `INSERT INTO supplier (name,contact_name,contact_no,email,address)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING supplier_id, name, contact_name AS contact_person, contact_no AS phone, email, address, created_at`,
    [name, contact_person, phone, email, address]
  );
  res.status(201).json(rows[0]);
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const { name, contact_person, phone, email, address } = req.body;
  const { rows } = await query(
    `UPDATE supplier SET name=$1,contact_name=$2,contact_no=$3,email=$4,address=$5
     WHERE supplier_id=$6
     RETURNING supplier_id, name, contact_name AS contact_person, contact_no AS phone, email, address, created_at`,
    [name, contact_person, phone, email, address, req.params.id]
  );
  res.json(rows[0]);
});

export const recordSupply = asyncHandler(async (req, res) => {
  const { supplier_id, item_id, branch_id, quantity, unit_cost } = req.body;
  if (!canAccessBranch(req.user, branch_id)) {
    throw new ApiError(403, "Branch access denied");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const po = await client.query(
      `INSERT INTO purchase_order (supplier_id,branch_id,status,total_amount,created_by)
       VALUES ($1,$2,'received',$3,$4)
       RETURNING *`,
      [supplier_id, branch_id, quantity * unit_cost, req.user.staff_id]
    );
    const item = await client.query(
      `INSERT INTO purchase_order_item (po_id,barcode_no,quantity,unit_price,received_qty)
       VALUES ($1,$2,$3,$4,$3)
       RETURNING po_item_id AS supply_id, po_id, barcode_no AS item_id, quantity, unit_price, quantity * unit_price AS total_cost`,
      [po.rows[0].po_id, item_id, quantity, unit_cost]
    );
    await client.query(
      `INSERT INTO inventory (barcode_no,branch_id,stock_level)
       VALUES ($1,$2,$3)
       ON CONFLICT (branch_id,barcode_no) DO UPDATE
       SET stock_level=inventory.stock_level+$3, updated_at=NOW()`,
      [item_id, branch_id, quantity]
    );
    await client.query(
      `INSERT INTO stock_transaction (barcode_no,branch_id,quantity,txn_type,reference_id,created_by)
       VALUES ($1,$2,$3,'purchase_in',$4,$5)`,
      [item_id, branch_id, quantity, `PO #${po.rows[0].po_id}`, req.user.staff_id]
    );
    await client.query("COMMIT");
    res.status(201).json(item.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const supplyHistory = asyncHandler(async (_req, res) => {
  const branchId = branchScope(_req.user);
  const q = _req.query.q || null;
  const { rows } = await query(
    `SELECT
       poi.po_item_id AS supply_id,
       po.po_id,
       po.order_date AS supplied_at,
       po.supplier_id,
       poi.barcode_no AS item_id,
       po.branch_id,
       poi.quantity,
       poi.unit_price AS unit_cost,
       poi.quantity * poi.unit_price AS total_cost,
       sup.name AS supplier_name,
       it.name AS item_name,
       b.name AS branch_name
     FROM purchase_order_item poi
     JOIN purchase_order po ON po.po_id=poi.po_id
     JOIN supplier sup ON sup.supplier_id=po.supplier_id
     JOIN item it ON it.barcode_no=poi.barcode_no
     JOIN branch b ON b.branch_id=po.branch_id
     WHERE ($1::bigint IS NULL OR po.branch_id = $1)
       AND ($2::text IS NULL OR sup.name ILIKE '%'||$2||'%' OR it.name ILIKE '%'||$2||'%' OR poi.barcode_no::text ILIKE '%'||$2||'%')
     ORDER BY po.created_at DESC LIMIT 100`,
    [branchId, q]
  );
  res.json(rows);
});
