import { supabasePool as pool, supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope, canAccessBranch } from "../utils/roles.js";

const toDbStatus = (status = "Pending") => ({
  Pending: "confirmed",
  "In Progress": "processing",
  Ready: "ready_for_pickup",
  Delivered: "delivered"
}[status] || status);

const toApiStatusSql = `
  CASE o.status
    WHEN 'confirmed' THEN 'Pending'
    WHEN 'processing' THEN 'In Progress'
    WHEN 'ready_for_pickup' THEN 'Ready'
    WHEN 'delivered' THEN 'Delivered'
    ELSE initcap(replace(o.status::text, '_', ' '))
  END
`;

export const listOrders = asyncHandler(async (req, res) => {
  const dbStatus = req.query.status ? toDbStatus(req.query.status) : null;
  const q = req.query.q || null;
  const branchId = branchScope(req.user);
  const branchClause = branchId === null ? "" : " AND o.branch_id=$3";
  const params = branchId === null ? [dbStatus, q] : [dbStatus, q, branchId];
  const { rows } = await query(
    `SELECT
       o.*,
       ${toApiStatusSql} AS status,
       c.name AS customer_name,
       c.mobile_no AS customer_id,
       c.mobile_no AS mobile_number,
       b.name AS branch_name,
       COALESCE(si.total_amount, 0) AS total_amount,
       o.medical_history_id,
       o.lens_modification_notes,
       CASE WHEN o.medical_history_id IS NULL THEN false ELSE true END AS requires_prescription,
       creator.login_id AS created_by_login_id,
       creator.full_name AS created_by_name
     FROM sales_order o
     JOIN customer c ON c.mobile_no=o.mobile_no
     JOIN branch b ON b.branch_id=o.branch_id
     LEFT JOIN sales_invoice si ON si.order_id=o.order_id
     LEFT JOIN staff creator ON creator.staff_id=o.created_by
     WHERE ($1::order_status IS NULL OR o.status=$1)
       AND ($2::text IS NULL OR o.order_id::text ILIKE '%'||$2||'%' OR c.name ILIKE '%'||$2||'%' OR c.mobile_no ILIKE '%'||$2||'%')
       ${branchClause}
     ORDER BY o.created_at DESC`,
    params
  );
  res.json(rows);
});

export const getOrder = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const orderParams = branchId === null ? [req.params.id] : [req.params.id, branchId];
  const order = await query(
    `SELECT
       o.*,
       ${toApiStatusSql} AS status,
       c.name AS customer_name,
       c.mobile_no AS customer_id,
       c.mobile_no AS mobile_number,
       c.email,
       b.name AS branch_name,
       COALESCE(si.total_amount, 0) AS total_amount,
       o.medical_history_id,
       o.lens_modification_notes,
       CASE WHEN o.medical_history_id IS NULL THEN false ELSE true END AS requires_prescription,
       creator.login_id AS created_by_login_id,
       creator.full_name AS created_by_name
     FROM sales_order o
     JOIN customer c ON c.mobile_no=o.mobile_no
     JOIN branch b ON b.branch_id=o.branch_id
     LEFT JOIN sales_invoice si ON si.order_id=o.order_id
     LEFT JOIN staff creator ON creator.staff_id=o.created_by
     WHERE o.order_id=$1 ${branchId === null ? "" : "AND o.branch_id=$2"}`,
    orderParams
  );
  const items = await query(
    `SELECT
       ii.line_id AS order_item_id,
       ii.barcode_no AS item_id,
       ii.quantity,
       ii.unit_price,
       ii.line_total,
       it.name,
       it.barcode_no AS sku,
       br.name AS brand
     FROM invoice_item ii
     JOIN sales_invoice si ON si.invoice_no=ii.invoice_no
     JOIN item it ON it.barcode_no=ii.barcode_no
     LEFT JOIN brand br ON br.brand_id=it.brand_id
     JOIN sales_order o ON o.order_id=si.order_id
     WHERE si.order_id=$1 ${branchId === null ? "" : "AND o.branch_id=$2"}`,
    orderParams
  );
  const invoice = await query(
    `SELECT invoice_no AS invoice_id, *, invoice_no,
       (cgst_amount + sgst_amount + igst_amount) AS tax_amount
     FROM sales_invoice si
     JOIN sales_order o ON o.order_id=si.order_id
     WHERE si.order_id=$1 ${branchId === null ? "" : "AND o.branch_id=$2"}`,
    orderParams
  );
  const prescription = order.rows[0]?.medical_history_id
    ? await query(
        `SELECT record_id AS medical_history_id, *
         FROM medical_history
         WHERE record_id=$1`,
        [order.rows[0].medical_history_id]
      )
    : { rows: [] };
  res.json({ ...order.rows[0], items: items.rows, invoice: invoice.rows[0] || null, prescription: prescription.rows[0] || null });
});

