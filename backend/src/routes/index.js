import { Router } from "express";
import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import customerRoutes from "./customerRoutes.js";
import productRoutes from "./productRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import supplierRoutes from "./supplierRoutes.js";
import orderRoutes from "./orderRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import branchRoutes from "./branchRoutes.js";
import reportRoutes from "./reportRoutes.js";
import staffRoutes from "./staffRoutes.js";
import purchaseOrderRoutes from "./purchaseOrderRoutes.js";
import expenseRoutes from "./expenseRoutes.js";
import stockTransferRoutes from "./stockTransferRoutes.js";
import auditRoutes from "./auditRoutes.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use("/auth", authRoutes);
router.use(authenticate);
router.use("/dashboard", dashboardRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/orders", orderRoutes);
router.use("/purchase-orders", purchaseOrderRoutes);
router.use("/expenses", expenseRoutes);
router.use("/stock-transfers", stockTransferRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/branches", branchRoutes);
router.use("/reports", reportRoutes);
router.use("/staff", staffRoutes);

export default router;
