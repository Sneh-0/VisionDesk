import { ApiError } from "../utils/apiError.js";

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (!result.success) {
    return next(new ApiError(422, "Validation failed", result.error.flatten()));
  }

  req.validated = result.data;
  next();
};
