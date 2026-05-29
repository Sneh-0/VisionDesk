import { z } from "zod";

const idParam = z.object({ id: z.string().min(1) });
const optionalEmail = z.preprocess(
  (value) => value === "" ? null : value,
  z.string().email().optional().nullable()
);
const optionalNumber = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce.number().optional().nullable()
);

export const idSchema = z.object({ params: idParam });

export const loginSchema = z.object({
  body: z.object({
    login_id: z.string().min(3),
    password: z.string().min(6)
  })
});

export const customerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    mobile_number: z.string().min(7),
    email: optionalEmail,
    address: z.string().optional().nullable(),
    loyalty_points: z.coerce.number().int().min(0).default(0)
  })
});

export const prescriptionSchema = z.object({
  body: z.object({
    left_eye_sph: z.coerce.number().optional().nullable(),
    left_eye_cyl: z.coerce.number().optional().nullable(),
    left_eye_axis: z.coerce.number().optional().nullable(),
    right_eye_sph: z.coerce.number().optional().nullable(),
    right_eye_cyl: z.coerce.number().optional().nullable(),
    right_eye_axis: z.coerce.number().optional().nullable(),
    ipd_near: z.coerce.number().optional().nullable(),
    ipd_far: z.coerce.number().optional().nullable(),
    notes: z.string().optional().nullable()
  })
});

export const productSchema = z.object({
  body: z.object({
    item_type: z.enum(["Frame", "Lens"]),
    name: z.string().min(2),
    sku: z.string().min(2),
    barcode: z.string().optional().nullable(),
    category: z.string().min(2),
    brand: z.string().min(2),
    color: z.string().optional().nullable(),
    price: z.coerce.number().nonnegative(),
    reorder_level: z.coerce.number().int().min(0).default(5),
    frame_shape: z.string().optional().nullable(),
    frame_material: z.string().optional().nullable(),
    lens_type: z.string().optional().nullable(),
    lens_power: z.string().optional().nullable()
  })
});

export const inventorySchema = z.object({
  body: z.object({
    item_id: z.string().min(1),
    branch_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(0),
    reason: z.string().optional().default("Manual adjustment")
  })
});

export const supplierSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    contact_person: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: optionalEmail,
    address: z.string().optional().nullable()
  })
});

export const supplySchema = z.object({
  body: z.object({
    supplier_id: z.coerce.number().int().positive(),
    item_id: z.string().min(1),
    branch_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    unit_cost: z.coerce.number().nonnegative()
  })
});

export const orderSchema = z.object({
  body: z.object({
    customer_id: z.string().min(1),
    branch_id: z.coerce.number().int().positive(),
    tax_rate: z.coerce.number().min(0).max(1).default(0.18),
    notes: z.string().optional().nullable(),
    requires_prescription: z.coerce.boolean().optional().default(false),
    lens_modification_notes: z.string().optional().nullable(),
    prescription: z.object({
      left_eye_sph: optionalNumber,
      left_eye_cyl: optionalNumber,
      left_eye_axis: optionalNumber,
      right_eye_sph: optionalNumber,
      right_eye_cyl: optionalNumber,
      right_eye_axis: optionalNumber,
      ipd_near: optionalNumber,
      ipd_far: optionalNumber,
      notes: z.string().optional().nullable()
    }).optional().nullable(),
    items: z.array(z.object({
      item_id: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
      unit_price: z.coerce.number().nonnegative()
    })).min(1)
  })
});

export const statusSchema = z.object({
  body: z.object({ status: z.enum(["Pending", "In Progress", "Ready", "Delivered"]) })
});

export const branchSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pincode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: optionalEmail
  })
});

export const staffSchema = z.object({
  body: z.object({
    branch_id: z.coerce.number().int().positive(),
    full_name: z.string().min(2),
    login_id: z.string().min(3),
    email: optionalEmail,
    phone: z.string().optional().nullable(),
    role: z.enum(["owner", "branch_admin", "staff"]),
    password: z.string().min(6)
  })
});
