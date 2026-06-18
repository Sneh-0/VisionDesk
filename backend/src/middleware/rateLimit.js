import { ApiError } from "../utils/apiError.js";

export const rateLimit = ({ windowMs, max, message = "Too many requests" }) => {
  const hits = new Map();
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of hits.entries()) {
      if (value.resetAt <= now) hits.delete(key);
    }
  }, windowMs);

  cleanupInterval.unref?.();

  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      return next(new ApiError(429, message));
    }

    return next();
  };
};
