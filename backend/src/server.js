import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ApiError } from "./utils/apiError.js";
import { checkSupabaseConnection } from "./config/supabase.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim());
console.log("CORS allowed origins:", allowedOrigins);
app.use(cors({
  origin: (origin, callback) => {
    console.log("CORS check - incoming origin:", origin);
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      console.log("CORS allowed for origin:", origin);
      return callback(null, true);
    }
    console.warn("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ status: "ok", app: "Visondesk API" }));
app.get("/health/db", async (_req, res, next) => {
  try {
    const database = await checkSupabaseConnection();
    res.json({ status: "ok", app: "Visondesk API", database });
  } catch (error) {
    next(new ApiError(503, `Supabase database connection failed: ${error.message}`));
  }
});
app.use("/api", routes);
app.use((_req, _res, next) => next(new ApiError(404, "Route not found")));
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Visondesk API running on port ${port}`);
});
