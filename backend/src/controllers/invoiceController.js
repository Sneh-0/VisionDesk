import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { branchScope } from "../utils/roles.js";
import { notifyPointsEarned } from "../utils/notifications.js";

export const listInvoices = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       si.invoice_no AS invoice_id,
       si.invoice_no AS invoice_number,
       si.*,
       COALESCE(si.discount, 0) AS discount,
       GREATEST(si.total_amount - COALESCE(si.discount, 0), 0) AS payable_amount,
       (si.cgst_amount + si.sgst_amount + si.igst_amount) AS tax_amount,
       CASE so.status
         WHEN 'confirmed' THEN 'Pending'
         WHEN 'processing' THEN 'In Progress'
         WHEN 'ready_for_pickup' THEN 'Ready'
         WHEN 'delivered' THEN 'Delivered'
         ELSE initcap(replace(so.status::text, '_', ' '))
       END AS status,
       c.name AS customer_name,
       c.mobile_no AS mobile_number,
       b.name AS branch_name,
       so.medical_history_id,
       so.lens_modification_notes,
       CASE WHEN so.medical_history_id IS NULL THEN false ELSE true END AS requires_prescription,
       creator.login_id AS created_by_login_id,
       creator.full_name AS created_by_name
     FROM sales_invoice si
     JOIN sales_order so ON so.order_id=si.order_id
     JOIN customer c ON c.mobile_no=so.mobile_no
     JOIN branch b ON b.branch_id=so.branch_id
     LEFT JOIN staff creator ON creator.staff_id=si.created_by
     ${branchId ? "WHERE so.branch_id = $1" : ""}
     ORDER BY si.invoice_date DESC`
    , branchId ? [branchId] : []
  );
  res.json(rows);
});

export const getInvoice = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const invoiceParams = branchId ? [req.params.id, branchId] : [req.params.id];
  const invoice = await query(
    `SELECT
       si.invoice_no AS invoice_id,
       si.invoice_no AS invoice_number,
       si.*,
       COALESCE(si.discount, 0) AS discount,
       GREATEST(si.total_amount - COALESCE(si.discount, 0), 0) AS payable_amount,
       (si.cgst_amount + si.sgst_amount + si.igst_amount) AS tax_amount,
       so.status,
       so.notes,
       c.name AS customer_name,
       c.mobile_no AS mobile_number,
       c.email,
       concat_ws(', ', c.address_line1, c.address_line2) AS address,
       b.name AS branch_name,
       concat_ws(', ', b.address_line1, b.address_line2) AS branch_address,
       so.medical_history_id,
       so.lens_modification_notes,
       CASE WHEN so.medical_history_id IS NULL THEN false ELSE true END AS requires_prescription,
       COALESCE(lp.points_earned - lp.points_redeemed, 0) AS loyalty_points_available,
       creator.login_id AS created_by_login_id,
       creator.full_name AS created_by_name
     FROM sales_invoice si
     JOIN sales_order so ON so.order_id=si.order_id
     JOIN customer c ON c.mobile_no=so.mobile_no
     JOIN branch b ON b.branch_id=so.branch_id
     LEFT JOIN loyalty_program lp ON lp.mobile_no = so.mobile_no
     LEFT JOIN staff creator ON creator.staff_id=si.created_by
     WHERE si.invoice_no=$1 ${branchId ? "AND so.branch_id=$2" : ""}`,
    invoiceParams
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
     JOIN item it ON it.barcode_no=ii.barcode_no
     LEFT JOIN brand br ON br.brand_id=it.brand_id
     WHERE ii.invoice_no=$1`,
    [req.params.id]
  );
  res.json({ ...invoice.rows[0], items: items.rows });
});

