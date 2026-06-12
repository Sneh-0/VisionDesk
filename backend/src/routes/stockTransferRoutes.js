import { Router } from "express";
import { listTransfers, getTransfer, initiateTransfer, updateTransferStatus } from "../controllers/stockTransferController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", listTransfers);
router.get("/:id", getTransfer);
router.post("/", authorize("owner", "branch_admin"), initiateTransfer);
router.patch("/:id/status", authorize("owner", "branch_admin"), updateTransferStatus);

export default router;
