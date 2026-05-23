import { supabasePool as pool, supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPagination } from "../utils/pagination.js";

const toDbType = (value) => value === "Frame" ? "frame" : "lens";

const productSelect = `
  SELECT
    it.barcode_no AS item_id,
    it.barcode_no AS sku,
    it.barcode_no AS barcode,
    CASE WHEN it.item_type = 'frame' THEN 'Frame' ELSE 'Lens' END AS item_type,
    it.name,
    pc.name AS category,
    br.name AS brand,
    fd.color,
    it.sell_price AS price,
    COALESCE(inv.reorder_level, 5) AS reorder_level,
    fd.style AS frame_shape,
    fd.material AS frame_material,
    ld.lens_type,
    concat_ws(' ', ld.index_value, ld.material) AS lens_power,
    it.created_at,
    it.updated_at
  FROM item it
  LEFT JOIN product_category pc ON pc.category_id = it.category_id
  LEFT JOIN brand br ON br.brand_id = it.brand_id
  LEFT JOIN frame_detail fd ON fd.barcode_no = it.barcode_no
  LEFT JOIN lens_detail ld ON ld.barcode_no = it.barcode_no
  LEFT JOIN LATERAL (
    SELECT reorder_level FROM inventory WHERE barcode_no = it.barcode_no LIMIT 1
  ) inv ON TRUE
`;

const ensureCategory = async (client, name) => {
  const { rows } = await client.query(
    `INSERT INTO product_category (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING category_id`,
    [name]
  );
  return rows[0].category_id;
};

const ensureBrand = async (client, name) => {
  const { rows } = await client.query(
    `INSERT INTO brand (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING brand_id`,
    [name]
  );
  return rows[0].brand_id;
};

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const search = `%${req.query.search || ""}%`;
  const { rows } = await query(
    `${productSelect}
     WHERE it.name ILIKE $1 OR br.name ILIKE $1 OR it.barcode_no ILIKE $1
     ORDER BY it.created_at DESC LIMIT $2 OFFSET $3`,
    [search, limit, offset]
  );
  res.json({ data: rows, page, limit });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { item_type, name, sku, barcode, category, brand, color, price, reorder_level, frame_shape, frame_material, lens_type, lens_power } = req.body;
  const barcodeNo = barcode || sku;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const categoryId = await ensureCategory(client, category);
    const brandId = await ensureBrand(client, brand);

    const item = await client.query(
      `INSERT INTO item (barcode_no,item_type,name,category_id,brand_id,sell_price)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING barcode_no AS item_id, barcode_no AS sku, barcode_no AS barcode, *, sell_price AS price`,
      [barcodeNo, toDbType(item_type), name, categoryId, brandId, price]
    );

    if (item_type === "Frame") {
      await client.query(
        `INSERT INTO frame_detail (barcode_no, style, material, color)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (barcode_no) DO UPDATE SET style=$2, material=$3, color=$4`,
        [barcodeNo, frame_shape, frame_material, color]
      );
    } else {
      await client.query(
        `INSERT INTO lens_detail (barcode_no, lens_type, material)
         VALUES ($1,$2,$3)
         ON CONFLICT (barcode_no) DO UPDATE SET lens_type=$2, material=$3`,
        [barcodeNo, lens_type, lens_power]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...item.rows[0], item_id: barcodeNo, sku: barcodeNo, barcode: barcodeNo, price });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { item_type, name, sku, barcode, category, brand, color, price, frame_shape, frame_material, lens_type, lens_power } = req.body;
  const barcodeNo = barcode || sku || req.params.id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const categoryId = await ensureCategory(client, category);
    const brandId = await ensureBrand(client, brand);

    const { rows } = await client.query(
      `UPDATE item
       SET barcode_no=$1,item_type=$2,name=$3,category_id=$4,brand_id=$5,sell_price=$6,updated_at=NOW()
       WHERE barcode_no=$7
       RETURNING barcode_no AS item_id, barcode_no AS sku, barcode_no AS barcode, *, sell_price AS price`,
      [barcodeNo, toDbType(item_type), name, categoryId, brandId, price, req.params.id]
    );

    if (item_type === "Frame") {
      await client.query(
        `INSERT INTO frame_detail (barcode_no, style, material, color)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (barcode_no) DO UPDATE SET style=$2, material=$3, color=$4`,
        [barcodeNo, frame_shape, frame_material, color]
      );
    } else {
      await client.query(
        `INSERT INTO lens_detail (barcode_no, lens_type, material)
         VALUES ($1,$2,$3)
         ON CONFLICT (barcode_no) DO UPDATE SET lens_type=$2, material=$3`,
        [barcodeNo, lens_type, lens_power]
      );
    }

    await client.query("COMMIT");
    res.json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await query("DELETE FROM item WHERE barcode_no=$1", [req.params.id]);
  res.status(204).send();
});
