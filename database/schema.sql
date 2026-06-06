-- ============================================================
-- VisionDesk - Supabase PostgreSQL schema
-- Login uses staff.login_id + password_hash, not email.
-- Roles: owner, branch_admin, staff.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('confirmed', 'processing', 'ready_for_pickup', 'delivered', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'branch_admin';
    ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'staff';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP PROCEDURE IF EXISTS sp_update_loyalty_tier(VARCHAR);

CREATE PROCEDURE sp_update_loyalty_tier(p_mobile VARCHAR)
AS $$
DECLARE
  tier_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text
  INTO tier_type
  FROM pg_attribute a
  WHERE a.attrelid = 'loyalty_program'::regclass
    AND a.attname = 'tier'
    AND NOT a.attisdropped;

  EXECUTE format(
    'UPDATE loyalty_program
     SET tier = (CASE
        WHEN (points_earned - points_redeemed) >= 5000 THEN ''platinum''
        WHEN (points_earned - points_redeemed) >= 2000 THEN ''gold''
        WHEN (points_earned - points_redeemed) >= 500 THEN ''silver''
        ELSE ''silver''
      END)::%s,
      last_updated = NOW()
     WHERE mobile_no = $1',
    tier_type
  )
  USING p_mobile;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS branch (
  branch_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  address TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(15),
  email VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE branch ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE branch ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE branch ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE branch ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE branch ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE branch ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE branch ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
ALTER TABLE branch ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE branch ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE branch ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE branch ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS branch_timestamp ON branch;
CREATE TRIGGER branch_timestamp BEFORE UPDATE ON branch FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS staff (
  staff_id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  login_id VARCHAR(80) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(15),
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'branch_admin', 'staff')),
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS login_id VARCHAR(80);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'staff';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
DECLARE
  staff_role_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text
  INTO staff_role_type
  FROM pg_attribute a
  WHERE a.attrelid = 'staff'::regclass
    AND a.attname = 'role'
    AND NOT a.attisdropped;

  EXECUTE format(
    'UPDATE staff
     SET role = (CASE
       WHEN lower(role::text) IN (''owner'', ''admin'') THEN ''owner''
       WHEN lower(role::text) IN (''branch_admin'', ''manager'') THEN ''branch_admin''
       ELSE ''staff''
     END)::%s',
    staff_role_type
  );
END $$;

UPDATE staff
SET login_id = COALESCE(NULLIF(split_part(email, '@', 1), ''), 'staff' || staff_id::text)
WHERE login_id IS NULL OR login_id = '';

WITH duplicate_logins AS (
  SELECT staff_id, login_id, ROW_NUMBER() OVER (PARTITION BY lower(login_id) ORDER BY staff_id) AS row_num
  FROM staff
)
UPDATE staff s
SET login_id = s.login_id || '_' || s.staff_id::text
FROM duplicate_logins d
WHERE s.staff_id = d.staff_id AND d.row_num > 1;

ALTER TABLE staff ALTER COLUMN login_id SET NOT NULL;

DROP TRIGGER IF EXISTS staff_timestamp ON staff;
CREATE TRIGGER staff_timestamp BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_login_id ON staff(login_id);
CREATE INDEX IF NOT EXISTS idx_staff_branch ON staff(branch_id);

CREATE TABLE IF NOT EXISTS customer (
  mobile_no VARCHAR(15) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  dob DATE,
  address TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gender VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INT REFERENCES staff(staff_id),
  updated_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer' AND column_name = 'mobile_number'
  ) THEN
    EXECUTE 'UPDATE customer SET mobile_no = mobile_number WHERE mobile_no IS NULL AND mobile_number IS NOT NULL';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer' AND column_name = 'customer_id'
  ) THEN
    EXECUTE 'UPDATE customer SET mobile_no = customer_id::text WHERE mobile_no IS NULL';
  END IF;
END $$;

