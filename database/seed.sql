-- ============================================================
-- VisionDesk - demo seed data
-- Run AFTER database/schema.sql. Safe to re-run (idempotent).
--
-- Layers a fuller, demo-ready dataset on top of the tiny set that
-- schema.sql already inserts:
--   * 3 branches, staff for each, across all three roles
--   * a broader catalog (frames, lenses, contact lenses, solution)
--   * per-branch inventory with some low-stock rows for reorder alerts
--   * customers across every loyalty tier (silver / gold / platinum)
--   * suppliers + a received purchase order
--   * expenses spread over recent weeks
--   * ~60 days of PAID sales invoices so dashboards & reports have trends
--
-- Login uses staff.login_id + password. Seeded passwords use the
-- '$plain$' dev convention (enable with ALLOW_PLAIN_SEEDED_PASSWORDS=true).
-- ============================================================

-- ------------------------------------------------------------
-- Branches (Main Branch already exists from schema.sql)
-- ------------------------------------------------------------
INSERT INTO branch (name, address, address_line1, city, state, pincode, phone, email)
SELECT * FROM (VALUES
  ('CG Road Branch',  '2nd Floor, CG Road',   '2nd Floor, CG Road',   'Ahmedabad', 'Gujarat', '380009', '07926401234', 'cgroad@visiondesk.com'),
  ('Surat Branch',    'Ring Road, Surat',     'Ring Road, Surat',     'Surat',     'Gujarat', '395002', '02612401234', 'surat@visiondesk.com')
) AS seed(name, address, address_line1, city, state, pincode, phone, email)
WHERE NOT EXISTS (SELECT 1 FROM branch b WHERE b.name = seed.name);

-- ------------------------------------------------------------
-- Staff for the new branches (owner/branchadmin/staff already exist)
-- ------------------------------------------------------------
DO $$
DECLARE
  staff_role_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text INTO staff_role_type
  FROM pg_attribute a
  WHERE a.attrelid = 'staff'::regclass AND a.attname = 'role' AND NOT a.attisdropped;

  EXECUTE format($f$
    INSERT INTO staff (branch_id, login_id, full_name, email, phone, role, password_hash)
    SELECT b.branch_id, seed.login_id, seed.full_name, seed.email, seed.phone, seed.role::%s, seed.pwd
    FROM (VALUES
      ('CG Road Branch', 'cgadmin',   'Priya Desai',    'priya.desai@visiondesk.com',  '9812000001', 'branch_admin', '$plain$admin123'),
      ('CG Road Branch', 'cgstaff',   'Karan Bhatt',    'karan.bhatt@visiondesk.com',  '9812000002', 'staff',        '$plain$staff123'),
      ('Surat Branch',   'suratadmin','Ritu Shah',      'ritu.shah@visiondesk.com',    '9812000003', 'branch_admin', '$plain$admin123'),
      ('Surat Branch',   'suratstaff','Dev Trivedi',    'dev.trivedi@visiondesk.com',  '9812000004', 'staff',        '$plain$staff123')
    ) AS seed(branch_name, login_id, full_name, email, phone, role, pwd)
    JOIN branch b ON b.name = seed.branch_name
    WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.login_id = seed.login_id)
  $f$, staff_role_type);
END $$;

-- ------------------------------------------------------------
-- Suppliers
-- ------------------------------------------------------------
INSERT INTO supplier (name, contact_name, contact_no, email, address, gstin)
SELECT * FROM (VALUES
  ('Luxottica Distributors', 'Amit Rao',   '9900011122', 'sales@luxdist.example.com',  'Mumbai, Maharashtra', '27ABCDE1234F1Z5'),
  ('Essilor India',          'Sneha Kulkarni', '9900033344', 'orders@essilor.example.com', 'Bengaluru, Karnataka','29PQRSX6789L2Z1'),
  ('Optic Wholesale Co',     'Vikas Jain', '9900055566', 'hello@opticwholesale.in',    'Delhi',               '07LMNOP4567Q3Z9')
) AS seed(name, contact_name, contact_no, email, address, gstin)
WHERE NOT EXISTS (SELECT 1 FROM supplier s WHERE s.name = seed.name);