export const createOrder = asyncHandler(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { customer_id, branch_id, tax_rate, notes, items, requires_prescription, prescription, lens_modification_notes } = req.body;
    if (!canAccessBranch(req.user, branch_id)) {
      throw new ApiError(403, "Branch access denied");
    }
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
    const taxAmount = Number((subtotal * tax_rate).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const halfTax = Number((taxAmount / 2).toFixed(2));

    let medicalHistoryId = null;
    if (requires_prescription) {
      const medical = await client.query(
        `INSERT INTO medical_history (
           mobile_no, examined_by, left_eye_sph, left_eye_cyl, left_eye_axis,
           right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING record_id`,
        [
          customer_id,
          req.user.staff_id,
          prescription?.left_eye_sph ?? null,
          prescription?.left_eye_cyl ?? null,
          prescription?.left_eye_axis ?? null,
          prescription?.right_eye_sph ?? null,
          prescription?.right_eye_cyl ?? null,
          prescription?.right_eye_axis ?? null,
          prescription?.ipd_near ?? null,
          prescription?.ipd_far ?? null,
          prescription?.notes || lens_modification_notes || null
        ]
      );
      medicalHistoryId = medical.rows[0].record_id;
    }

    const order = await client.query(
      `INSERT INTO sales_order (mobile_no,branch_id,status,notes,created_by,medical_history_id,lens_modification_notes)
       VALUES ($1,$2,'confirmed',$3,$4,$5,$6) RETURNING *`,
      [customer_id, branch_id, notes, req.user.staff_id, medicalHistoryId, lens_modification_notes || null]
    );

    const invoice = await client.query(
      `INSERT INTO sales_invoice (
         order_id, branch_id, mobile_no, subtotal, cgst_amount, sgst_amount, total_amount, payment_status, created_by
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
       RETURNING invoice_no AS invoice_id, *, (cgst_amount + sgst_amount + igst_amount) AS tax_amount`,
      [order.rows[0].order_id, branch_id, customer_id, subtotal, halfTax, halfTax, total, req.user.staff_id]
    );

    for (const item of items) {
      const lineSubtotal = Number(item.quantity) * Number(item.unit_price);
      const lineTotal = Number((lineSubtotal * (1 + tax_rate)).toFixed(2));
      await client.query(
        `INSERT INTO invoice_item (invoice_no,barcode_no,quantity,unit_price,tax_rate,line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [invoice.rows[0].invoice_no, item.item_id, item.quantity, item.unit_price, tax_rate * 100, lineTotal]
      );
      await client.query(
        `UPDATE inventory SET stock_level=stock_level-$1, updated_at=NOW()
         WHERE barcode_no=$2 AND branch_id=$3`,
        [item.quantity, item.item_id, branch_id]
      );
      await client.query(
        `INSERT INTO stock_transaction (barcode_no,branch_id,quantity,txn_type,reference_id,created_by)
         VALUES ($1,$2,$3,'sale_out',$4,$5)`,
        [item.item_id, branch_id, -item.quantity, `Order #${order.rows[0].order_id}`, req.user.staff_id]
      );
    }

    const pointsEarned = Math.floor(total / 100);
    if (pointsEarned > 0) {
      await client.query(
        `INSERT INTO loyalty_program (mobile_no, points_earned, tier)
         VALUES ($1, $2, $3)
         ON CONFLICT (mobile_no) DO UPDATE
         SET points_earned = loyalty_program.points_earned + EXCLUDED.points_earned,
             last_updated = NOW()`,
        [customer_id, pointsEarned, pointsEarned >= 5000 ? "platinum" : pointsEarned >= 2000 ? "gold" : "silver"]
      );
      await client.query(
        `INSERT INTO loyalty_transaction (mobile_no, txn_type, points, reference_id, note, created_by)
         VALUES ($1, 'earn', $2, $3, $4, $5)`,
        [customer_id, pointsEarned, order.rows[0].order_id, `Earned from Order #${order.rows[0].order_id}`, req.user.staff_id]
      );
      await client.query("CALL sp_update_loyalty_tier($1)", [customer_id]);
    }

    await client.query("COMMIT");
    res.status(201).json({ order: order.rows[0], invoice: invoice.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { rows: currentRows } = await query("SELECT branch_id FROM sales_order WHERE order_id=$1", [req.params.id]);
  if (!currentRows[0]) throw new ApiError(404, "Order not found");
  if (!canAccessBranch(req.user, currentRows[0].branch_id)) {
    throw new ApiError(403, "Branch access denied");
  }
  const { rows } = await query(
    `UPDATE sales_order SET status=$1, updated_at=NOW(), updated_by=$3
     WHERE order_id=$2
     RETURNING *, CASE status
       WHEN 'confirmed' THEN 'Pending'
       WHEN 'processing' THEN 'In Progress'
       WHEN 'ready_for_pickup' THEN 'Ready'
       WHEN 'delivered' THEN 'Delivered'
       ELSE initcap(replace(status::text, '_', ' '))
     END AS status`,
    [toDbStatus(req.body.status), req.params.id, req.user.staff_id]
  );
  res.json(rows[0]);
});