WITH missing_customer_mobile AS (
  SELECT ctid, ROW_NUMBER() OVER () AS row_num
  FROM customer
  WHERE mobile_no IS NULL OR mobile_no = ''
)
UPDATE customer c
SET mobile_no = 'MIG' || LPAD(m.row_num::text, 12, '0')
FROM missing_customer_mobile m
WHERE c.ctid = m.ctid;

WITH duplicate_customer_mobile AS (
  SELECT ctid, mobile_no, ROW_NUMBER() OVER (PARTITION BY mobile_no ORDER BY ctid) AS row_num
  FROM customer
)
UPDATE customer c
SET mobile_no = LEFT(c.mobile_no, 10) || LPAD(d.row_num::text, 5, '0')
FROM duplicate_customer_mobile d
WHERE c.ctid = d.ctid AND d.row_num > 1;

ALTER TABLE customer ALTER COLUMN mobile_no SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_mobile_no_key' AND conrelid = 'customer'::regclass
  ) THEN
    ALTER TABLE customer ADD CONSTRAINT customer_mobile_no_key UNIQUE (mobile_no);
  END IF;
END $$;

ALTER TABLE customer ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE customer ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE customer ADD COLUMN IF NOT EXISTS created_by INT REFERENCES staff(staff_id);
ALTER TABLE customer ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES staff(staff_id);

DROP TRIGGER IF EXISTS customer_timestamp ON customer;
CREATE TRIGGER customer_timestamp BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_customer_email ON customer(email);
CREATE INDEX IF NOT EXISTS idx_customer_name_trgm ON customer USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS loyalty_program (
  mobile_no VARCHAR(15) PRIMARY KEY REFERENCES customer(mobile_no) ON DELETE CASCADE,
  points_earned INT NOT NULL DEFAULT 0,
  points_redeemed INT NOT NULL DEFAULT 0,
  tier VARCHAR(20) NOT NULL DEFAULT 'silver',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE loyalty_program ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
ALTER TABLE loyalty_program ADD COLUMN IF NOT EXISTS points_earned INT NOT NULL DEFAULT 0;
ALTER TABLE loyalty_program ADD COLUMN IF NOT EXISTS points_redeemed INT NOT NULL DEFAULT 0;
ALTER TABLE loyalty_program ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'silver';
ALTER TABLE loyalty_program ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loyalty_program' AND column_name = 'customer_id'
  ) THEN
    EXECUTE 'UPDATE loyalty_program SET mobile_no = customer_id::text WHERE mobile_no IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS loyalty_transaction (
  loyalty_txn_id BIGSERIAL PRIMARY KEY,
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no) ON DELETE CASCADE,
  txn_type VARCHAR(20) NOT NULL,
  points INT NOT NULL,
  reference_id VARCHAR(50),
  note TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE loyalty_transaction ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loyalty_transaction' AND column_name = 'customer_id'
  ) THEN
    EXECUTE 'UPDATE loyalty_transaction SET mobile_no = customer_id::text WHERE mobile_no IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS medical_history (
  record_id SERIAL PRIMARY KEY,
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no) ON DELETE CASCADE,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  examined_by INT REFERENCES staff(staff_id),
  left_eye_sph DECIMAL(5,2),
  left_eye_cyl DECIMAL(5,2),
  left_eye_axis SMALLINT,
  right_eye_sph DECIMAL(5,2),
  right_eye_cyl DECIMAL(5,2),
  right_eye_axis SMALLINT,
  ipd_near DECIMAL(4,1),
  ipd_far DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'medical_history' AND column_name = 'customer_id'
  ) THEN
    EXECUTE 'UPDATE medical_history SET mobile_no = customer_id::text WHERE mobile_no IS NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medical_history_mobile ON medical_history(mobile_no);