-- ------------------------------------------------------------
-- Catalog: extra items (schema.sql seeds VD-FR-1001/1002, VD-LN-2001/2002)
-- ------------------------------------------------------------
DO $$
DECLARE
  item_type_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text INTO item_type_type
  FROM pg_attribute a
  WHERE a.attrelid = 'item'::regclass AND a.attname = 'item_type' AND NOT a.attisdropped;

  EXECUTE format($f$
    INSERT INTO item (barcode_no, name, item_type, category_id, brand_id, cost_price, sell_price, tax_rate, hsn_code)
    SELECT seed.barcode_no, seed.name, seed.item_type::%s, pc.category_id, br.brand_id,
           seed.cost_price, seed.sell_price, 18.00, seed.hsn_code
    FROM (VALUES
      ('VD-FR-1003', 'Oakley Holbrook Frame',            'frame', 'Frame',        'Oakley',            3200.00, 6499.00, '90031100'),
      ('VD-FR-1004', 'Fastrack Wayfarer Frame',          'frame', 'Frame',        'Fastrack',           900.00, 1799.00, '90031100'),
      ('VD-FR-1005', 'Ray-Ban Aviator Frame',            'frame', 'Frame',        'Ray-Ban',           2800.00, 5499.00, '90031100'),
      ('VD-LN-2003', 'Hoya Single Vision Lens',          'lens',  'Lens',         'Hoya',               750.00, 1599.00, '90015000'),
      ('VD-LN-2004', 'Crizal Anti-Glare Coating Lens',   'lens',  'Lens',         'Crizal',            1100.00, 2299.00, '90015000'),
      ('VD-CL-3001', 'Bausch & Lomb Monthly Contacts',   'lens',  'Contact Lens', 'Bausch & Lomb',      450.00,  999.00, '90013000'),
      ('VD-CL-3002', 'J&J Acuvue Daily Contacts (30)',   'lens',  'Contact Lens', 'Johnson & Johnson',  700.00, 1499.00, '90013000'),
      ('VD-SO-4001', 'Contact Lens Solution 360ml',      'lens',  'Solution',     'Bausch & Lomb',      120.00,  299.00, '34029099')
    ) AS seed(barcode_no, name, item_type, category_name, brand_name, cost_price, sell_price, hsn_code)
    JOIN product_category pc ON pc.name = seed.category_name
    JOIN brand br ON br.name = seed.brand_name
    ON CONFLICT (barcode_no) DO NOTHING
  $f$, item_type_type);
END $$;

-- Frame / lens detail rows for the new items
INSERT INTO frame_detail (barcode_no, style, material, color, size)
SELECT * FROM (VALUES
  ('VD-FR-1003', 'Rectangle',  'O-Matter',   'Matte Black', 'M'),
  ('VD-FR-1004', 'Wayfarer',   'Acetate',    'Tortoise',    'M'),
  ('VD-FR-1005', 'Aviator',    'Metal',      'Gold',        'L')
) AS seed(barcode_no, style, material, color, size)
WHERE EXISTS (SELECT 1 FROM item i WHERE i.barcode_no = seed.barcode_no)
ON CONFLICT (barcode_no) DO NOTHING;

INSERT INTO lens_detail (barcode_no, lens_type, coating, index_value, material)
SELECT * FROM (VALUES
  ('VD-LN-2003', 'Single Vision', 'Hard Coat',           1.50, 'CR-39'),
  ('VD-LN-2004', 'Single Vision', 'Anti-Glare',          1.56, 'CR-39'),
  ('VD-CL-3001', 'Monthly',       'UV Block',            NULL, 'Silicone Hydrogel'),
  ('VD-CL-3002', 'Daily',         'UV Block',            NULL, 'Etafilcon A')
) AS seed(barcode_no, lens_type, coating, index_value, material)
WHERE EXISTS (SELECT 1 FROM item i WHERE i.barcode_no = seed.barcode_no)
ON CONFLICT (barcode_no) DO NOTHING;

-- ------------------------------------------------------------
-- Inventory for every branch, every item (some rows deliberately low)
-- ------------------------------------------------------------
INSERT INTO inventory (branch_id, barcode_no, stock_level, reorder_level, location)
SELECT b.branch_id, i.barcode_no,
       -- deterministic pseudo-stock 0..29: a few land below reorder level on purpose
       (abs(hashtext(i.barcode_no || b.name)) % 30) AS stock_level,
       5 AS reorder_level,
       'Store' AS location
FROM branch b
CROSS JOIN item i
ON CONFLICT (branch_id, barcode_no) DO NOTHING;

-- ------------------------------------------------------------
-- Customers across loyalty tiers (schema.sql seeds 4 already)
-- ------------------------------------------------------------
INSERT INTO customer (mobile_no, name, email, dob, address_line1, city, state, pincode, gender, created_by)
SELECT seed.mobile_no, seed.name, seed.email, seed.dob::date, seed.address_line1,
       seed.city, seed.state, seed.pincode, seed.gender::gender_type, s.staff_id
