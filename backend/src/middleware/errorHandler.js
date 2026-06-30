export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error("Unhandled server error:", err);
  }

  res.status(statusCode).json({
    message: isProduction && isServerError ? "Internal server error" : err.message || "Internal server error",
    details: isProduction ? null : err.details || null
  });
};
