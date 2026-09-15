const SAFE_PUBLIC_ERROR = /^[a-z][a-z0-9_:-]{0,99}$/i;

function normalizedStatus(error, fallbackStatus) {
  const status = Number(error?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status <= 599) return status;
  const fallback = Number(fallbackStatus);
  return Number.isInteger(fallback) && fallback >= 400 && fallback <= 599 ? fallback : 500;
}

function publicErrorMessage(error, status, isProduction) {
  const message = String(error?.message || "").trim();
  if (!isProduction) return message || "request_failed";
  if (status >= 500) return "request_failed";
  return SAFE_PUBLIC_ERROR.test(message) ? message : "request_failed";
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

export function sendError(
  res,
  error,
  { fallbackStatus = 500, isProduction = process.env.NODE_ENV === "production" } = {}
) {
  const status = normalizedStatus(error, fallbackStatus);
  const payload = { error: publicErrorMessage(error, status, isProduction) };
  if (!isProduction && error?.providerPayload) payload.provider = error.providerPayload;
  return sendJson(res, status, payload);
}