CREATE TABLE IF NOT EXISTS brand (
  brand_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_category (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS item (
  barcode_no VARCHAR(60) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('frame', 'lens')),
  category_id INT REFERENCES product_category(category_id),
  brand_id INT REFERENCES brand(brand_id),
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  hsn_code VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE item ADD COLUMN IF NOT EXISTS barcode_no VARCHAR(60);
ALTER TABLE item ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE item ADD COLUMN IF NOT EXISTS item_type VARCHAR(50);
ALTER TABLE item ADD COLUMN IF NOT EXISTS category_id INT REFERENCES product_category(category_id);
ALTER TABLE item ADD COLUMN IF NOT EXISTS brand_id INT REFERENCES brand(brand_id);
ALTER TABLE item ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE item ADD COLUMN IF NOT EXISTS sell_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE item ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00;
ALTER TABLE item ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE item ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE item ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE item ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS item_timestamp ON item;
CREATE TRIGGER item_timestamp BEFORE UPDATE ON item FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_item_category ON item(category_id);
CREATE INDEX IF NOT EXISTS idx_item_brand ON item(brand_id);
CREATE INDEX IF NOT EXISTS idx_item_name_trgm ON item USING GIN (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS frame_detail (
  barcode_no VARCHAR(60) PRIMARY KEY REFERENCES item(barcode_no) ON DELETE CASCADE,
  style VARCHAR(80),
  material VARCHAR(80),
  color VARCHAR(80),
  size VARCHAR(20)
);

ALTER TABLE frame_detail ADD COLUMN IF NOT EXISTS style VARCHAR(80);
ALTER TABLE frame_detail ADD COLUMN IF NOT EXISTS material VARCHAR(80);
ALTER TABLE frame_detail ADD COLUMN IF NOT EXISTS color VARCHAR(80);
ALTER TABLE frame_detail ADD COLUMN IF NOT EXISTS size VARCHAR(20);

CREATE TABLE IF NOT EXISTS lens_detail (
  barcode_no VARCHAR(60) PRIMARY KEY REFERENCES item(barcode_no) ON DELETE CASCADE,
  lens_type VARCHAR(80),
  coating VARCHAR(100),
  index_value DECIMAL(4,2),
  material VARCHAR(80)
);

ALTER TABLE lens_detail ADD COLUMN IF NOT EXISTS lens_type VARCHAR(80);
ALTER TABLE lens_detail ADD COLUMN IF NOT EXISTS coating VARCHAR(100);
ALTER TABLE lens_detail ADD COLUMN IF NOT EXISTS index_value DECIMAL(4,2);
ALTER TABLE lens_detail ADD COLUMN IF NOT EXISTS material VARCHAR(80);

CREATE TABLE IF NOT EXISTS inventory (
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  stock_level INT NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  reorder_level INT NOT NULL DEFAULT 5,
  location VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (branch_id, barcode_no)
);

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_level INT NOT NULL DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reorder_level INT NOT NULL DEFAULT 5;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS inventory_timestamp ON inventory;
CREATE TRIGGER inventory_timestamp BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TABLE IF NOT EXISTS stock_transaction (
  txn_id BIGSERIAL PRIMARY KEY,
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  quantity INT NOT NULL,
  txn_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(50),
  note TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branch(branch_id);
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS barcode_no VARCHAR(60) REFERENCES item(barcode_no);
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS txn_type VARCHAR(50);
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS reference_id VARCHAR(50);
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE stock_transaction ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_stxn_branch ON stock_transaction(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stxn_item ON stock_transaction(barcode_no);

CREATE TABLE IF NOT EXISTS supplier (
  supplier_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(100),
  contact_no VARCHAR(15),
  email VARCHAR(100),
  address TEXT,
  gstin VARCHAR(15),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplier ADD COLUMN IF NOT EXISTS contact_no VARCHAR(15);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplier' AND column_name = 'phone'
  ) THEN
    EXECUTE 'UPDATE supplier SET contact_no = phone WHERE contact_no IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS purchase_order (
  po_id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL REFERENCES supplier(supplier_id),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS purchase_order_item (
  po_item_id BIGSERIAL PRIMARY KEY,
  po_id INT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  received_qty INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_order (
  order_id SERIAL PRIMARY KEY,
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status order_status NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_by INT REFERENCES staff(staff_id),
  updated_by INT REFERENCES staff(staff_id),
  medical_history_id INT REFERENCES medical_history(record_id),
  lens_modification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branch(branch_id);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS order_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS status order_status NOT NULL DEFAULT 'confirmed';
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS created_by INT REFERENCES staff(staff_id);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_order' AND column_name = 'customer_id'
  ) THEN
    EXECUTE 'UPDATE sales_order SET mobile_no = customer_id::text WHERE mobile_no IS NULL';
  END IF;
END $$;
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES staff(staff_id);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS medical_history_id INT REFERENCES medical_history(record_id);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS lens_modification_notes TEXT;

ALTER TABLE sales_order ALTER COLUMN status DROP DEFAULT;
ALTER TABLE sales_order ALTER COLUMN status TYPE order_status USING (
  CASE
    WHEN lower(status::text) IN ('pending', 'confirmed') THEN 'confirmed'
    WHEN lower(status::text) IN ('in progress', 'in_progress', 'processing') THEN 'processing'
    WHEN lower(status::text) IN ('ready', 'ready for pickup', 'ready_for_pickup') THEN 'ready_for_pickup'
    WHEN lower(status::text) IN ('delivered', 'complete', 'completed') THEN 'delivered'
    WHEN lower(status::text) = 'cancelled' THEN 'cancelled'
    ELSE 'confirmed'
  END
)::order_status;
ALTER TABLE sales_order ALTER COLUMN status SET DEFAULT 'confirmed';

DROP TRIGGER IF EXISTS order_timestamp ON sales_order;
CREATE TRIGGER order_timestamp BEFORE UPDATE ON sales_order FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX IF NOT EXISTS idx_order_mobile ON sales_order(mobile_no);
CREATE INDEX IF NOT EXISTS idx_order_branch ON sales_order(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON sales_order(status);
CREATE INDEX IF NOT EXISTS idx_order_date ON sales_order(order_date DESC);

CREATE TABLE IF NOT EXISTS sales_invoice (
  invoice_no SERIAL PRIMARY KEY,
  order_id INT UNIQUE REFERENCES sales_order(order_id),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30),
  notes TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS order_id INT REFERENCES sales_order(order_id);
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branch(branch_id);
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS mobile_no VARCHAR(15);
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS invoice_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS created_by INT REFERENCES staff(staff_id);
ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_invoice_date ON sales_invoice(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_branch ON sales_invoice(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoice_mobile ON sales_invoice(mobile_no);

CREATE TABLE IF NOT EXISTS invoice_item (
  line_id BIGSERIAL PRIMARY KEY,
  invoice_no INT NOT NULL REFERENCES sales_invoice(invoice_no) ON DELETE CASCADE,
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  line_total DECIMAL(12,2) NOT NULL
);

ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS invoice_no INT REFERENCES sales_invoice(invoice_no) ON DELETE CASCADE;
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS barcode_no VARCHAR(60) REFERENCES item(barcode_no);
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00;
ALTER TABLE invoice_item ADD COLUMN IF NOT EXISTS line_total DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inv_item_invoice ON invoice_item(invoice_no);

CREATE UNIQUE INDEX IF NOT EXISTS idx_branch_name_unique ON branch(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_login_id_unique ON staff(login_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_mobile_unique ON customer(mobile_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_program_mobile_unique ON loyalty_program(mobile_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_name_unique ON brand(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_category_name_unique ON product_category(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_barcode_unique ON item(barcode_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_frame_detail_barcode_unique ON frame_detail(barcode_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lens_detail_barcode_unique ON lens_detail(barcode_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_branch_barcode_unique ON inventory(branch_id, barcode_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_invoice_order_unique ON sales_invoice(order_id);

INSERT INTO branch (name, address, address_line1, city, state, pincode)
SELECT 'Main Branch', '123 Main Street', '123 Main Street', 'Ahmedabad', 'Gujarat', '380001'
WHERE NOT EXISTS (SELECT 1 FROM branch WHERE name = 'Main Branch');

DO $$
DECLARE
  staff_role_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text
  INTO staff_role_type
  FROM pg_attribute a
  WHERE a.attrelid = 'staff'::regclass
    AND a.attname = 'role'
    AND NOT a.attisdropped;

  EXECUTE format(
    'INSERT INTO staff (branch_id, login_id, full_name, email, role, password_hash)
     SELECT branch_id, ''owner'', ''Store Owner'', ''owner@visiondesk.com'', ''owner''::%s, ''$plain$owner123''
     FROM branch
     WHERE name = ''Main Branch''
       AND NOT EXISTS (SELECT 1 FROM staff WHERE login_id = ''owner'')',
    staff_role_type
  );

  EXECUTE format(
    'INSERT INTO staff (branch_id, login_id, full_name, email, role, password_hash)
     SELECT branch_id, ''branchadmin'', ''Branch Admin'', ''branchadmin@visiondesk.com'', ''branch_admin''::%s, ''$plain$admin123''
     FROM branch
     WHERE name = ''Main Branch''
       AND NOT EXISTS (SELECT 1 FROM staff WHERE login_id = ''branchadmin'')',
    staff_role_type
  );

  EXECUTE format(
    'INSERT INTO staff (branch_id, login_id, full_name, email, role, password_hash)
     SELECT branch_id, ''staff'', ''Sales Staff'', ''staff@visiondesk.com'', ''staff''::%s, ''$plain$staff123''
     FROM branch
     WHERE name = ''Main Branch''
       AND NOT EXISTS (SELECT 1 FROM staff WHERE login_id = ''staff'')',
    staff_role_type
  );
END $$;

INSERT INTO brand (name)
SELECT value
FROM (VALUES
  ('Ray-Ban'), ('Titan'), ('Oakley'), ('Fastrack'), ('Essilor'),
  ('Hoya'), ('Crizal'), ('Zeiss'), ('Bausch & Lomb'), ('Johnson & Johnson')
) AS seed(value)
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE brand.name = seed.value);

INSERT INTO product_category (name)
SELECT value
FROM (VALUES
  ('Frame'), ('Lens'), ('Contact Lens'), ('Solution'), ('Accessories')
) AS seed(value)
WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE product_category.name = seed.value);

INSERT INTO customer (mobile_no, name, email, dob, address_line1, city, state, pincode, created_by)
SELECT seed.mobile_no, seed.name, seed.email, seed.dob::date, seed.address_line1, seed.city, seed.state, seed.pincode, s.staff_id
FROM (VALUES
  ('9876543210', 'Aarav Mehta', 'aarav.mehta@example.com', '1991-04-12', '14 Riverfront Road', 'Ahmedabad', 'Gujarat', '380009', 'staff'),
  ('9876543211', 'Nisha Patel', 'nisha.patel@example.com', '1988-11-03', '22 CG Road', 'Ahmedabad', 'Gujarat', '380006', 'branchadmin'),
  ('9876543212', 'Rohan Shah', 'rohan.shah@example.com', '1996-07-19', '7 Satellite Plaza', 'Ahmedabad', 'Gujarat', '380015', 'staff'),
  ('9876543213', 'Meera Iyer', 'meera.iyer@example.com', '1979-02-25', '41 Navrangpura', 'Ahmedabad', 'Gujarat', '380014', 'owner')
) AS seed(mobile_no, name, email, dob, address_line1, city, state, pincode, created_by_login)
LEFT JOIN staff s ON s.login_id = seed.created_by_login
ON CONFLICT (mobile_no) DO NOTHING;

INSERT INTO loyalty_program (mobile_no, points_earned, points_redeemed)
SELECT seed.mobile_no, seed.points_earned, seed.points_redeemed
FROM (VALUES
  ('9876543210', 320, 0),
  ('9876543211', 760, 120),
  ('9876543212', 145, 0),
  ('9876543213', 2260, 400)
) AS seed(mobile_no, points_earned, points_redeemed)
ON CONFLICT (mobile_no) DO NOTHING;

INSERT INTO medical_history (
  mobile_no, examined_by, left_eye_sph, left_eye_cyl, left_eye_axis,
  right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes
)
SELECT seed.mobile_no, s.staff_id, seed.left_eye_sph, seed.left_eye_cyl, seed.left_eye_axis,
       seed.right_eye_sph, seed.right_eye_cyl, seed.right_eye_axis, seed.ipd_near, seed.ipd_far, seed.notes
FROM (VALUES
  ('9876543210', 'staff', -1.25, -0.50, 90, -1.00, -0.25, 85, 58.0, 61.0, 'Single vision lenses with anti-glare coating'),
  ('9876543211', 'branchadmin', 0.75, -0.75, 110, 0.50, -0.50, 105, 57.5, 60.5, 'Progressive lens consultation'),
  ('9876543213', 'owner', -2.00, -1.00, 75, -1.75, -0.75, 80, 59.0, 62.0, 'Blue filter lens preference')
) AS seed(mobile_no, examined_by_login, left_eye_sph, left_eye_cyl, left_eye_axis, right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes)
LEFT JOIN staff s ON s.login_id = seed.examined_by_login
WHERE NOT EXISTS (
  SELECT 1 FROM medical_history mh
  WHERE mh.mobile_no = seed.mobile_no AND mh.notes = seed.notes
);

DO $$
DECLARE
  item_type_type TEXT;
BEGIN
  SELECT a.atttypid::regtype::text
  INTO item_type_type
  FROM pg_attribute a
  WHERE a.attrelid = 'item'::regclass
    AND a.attname = 'item_type'
    AND NOT a.attisdropped;

  EXECUTE format(
    'INSERT INTO item (barcode_no, name, item_type, category_id, brand_id, cost_price, sell_price, tax_rate, hsn_code)
     SELECT seed.barcode_no, seed.name, seed.item_type::%s,
            pc.category_id, br.brand_id, seed.cost_price, seed.sell_price, 18.00, seed.hsn_code
     FROM (VALUES
       (''VD-FR-1001'', ''Ray-Ban Clubmaster Frame'', ''frame'', ''Frame'', ''Ray-Ban'', 2200.00, 4299.00, ''90031100''),
       (''VD-FR-1002'', ''Titan Flex Rimless Frame'', ''frame'', ''Frame'', ''Titan'', 1800.00, 3499.00, ''90031100''),
       (''VD-LN-2001'', ''Essilor Single Vision Anti-Glare Lens'', ''lens'', ''Lens'', ''Essilor'', 900.00, 1899.00, ''90015000''),
       (''VD-LN-2002'', ''Zeiss Progressive Blue Filter Lens'', ''lens'', ''Lens'', ''Zeiss'', 2600.00, 5899.00, ''90015000'')
     ) AS seed(barcode_no, name, item_type, category_name, brand_name, cost_price, sell_price, hsn_code)
     JOIN product_category pc ON pc.name = seed.category_name
     JOIN brand br ON br.name = seed.brand_name
     ON CONFLICT (barcode_no) DO NOTHING',
    item_type_type
  );
END $$;

INSERT INTO inventory (branch_id, barcode_no, stock_level, reorder_level, location)
SELECT b.branch_id, seed.barcode_no, seed.stock_level, seed.reorder_level, seed.location
FROM branch b
CROSS JOIN (VALUES
  ('VD-FR-1001', 12, 4, 'Wall A1'),
  ('VD-FR-1002', 3, 5, 'Wall B2'),
  ('VD-LN-2001', 24, 8, 'Lens Drawer 1'),
  ('VD-LN-2002', 6, 5, 'Lens Drawer 2')
) AS seed(barcode_no, stock_level, reorder_level, location)
WHERE b.name = 'Main Branch'
ON CONFLICT (branch_id, barcode_no) DO NOTHING;

WITH demo_orders AS (
  INSERT INTO sales_order (mobile_no, branch_id, order_date, status, notes, created_by, medical_history_id, lens_modification_notes)
  SELECT seed.mobile_no, b.branch_id, seed.order_date::date, seed.status::order_status, seed.notes, s.staff_id, mh.record_id, seed.lens_notes
  FROM branch b
  JOIN (VALUES
    ('9876543210', CURRENT_DATE - INTERVAL '2 days', 'confirmed', 'Demo customer flow order - Aarav', 'Anti-glare lens fitting', 'staff'),
    ('9876543211', CURRENT_DATE - INTERVAL '1 day', 'processing', 'Demo customer flow order - Nisha', 'Progressive lens fitting', 'branchadmin'),
    ('9876543213', CURRENT_DATE, 'ready_for_pickup', 'Demo customer flow order - Meera', 'Blue filter lens remake', 'owner')
  ) AS seed(mobile_no, order_date, status, notes, lens_notes, created_by_login) ON TRUE
  LEFT JOIN staff s ON s.login_id = seed.created_by_login
  LEFT JOIN LATERAL (
    SELECT record_id FROM medical_history
    WHERE mobile_no = seed.mobile_no
    ORDER BY created_at DESC
    LIMIT 1
  ) mh ON TRUE
  WHERE b.name = 'Main Branch'
    AND NOT EXISTS (SELECT 1 FROM sales_order so WHERE so.notes = seed.notes)
  RETURNING order_id, mobile_no, branch_id, notes, created_by
),
demo_invoices AS (
  INSERT INTO sales_invoice (order_id, branch_id, mobile_no, invoice_date, subtotal, cgst_amount, sgst_amount, total_amount, notes, created_by)
  SELECT o.order_id, o.branch_id, o.mobile_no, CURRENT_DATE,
         CASE
           WHEN o.notes LIKE '%Aarav%' THEN 6198.00
           WHEN o.notes LIKE '%Nisha%' THEN 9398.00
           ELSE 10198.00
         END,
         CASE
           WHEN o.notes LIKE '%Aarav%' THEN 557.82
           WHEN o.notes LIKE '%Nisha%' THEN 845.82
           ELSE 917.82
         END,
         CASE
           WHEN o.notes LIKE '%Aarav%' THEN 557.82
           WHEN o.notes LIKE '%Nisha%' THEN 845.82
           ELSE 917.82
         END,
         CASE
           WHEN o.notes LIKE '%Aarav%' THEN 7313.64
           WHEN o.notes LIKE '%Nisha%' THEN 11089.64
           ELSE 12033.64
         END,
         'Demo invoice for customer flow',
         o.created_by
  FROM demo_orders o
  ON CONFLICT (order_id) DO NOTHING
  RETURNING invoice_no, order_id
)
INSERT INTO invoice_item (invoice_no, barcode_no, quantity, unit_price, discount_pct, tax_rate, line_total)
SELECT di.invoice_no, seed.barcode_no, seed.quantity, seed.unit_price, 0, 18.00, seed.line_total
FROM demo_invoices di
JOIN sales_order so ON so.order_id = di.order_id
JOIN (VALUES
  ('Demo customer flow order - Aarav', 'VD-FR-1001', 1, 4299.00, 5072.82),
  ('Demo customer flow order - Aarav', 'VD-LN-2001', 1, 1899.00, 2240.82),
  ('Demo customer flow order - Nisha', 'VD-FR-1002', 1, 3499.00, 4128.82),
  ('Demo customer flow order - Nisha', 'VD-LN-2002', 1, 5899.00, 6960.82),
  ('Demo customer flow order - Meera', 'VD-FR-1001', 1, 4299.00, 5072.82),
  ('Demo customer flow order - Meera', 'VD-LN-2002', 1, 5899.00, 6960.82)
) AS seed(order_notes, barcode_no, quantity, unit_price, line_total) ON seed.order_notes = so.notes;