FROM (VALUES
  ('9820011001', 'Vivaan Kapoor',  'vivaan.kapoor@example.com',  '1985-06-14', '10 Prahladnagar', 'Ahmedabad', 'Gujarat', '380015', 'male',   'owner'),
  ('9820011002', 'Ananya Reddy',   'ananya.reddy@example.com',   '1993-09-22', '5 Vesu',          'Surat',     'Gujarat', '395007', 'female', 'suratadmin'),
  ('9820011003', 'Kabir Malhotra', 'kabir.malhotra@example.com', '1978-01-30', '18 Adajan',       'Surat',     'Gujarat', '395009', 'male',   'suratstaff'),
  ('9820011004', 'Diya Nair',      'diya.nair@example.com',      '2000-12-05', '3 Bodakdev',      'Ahmedabad', 'Gujarat', '380054', 'female', 'cgadmin'),
  ('9820011005', 'Arjun Sharma',   'arjun.sharma@example.com',   '1990-03-17', '9 Maninagar',     'Ahmedabad', 'Gujarat', '380008', 'male',   'cgstaff'),
  ('9820011006', 'Ishita Verma',   'ishita.verma@example.com',   '1996-08-08', '27 Athwa',        'Surat',     'Gujarat', '395001', 'female', 'staff')
) AS seed(mobile_no, name, email, dob, address_line1, city, state, pincode, gender, created_by_login)
LEFT JOIN staff s ON s.login_id = seed.created_by_login
ON CONFLICT (mobile_no) DO NOTHING;

-- Loyalty balances chosen to land in each tier via sp_update_loyalty_tier:
--   >=5000 platinum, >=2000 gold, else silver
INSERT INTO loyalty_program (mobile_no, points_earned, points_redeemed)
SELECT * FROM (VALUES
  ('9820011001', 6200, 300),   -- platinum
  ('9820011002', 2450, 100),   -- gold
  ('9820011003',  380,   0),   -- silver
  ('9820011004', 5100, 900),   -- platinum (net 4200 -> gold; bumped below)
  ('9820011005', 1200, 200),   -- silver
  ('9820011006', 2900, 400)    -- gold
) AS seed(mobile_no, points_earned, points_redeemed)
ON CONFLICT (mobile_no) DO NOTHING;

-- Recompute tiers for all seeded loyalty rows
DO $$
DECLARE m VARCHAR;
BEGIN
  FOR m IN SELECT mobile_no FROM loyalty_program LOOP
    CALL sp_update_loyalty_tier(m);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- A received purchase order (procurement history)
-- ------------------------------------------------------------
WITH po AS (
  INSERT INTO purchase_order (supplier_id, branch_id, order_date, status, total_amount, created_by)
  SELECT sp.supplier_id, b.branch_id, CURRENT_DATE - INTERVAL '20 days', 'received', 96000.00, st.staff_id
  FROM supplier sp
  JOIN branch b   ON b.name = 'Main Branch'
  JOIN staff  st  ON st.login_id = 'owner'
  WHERE sp.name = 'Luxottica Distributors'
    AND NOT EXISTS (
      SELECT 1 FROM purchase_order p
      JOIN supplier s2 ON s2.supplier_id = p.supplier_id
      WHERE s2.name = 'Luxottica Distributors' AND p.total_amount = 96000.00
    )
  RETURNING po_id
)
INSERT INTO purchase_order_item (po_id, barcode_no, quantity, unit_price, received_qty)
SELECT po.po_id, seed.barcode_no, seed.quantity, seed.unit_price, seed.quantity
FROM po
JOIN (VALUES
  ('VD-FR-1005', 20, 2800.00),
  ('VD-FR-1003', 10, 3200.00)
) AS seed(barcode_no, quantity, unit_price) ON TRUE;

-- ------------------------------------------------------------
-- Expenses across branches and recent weeks
-- ------------------------------------------------------------
INSERT INTO expense (branch_id, category, amount, description, expense_date, paid_to, payment_method, created_by)
SELECT b.branch_id, seed.category, seed.amount, seed.description,
       (CURRENT_DATE - (seed.days_ago || ' days')::interval)::date,
       seed.paid_to, seed.payment_method::payment_method, st.staff_id
FROM (VALUES
  ('Main Branch',   'Rent',       45000.00, 'Monthly shop rent',        30, 'Landlord',        'card'),
  ('Main Branch',   'Utilities',   6200.00, 'Electricity bill',         12, 'Torrent Power',   'upi'),
  ('CG Road Branch','Rent',       52000.00, 'Monthly shop rent',        28, 'Landlord',        'card'),
  ('CG Road Branch','Marketing',  15000.00, 'Local hoarding ad',        18, 'AdWorks',         'upi'),
  ('Surat Branch',  'Rent',       38000.00, 'Monthly shop rent',        26, 'Landlord',        'card'),
  ('Surat Branch',  'Supplies',    4300.00, 'Cleaning & packaging',      7, 'Metro Cash',      'cash')
) AS seed(branch_name, category, amount, description, days_ago, paid_to, payment_method)
JOIN branch b ON b.name = seed.branch_name
JOIN staff st ON st.login_id = 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM expense e
  WHERE e.description = seed.description AND e.amount = seed.amount
);

