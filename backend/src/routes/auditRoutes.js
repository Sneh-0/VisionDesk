import { Router } from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", authorize("owner"), listAuditLogs);

export default router;
