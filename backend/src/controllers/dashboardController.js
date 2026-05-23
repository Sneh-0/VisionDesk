import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { branchScope } from "../utils/roles.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const branchId = branchScope(req.user);
  const branchParams = branchId ? [branchId] : [];

  const [sales, customers, pending, lowStock, chart, recentOrders, topProducts] = await Promise.all([
    branchId
      ? query(
          `SELECT COALESCE(SUM(si.total_amount),0)::numeric(12,2) AS total
           FROM sales_invoice si
           JOIN sales_order so ON so.order_id=si.order_id
           WHERE si.invoice_date::date = CURRENT_DATE AND so.branch_id = $1`,
          branchParams
        )
      : query("SELECT COALESCE(SUM(total_amount),0)::numeric(12,2) AS total FROM sales_invoice WHERE invoice_date::date = CURRENT_DATE"),
    branchId
      ? query(
          `SELECT COUNT(DISTINCT so.mobile_no)::int AS total
           FROM sales_order so
           WHERE so.branch_id = $1`,
          branchParams
        )
      : query("SELECT COUNT(*)::int AS total FROM customer"),
    branchId
      ? query(
          `SELECT COUNT(*)::int AS total
           FROM sales_order
           WHERE status IN ('confirmed','processing') AND branch_id = $1`,
          branchParams
        )
      : query("SELECT COUNT(*)::int AS total FROM sales_order WHERE status IN ('confirmed','processing')"),
    branchId
      ? query(
          `SELECT
             (i.branch_id::text || ':' || i.barcode_no) AS inventory_id,
             it.name,
             b.name AS branch_name,
             i.stock_level AS quantity,
             i.reorder_level
             FROM inventory i
             JOIN item it ON it.barcode_no=i.barcode_no
             JOIN branch b ON b.branch_id=i.branch_id
             WHERE i.stock_level <= i.reorder_level AND i.branch_id = $1
             ORDER BY i.stock_level ASC LIMIT 8`,
          branchParams
        )
      : query(`SELECT
             (i.branch_id::text || ':' || i.barcode_no) AS inventory_id,
             it.name,
             b.name AS branch_name,
             i.stock_level AS quantity,
             i.reorder_level
           FROM inventory i
           JOIN item it ON it.barcode_no=i.barcode_no
           JOIN branch b ON b.branch_id=i.branch_id
           WHERE i.stock_level <= i.reorder_level
           ORDER BY i.stock_level ASC LIMIT 8`),
    branchId
      ? query(
          `SELECT to_char(day, 'Dy') AS label,
                  COALESCE(SUM(CASE WHEN so.branch_id = $1 THEN si.total_amount ELSE 0 END),0)::numeric(12,2) AS sales
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
           LEFT JOIN sales_invoice si ON si.invoice_date::date = day::date
           LEFT JOIN sales_order so ON so.order_id = si.order_id
           GROUP BY day ORDER BY day`,
          branchParams
        )
      : query(`SELECT to_char(day, 'Dy') AS label, COALESCE(SUM(si.total_amount),0)::numeric(12,2) AS sales
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
           LEFT JOIN sales_invoice si ON si.invoice_date::date = day::date
           GROUP BY day ORDER BY day`),
    branchId
      ? query(`SELECT
             so.order_id,
             c.name AS customer_name,
             b.name AS branch_name,
             CASE so.status
               WHEN 'confirmed' THEN 'Pending'
               WHEN 'processing' THEN 'In Progress'
               WHEN 'ready_for_pickup' THEN 'Ready'
               WHEN 'delivered' THEN 'Delivered'
               ELSE initcap(replace(so.status::text, '_', ' '))
             END AS status,
             COALESCE(si.total_amount, 0) AS total_amount,
             so.created_at
           FROM sales_order so
           JOIN customer c ON c.mobile_no=so.mobile_no
           JOIN branch b ON b.branch_id=so.branch_id
           LEFT JOIN sales_invoice si ON si.order_id=so.order_id
           WHERE so.branch_id = $1
           ORDER BY so.created_at DESC LIMIT 6`, branchParams)
      : query(`SELECT
             so.order_id,
             c.name AS customer_name,
             b.name AS branch_name,
             CASE so.status
               WHEN 'confirmed' THEN 'Pending'
               WHEN 'processing' THEN 'In Progress'
               WHEN 'ready_for_pickup' THEN 'Ready'
               WHEN 'delivered' THEN 'Delivered'
               ELSE initcap(replace(so.status::text, '_', ' '))
             END AS status,
             COALESCE(si.total_amount, 0) AS total_amount,
             so.created_at
           FROM sales_order so
           JOIN customer c ON c.mobile_no=so.mobile_no
           JOIN branch b ON b.branch_id=so.branch_id
           LEFT JOIN sales_invoice si ON si.order_id=so.order_id
           ORDER BY so.created_at DESC LIMIT 6`),
    branchId
      ? query(`SELECT it.name, SUM(ii.quantity)::int AS units, SUM(ii.line_total)::numeric(12,2) AS revenue
           FROM invoice_item ii
           JOIN item it ON it.barcode_no=ii.barcode_no
           JOIN sales_invoice si ON si.invoice_no=ii.invoice_no
           JOIN sales_order so ON so.order_id=si.order_id
           WHERE so.branch_id = $1
           GROUP BY it.barcode_no, it.name
           ORDER BY units DESC LIMIT 5`, branchParams)
      : query(`SELECT it.name, SUM(ii.quantity)::int AS units, SUM(ii.line_total)::numeric(12,2) AS revenue
           FROM invoice_item ii
           JOIN item it ON it.barcode_no=ii.barcode_no
           GROUP BY it.barcode_no, it.name
           ORDER BY units DESC LIMIT 5`)
  ]);

  res.json({
    cards: {
      total_sales_today: sales.rows[0].total,
      total_customers: customers.rows[0].total,
      pending_orders: pending.rows[0].total,
      low_stock_alerts: lowStock.rowCount
    },
    low_stock: lowStock.rows,
    sales_chart: chart.rows,
    recent_orders: recentOrders.rows,
    top_products: topProducts.rows
  });
});

