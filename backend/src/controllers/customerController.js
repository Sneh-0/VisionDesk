import { supabaseQuery as query } from "../config/supabase.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPagination } from "../utils/pagination.js";

const customerSelect = `
  SELECT
    c.mobile_no AS customer_id,
    c.mobile_no AS mobile_number,
    c.mobile_no,
    c.name,
    c.email,
    concat_ws(', ', c.address_line1, c.address_line2) AS address,
    COALESCE(lp.points_earned - lp.points_redeemed, 0) AS loyalty_points,
    c.created_at,
    c.updated_at
  FROM customer c
  LEFT JOIN loyalty_program lp ON lp.mobile_no = c.mobile_no
`;

export const listCustomers = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const search = `%${req.query.search || ""}%`;
  const { rows } = await query(
    `${customerSelect}
     WHERE c.name ILIKE $1 OR c.mobile_no ILIKE $1 OR c.email ILIKE $1
     ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
    [search, limit, offset]
  );
  res.json({ data: rows, page, limit });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, mobile_number, email, address, loyalty_points } = req.body;
  const { rows } = await query(
    `WITH created AS (
       INSERT INTO customer (mobile_no, name, email, address_line1, created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *
     ),
     loyalty AS (
       INSERT INTO loyalty_program (mobile_no, points_earned)
       SELECT mobile_no, $6 FROM created
       ON CONFLICT (mobile_no) DO NOTHING
     )
     SELECT
       created.mobile_no AS customer_id,
       created.mobile_no AS mobile_number,
       created.*,
       $6::int AS loyalty_points
     FROM created`,
    [mobile_number, name, email, address, req.user?.staff_id || null, loyalty_points || 0]
  );
  res.status(201).json(rows[0]);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { name, mobile_number, email, address, loyalty_points } = req.body;
  const { rows } = await query(
    `WITH updated AS (
       UPDATE customer
       SET mobile_no=$1, name=$2, email=$3, address_line1=$4, updated_at=NOW()
       WHERE mobile_no=$5
       RETURNING *
     ),
     loyalty AS (
       INSERT INTO loyalty_program (mobile_no, points_earned)
       SELECT mobile_no, $6 FROM updated
       ON CONFLICT (mobile_no) DO UPDATE
       SET points_earned = GREATEST(EXCLUDED.points_earned, loyalty_program.points_redeemed),
           last_updated = NOW()
     )
     SELECT
       updated.mobile_no AS customer_id,
       updated.mobile_no AS mobile_number,
       updated.*,
       $6::int AS loyalty_points
     FROM updated`,
    [mobile_number, name, email, address, req.params.id, loyalty_points || 0]
  );
  res.json(rows[0]);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await query("DELETE FROM customer WHERE mobile_no=$1", [req.params.id]);
  res.status(204).send();
});

export const getPrescriptionHistory = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
       record_id AS medical_history_id,
       mobile_no AS customer_id,
       left_eye_sph,
       right_eye_sph,
       concat('LE ', COALESCE(left_eye_sph::text, ''), ' / ', COALESCE(left_eye_cyl::text, ''), ' x ', COALESCE(left_eye_axis::text, '')) AS left_eye_prescription,
       concat('RE ', COALESCE(right_eye_sph::text, ''), ' / ', COALESCE(right_eye_cyl::text, ''), ' x ', COALESCE(right_eye_axis::text, '')) AS right_eye_prescription,
       COALESCE(right_eye_sph, left_eye_sph) AS sph,
       COALESCE(right_eye_cyl, left_eye_cyl) AS cyl,
       COALESCE(right_eye_axis, left_eye_axis) AS axis,
       notes,
       created_at AS recorded_at
     FROM medical_history
     WHERE mobile_no=$1
     ORDER BY exam_date DESC, created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
});

export const addPrescription = asyncHandler(async (req, res) => {
  const { left_eye_sph, left_eye_cyl, left_eye_axis, right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes } = req.body;
  const { rows } = await query(
    `INSERT INTO medical_history (
       mobile_no, examined_by, left_eye_sph, left_eye_cyl, left_eye_axis,
       right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING record_id AS medical_history_id, mobile_no AS customer_id, *, created_at AS recorded_at`,
    [req.params.id, req.user?.staff_id || null, left_eye_sph, left_eye_cyl, left_eye_axis, right_eye_sph, right_eye_cyl, right_eye_axis, ipd_near, ipd_far, notes]
  );
  res.status(201).json(rows[0]);
});
