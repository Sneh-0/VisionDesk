export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (resource = "Resource") => new ApiError(404, `${resource} not found`);
