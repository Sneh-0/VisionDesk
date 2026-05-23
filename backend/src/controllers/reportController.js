import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { branchScope } from "../utils/roles.js";

export const salesReport = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const branchParams = branchId ? [branchId] : [];

  const [branchSales, productSales] = await Promise.all([
    query(
      `SELECT
         b.branch_id,
         b.name AS branch_name,
         COALESCE(SUM(si.total_amount),0)::numeric(12,2) AS sales,
         COUNT(DISTINCT so.order_id)::int AS orders,
         COUNT(DISTINCT ii.line_id)::int AS items_sold
       FROM branch b
       LEFT JOIN sales_order so ON so.branch_id = b.branch_id
       LEFT JOIN sales_invoice si ON si.order_id = so.order_id
       LEFT JOIN invoice_item ii ON ii.invoice_no = si.invoice_no
       ${branchId ? "WHERE b.branch_id = $1" : ""}
       GROUP BY b.branch_id, b.name
       ORDER BY sales DESC`,
      branchParams
    ),
    query(
      `SELECT
         b.branch_id,
         b.name AS branch_name,
         it.barcode_no AS item_id,
         it.name AS product_name,
         SUM(ii.quantity)::int AS units,
         SUM(ii.line_total)::numeric(12,2) AS revenue
       FROM invoice_item ii
       JOIN sales_invoice si ON si.invoice_no = ii.invoice_no
       JOIN sales_order so ON so.order_id = si.order_id
       JOIN branch b ON b.branch_id = so.branch_id
       JOIN item it ON it.barcode_no = ii.barcode_no
       ${branchId ? "WHERE so.branch_id = $1" : ""}
       GROUP BY b.branch_id, b.name, it.barcode_no, it.name
       ORDER BY b.name, revenue DESC`,
      branchParams
    )
  ]);

  const summary = branchId
    ? await query(
        `SELECT
           COALESCE(SUM(si.total_amount),0)::numeric(12,2) AS total_sales,
           COUNT(DISTINCT so.order_id)::int AS total_orders,
           COUNT(DISTINCT so.mobile_no)::int AS total_customers
         FROM sales_order so
         LEFT JOIN sales_invoice si ON si.order_id = so.order_id
         WHERE so.branch_id = $1`,
        [branchId]
      )
    : await query(
        `SELECT
           COALESCE(SUM(total_amount),0)::numeric(12,2) AS total_sales,
           COUNT(*)::int AS total_orders,
           COUNT(DISTINCT mobile_no)::int AS total_customers
         FROM sales_invoice`
      );

  res.json({
    summary: summary.rows[0],
    branch_sales: branchSales.rows,
    product_sales_by_branch: productSales.rows
  });
});

export const stockReport = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       b.name as branch_name,
       it.name as product_name,
       it.barcode_no,
       pc.name as category,
       br.name as brand,
       i.stock_level,
       i.reorder_level,
       (i.stock_level * it.cost_price)::numeric(12,2) as stock_value
     FROM inventory i
     JOIN item it ON it.barcode_no = i.barcode_no
     JOIN branch b ON b.branch_id = i.branch_id
     LEFT JOIN product_category pc ON pc.category_id = it.category_id
     LEFT JOIN brand br ON br.brand_id = it.brand_id
     ${branchId ? "WHERE i.branch_id = $1" : ""}
     ORDER BY b.name, i.stock_level ASC`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});

export const inventoryValuation = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const { rows } = await query(
    `SELECT
       b.name as branch_name,
       COUNT(DISTINCT i.barcode_no)::int as unique_items,
       SUM(i.stock_level)::int as total_units,
       SUM(i.stock_level * it.cost_price)::numeric(12,2) as total_valuation
     FROM inventory i
     JOIN item it ON it.barcode_no = i.barcode_no
     JOIN branch b ON b.branch_id = i.branch_id
     ${branchId ? "WHERE i.branch_id = $1" : ""}
     GROUP BY b.branch_id, b.name`,
    branchId ? [branchId] : []
  );
  res.json(rows);
});
