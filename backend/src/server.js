import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ApiError } from "./utils/apiError.js";
import { checkSupabaseConnection, supabasePool } from "./config/supabase.js";

dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET is required and must be at least 32 characters long.");
}

const app = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ status: "ok", app: "VisionDesk API" }));
app.get("/health/db", async (_req, res, next) => {
  try {
    const database = await checkSupabaseConnection();
    res.json({ status: "ok", app: "VisionDesk API", database });
  } catch (error) {
    next(new ApiError(503, "Database connection failed", isProduction ? null : error.message));
  }
});
app.use("/api", routes);
app.use((_req, _res, next) => next(new ApiError(404, "Route not found")));
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`VisionDesk API running on port ${port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Closing HTTP server and database pool.`);
  server.close(async () => {
    await supabasePool.end();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