export const getOwnerDashboard = asyncHandler(async (req, res) => {
  const [branchPerformance, lowStockAcrossBranches, recentGlobalOrders] = await Promise.all([
    query(
      `SELECT
         b.branch_id,
         b.name as branch_name,
         COALESCE(SUM(si.total_amount), 0)::numeric(12,2) as total_sales,
         COUNT(DISTINCT so.order_id)::int as order_count,
         COUNT(DISTINCT so.mobile_no)::int as customer_count
       FROM branch b
       LEFT JOIN sales_order so ON so.branch_id = b.branch_id
       LEFT JOIN sales_invoice si ON si.order_id = so.order_id
       GROUP BY b.branch_id, b.name
       ORDER BY total_sales DESC`
    ),
    query(
      `SELECT
         b.name as branch_name,
         it.name as item_name,
         i.stock_level,
         i.reorder_level
       FROM inventory i
       JOIN item it ON it.barcode_no = i.barcode_no
       JOIN branch b ON b.branch_id = i.branch_id
       WHERE i.stock_level <= i.reorder_level
       ORDER BY i.stock_level ASC LIMIT 10`
    ),
    query(
      `SELECT
         so.order_id,
         c.name as customer_name,
         b.name as branch_name,
         so.status,
         COALESCE(si.total_amount, 0) as total_amount,
         so.created_at
       FROM sales_order so
       JOIN customer c ON c.mobile_no = so.mobile_no
       JOIN branch b ON b.branch_id = so.branch_id
       LEFT JOIN sales_invoice si ON si.order_id = so.order_id
       ORDER BY so.created_at DESC LIMIT 10`
    )
  ]);

  const totalStats = await query(
    `SELECT
       COALESCE(SUM(total_amount), 0)::numeric(12,2) as total_revenue,
       COUNT(*)::int as total_orders
     FROM sales_invoice`
  );

  res.json({
    stats: totalStats.rows[0],
    branch_performance: branchPerformance.rows,
    low_stock: lowStockAcrossBranches.rows,
    recent_orders: recentGlobalOrders.rows
  });
});