export const updatePayment = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const invoiceParams = branchId ? [req.params.id, branchId] : [req.params.id];
  const existing = await query(
    `SELECT
       si.invoice_no,
       si.order_id,
       si.branch_id,
       si.mobile_no,
       si.total_amount,
       COALESCE(si.discount, 0) AS discount,
       COALESCE(lp.points_earned - lp.points_redeemed, 0) AS loyalty_points_available
     FROM sales_invoice si
     JOIN sales_order so ON so.order_id = si.order_id
     LEFT JOIN loyalty_program lp ON lp.mobile_no = si.mobile_no
     WHERE si.invoice_no = $1 ${branchId ? "AND so.branch_id = $2" : ""}`,
    invoiceParams
  );

  const invoice = existing.rows[0];
  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const requestedPoints = Number(req.body.loyalty_points || 0);
  if (requestedPoints > invoice.loyalty_points_available) {
    throw new ApiError(400, "Not enough loyalty points available");
  }

  // Get point value from settings
  const pointValueResult = await query("SELECT value FROM settings WHERE key = 'loyalty_point_value'");
  const pointValue = Number(pointValueResult.rows[0]?.value || 1.0);

  const loyaltyDiscount = Math.min(Number((requestedPoints * pointValue).toFixed(2)), Number(invoice.total_amount));
  const paymentMethod = req.body.payment_method;

  const update = await query(
    `UPDATE sales_invoice
     SET discount = $2,
         payment_status = 'paid',
         payment_method = $3
     WHERE invoice_no = $1
     RETURNING invoice_no AS invoice_id, invoice_no AS invoice_number, *,
       COALESCE(discount, 0) AS discount,
       GREATEST(total_amount - COALESCE(discount, 0), 0) AS payable_amount`,
    [invoice.invoice_no, loyaltyDiscount, paymentMethod]
  );

  // Process Loyalty Points (Earning and Redeeming)
  const ratioResult = await query("SELECT value FROM settings WHERE key = 'loyalty_conversion_ratio'");
  const conversionRatio = Number(ratioResult.rows[0]?.value || 0.1);
  const pointsEarned = Math.floor(Number(update.rows[0].payable_amount) * conversionRatio);

  if (pointsEarned > 0 || requestedPoints > 0) {
    await query(
      `INSERT INTO loyalty_program (mobile_no, points_earned, points_redeemed)
       VALUES ($1, $2, $3)
       ON CONFLICT (mobile_no) DO UPDATE
       SET points_earned = loyalty_program.points_earned + EXCLUDED.points_earned,
           points_redeemed = loyalty_program.points_redeemed + EXCLUDED.points_redeemed,
           last_updated = NOW()`,
      [invoice.mobile_no, pointsEarned, requestedPoints]
    );

    if (pointsEarned > 0) {
      await query(
        `INSERT INTO loyalty_transaction (mobile_no, txn_type, points, reference_id, note, created_by)
         VALUES ($1, 'earn', $2, $3, $4, $5)`,
        [invoice.mobile_no, pointsEarned, `Invoice #${invoice.invoice_no}`, `Earned from payment of Invoice #${invoice.invoice_no}`, req.user.staff_id]
      );
    }

    if (requestedPoints > 0) {
      await query(
        `INSERT INTO loyalty_transaction (mobile_no, txn_type, points, reference_id, note, created_by)
         VALUES ($1, 'redeem', $2, $3, $4, $5)`,
        [invoice.mobile_no, requestedPoints, `Invoice #${invoice.invoice_no}`, `Redeemed loyalty points during payment for Invoice #${invoice.invoice_no}`, req.user.staff_id]
      );
    }

    await query("CALL sp_update_loyalty_tier($1)", [invoice.mobile_no]);

    // Send notification for points earned
    if (pointsEarned > 0) {
      const customerResult = await query("SELECT name FROM customer WHERE mobile_no = $1", [invoice.mobile_no]);
      if (customerResult.rows[0]) {
        notifyPointsEarned(customerResult.rows[0].name, invoice.mobile_no, pointsEarned).catch(console.error);
      }
    }
  }

  res.json(update.rows[0]);
});
