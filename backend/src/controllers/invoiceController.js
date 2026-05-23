import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { branchScope } from "../utils/roles.js";

export const listInvoices = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       si.invoice_no AS invoice_id,
       si.*,
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
       b.name AS branch_name
     FROM sales_invoice si
     JOIN sales_order so ON so.order_id=si.order_id
     JOIN customer c ON c.mobile_no=so.mobile_no
     JOIN branch b ON b.branch_id=so.branch_id
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
       si.*,
       (si.cgst_amount + si.sgst_amount + si.igst_amount) AS tax_amount,
       so.status,
       so.notes,
       c.name AS customer_name,
       c.mobile_no AS mobile_number,
       c.email,
       concat_ws(', ', c.address_line1, c.address_line2) AS address,
       b.name AS branch_name,
       concat_ws(', ', b.address_line1, b.address_line2) AS branch_address
     FROM sales_invoice si
     JOIN sales_order so ON so.order_id=si.order_id
     JOIN customer c ON c.mobile_no=so.mobile_no
     JOIN branch b ON b.branch_id=so.branch_id
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
