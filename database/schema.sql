-- ============================================================
--  VisionDesk — Optical Store Management System Schema
--  Production-ready PostgreSQL schema for Supabase
--  Tables: branch, staff, customer, item, inventory, orders, invoices, suppliers
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
--  CORE TABLES
-- ============================================================

-- Branch/Location
CREATE TABLE IF NOT EXISTS branch (
  branch_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(15),
  email VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER branch_timestamp BEFORE UPDATE ON branch FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Staff/Users (all roles: admin, manager, optometrist, sales_staff, inventory_staff)
CREATE TABLE IF NOT EXISTS staff (
  staff_id SERIAL PRIMARY KEY,
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15),
  role VARCHAR(50) NOT NULL DEFAULT 'sales_staff',
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER staff_timestamp BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_branch ON staff(branch_id);

-- Customers
CREATE TABLE IF NOT EXISTS customer (
  mobile_no VARCHAR(15) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  dob DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  gender VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  loyalty_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER customer_timestamp BEFORE UPDATE ON customer FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_name_trgm ON customer USING GIN (name gin_trgm_ops);

-- Medical/Prescription records
CREATE TABLE IF NOT EXISTS medical_record (
  record_id SERIAL PRIMARY KEY,
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no),
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  examined_by INT REFERENCES staff(staff_id),
  left_sph DECIMAL(5,2),
  left_cyl DECIMAL(5,2),
  left_axis SMALLINT,
  right_sph DECIMAL(5,2),
  right_cyl DECIMAL(5,2),
  right_axis SMALLINT,
  ipd DECIMAL(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_mobile ON medical_record(mobile_no);

-- Brand master
CREATE TABLE IF NOT EXISTS brand (
  brand_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Product category
CREATE TABLE IF NOT EXISTS product_category (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Item/Product (frames, lenses, accessories, solutions)
CREATE TABLE IF NOT EXISTS item (
  barcode_no VARCHAR(60) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
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

CREATE TRIGGER item_timestamp BEFORE UPDATE ON item FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX idx_item_category ON item(category_id);
CREATE INDEX idx_item_brand ON item(brand_id);
CREATE INDEX idx_item_name_trgm ON item USING GIN (name gin_trgm_ops);

-- Frame-specific details
CREATE TABLE IF NOT EXISTS frame_detail (
  barcode_no VARCHAR(60) PRIMARY KEY REFERENCES item(barcode_no) ON DELETE CASCADE,
  style VARCHAR(80),
  material VARCHAR(80),
  color VARCHAR(80),
  size VARCHAR(20)
);

-- Lens-specific details
CREATE TABLE IF NOT EXISTS lens_detail (
  barcode_no VARCHAR(60) PRIMARY KEY REFERENCES item(barcode_no) ON DELETE CASCADE,
  lens_type VARCHAR(80),
  coating VARCHAR(100),
  index_value DECIMAL(4,2),
  material VARCHAR(80)
);

-- Inventory (stock per branch)
CREATE TABLE IF NOT EXISTS inventory (
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  stock_level INT NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  reorder_level INT NOT NULL DEFAULT 5,
  location VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (branch_id, barcode_no)
);

CREATE TRIGGER inventory_timestamp BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX idx_inventory_low ON inventory(branch_id, barcode_no) WHERE stock_level <= reorder_level;

-- Stock transactions (full audit trail)
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

CREATE INDEX idx_stxn_branch ON stock_transaction(branch_id, created_at DESC);
CREATE INDEX idx_stxn_item ON stock_transaction(barcode_no);

-- Supplier
CREATE TABLE IF NOT EXISTS supplier (
  supplier_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(100),
  phone VARCHAR(15),
  email VARCHAR(100),
  address TEXT,
  gstin VARCHAR(15),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supply/Purchase records
CREATE TABLE IF NOT EXISTS supply (
  supply_id SERIAL PRIMARY KEY,
  supplier_id INT NOT NULL REFERENCES supplier(supplier_id),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  barcode_no VARCHAR(60) NOT NULL REFERENCES item(barcode_no),
  quantity INT NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  supply_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supply_supplier ON supply(supplier_id);
CREATE INDEX idx_supply_branch ON supply(branch_id);
CREATE INDEX idx_supply_date ON supply(supply_date DESC);

-- Sales Order
CREATE TABLE IF NOT EXISTS sales_order (
  order_id SERIAL PRIMARY KEY,
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER order_timestamp BEFORE UPDATE ON sales_order FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE INDEX idx_order_mobile ON sales_order(mobile_no);
CREATE INDEX idx_order_branch ON sales_order(branch_id);
CREATE INDEX idx_order_status ON sales_order(status);
CREATE INDEX idx_order_date ON sales_order(order_date DESC);

-- Sales Invoice
CREATE TABLE IF NOT EXISTS sales_invoice (
  invoice_no SERIAL PRIMARY KEY,
  order_id INT UNIQUE REFERENCES sales_order(order_id),
  branch_id INT NOT NULL REFERENCES branch(branch_id),
  mobile_no VARCHAR(15) NOT NULL REFERENCES customer(mobile_no),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by INT REFERENCES staff(staff_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_date ON sales_invoice(invoice_date DESC);
CREATE INDEX idx_invoice_branch ON sales_invoice(branch_id);
CREATE INDEX idx_invoice_mobile ON sales_invoice(mobile_no);

-- Invoice line items
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

CREATE INDEX idx_inv_item_invoice ON invoice_item(invoice_no);

-- ============================================================
--  SEED DATA — REFERENCE LOOKUPS
-- ============================================================

INSERT INTO branch (name, address, city, state, pincode) 
VALUES ('Main Branch', '123 Main Street', 'Ahmedabad', 'Gujarat', '380001')
ON CONFLICT (name) DO NOTHING;

INSERT INTO brand (name) VALUES
  ('Ray-Ban'), ('Titan'), ('Oakley'), ('Fastrack'), ('Essilor'),
  ('Hoya'), ('Crizal'), ('Zeiss'), ('Bausch & Lomb'), ('Johnson & Johnson')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_category (name) VALUES
  ('Frame'), ('Lens'), ('Contact Lens'), ('Solution'), ('Accessories')
ON CONFLICT (name) DO NOTHING;