-- ------------------------------------------------------------
-- ~60 days of PAID sales invoices so dashboards & reports show trends.
-- Each iteration builds a full order -> invoice -> line item chain and
-- marks it paid, cycling customers / items / branches deterministically.
-- Guarded by a marker note so re-running does not duplicate history.
-- ------------------------------------------------------------
DO $$
DECLARE
  d            INT;
  v_branch     INT;
  v_staff      INT;
  v_mobile     VARCHAR;
  v_frame      VARCHAR;
  v_lens       VARCHAR;
  v_frame_px   NUMERIC;
  v_lens_px    NUMERIC;
  v_subtotal   NUMERIC;
  v_tax        NUMERIC;
  v_half       NUMERIC;
  v_total      NUMERIC;
  v_order      INT;
  v_invoice    INT;
  v_pay        TEXT;
  branch_ids   INT[];
  staff_ids    INT[];
  mobiles      VARCHAR[];
  frames       VARCHAR[] := ARRAY['VD-FR-1001','VD-FR-1002','VD-FR-1003','VD-FR-1004','VD-FR-1005'];
  lenses       VARCHAR[] := ARRAY['VD-LN-2001','VD-LN-2002','VD-LN-2003','VD-LN-2004'];
  pays         TEXT[]    := ARRAY['cash','card','upi'];
BEGIN
  -- Skip entirely if history was already seeded.
  IF EXISTS (SELECT 1 FROM sales_invoice WHERE notes = 'SEED-HIST') THEN
    RAISE NOTICE 'Historical invoices already seeded; skipping.';
    RETURN;
  END IF;

  SELECT array_agg(branch_id ORDER BY branch_id) INTO branch_ids FROM branch;
  SELECT array_agg(staff_id  ORDER BY staff_id)  INTO staff_ids  FROM staff;
  SELECT array_agg(mobile_no ORDER BY mobile_no) INTO mobiles    FROM customer;

  FOR d IN 0..59 LOOP
    v_branch := branch_ids[(d % array_length(branch_ids,1)) + 1];
    v_staff  := staff_ids[(d % array_length(staff_ids,1)) + 1];
    v_mobile := mobiles[(d % array_length(mobiles,1)) + 1];
    v_frame  := frames[(d % array_length(frames,1)) + 1];
    v_lens   := lenses[(d % array_length(lenses,1)) + 1];
    v_pay    := pays[(d % array_length(pays,1)) + 1];

    SELECT sell_price INTO v_frame_px FROM item WHERE barcode_no = v_frame;
    SELECT sell_price INTO v_lens_px  FROM item WHERE barcode_no = v_lens;

    v_subtotal := v_frame_px + v_lens_px;
    v_tax      := round(v_subtotal * 0.18, 2);
    v_half     := round(v_tax / 2, 2);
    v_total    := v_subtotal + v_tax;

    INSERT INTO sales_order (mobile_no, branch_id, order_date, status, notes, created_by)
    VALUES (v_mobile, v_branch, (CURRENT_DATE - (d || ' days')::interval)::date,
            'delivered', 'SEED-HIST', v_staff)
    RETURNING order_id INTO v_order;

    INSERT INTO sales_invoice (order_id, branch_id, mobile_no, invoice_date, subtotal,
                               cgst_amount, sgst_amount, total_amount, payment_status,
                               payment_method, notes, created_by)
    VALUES (v_order, v_branch, v_mobile, (CURRENT_DATE - (d || ' days')::interval)::date,
            v_subtotal, v_half, v_half, v_total, 'paid', v_pay::payment_method, 'SEED-HIST', v_staff)
    RETURNING invoice_no INTO v_invoice;

    INSERT INTO invoice_item (invoice_no, barcode_no, quantity, unit_price, tax_rate, line_total)
    VALUES
      (v_invoice, v_frame, 1, v_frame_px, 18.00, round(v_frame_px * 1.18, 2)),
      (v_invoice, v_lens,  1, v_lens_px,  18.00, round(v_lens_px  * 1.18, 2));
  END LOOP;

  RAISE NOTICE 'Seeded 60 historical paid invoices.';
END $$;

-- ============================================================
-- Done. Log in as owner / owner123 to see cross-branch data,
-- or branchadmin / admin123 to see a single branch.
-- ============================================================
