export const retryableFailureCodes = Object.freeze([
  "tool_execution_failed"
]);

export function createRetryController({
  maxAttempts = 3,
  retryableCodes = retryableFailureCodes
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new TypeError("maxAttempts must be an integer from 1 to 5");
  }

  const allowed = new Set(retryableCodes);
  for (const code of allowed) {
    if (typeof code !== "string" || !code.trim()) throw new TypeError("retryableCodes must contain strings");
  }

  function shouldRetry({ attempt, errorCode, riskTier, environment, explicitRetry = false } = {}) {
    if (!Number.isInteger(attempt) || attempt < 1) return false;
    if (attempt >= maxAttempts) return false;
    if (!allowed.has(errorCode)) return false;

    // Never retry elevated-risk operations implicitly.
    if (riskTier > 0 && explicitRetry !== true) return false;
    if (environment === "production" && explicitRetry !== true) return false;

    return true;
  }

  function nextAttempt(attempt) {
    if (!Number.isInteger(attempt) || attempt < 1 || attempt >= maxAttempts) return null;
    return attempt + 1;
  }

  return Object.freeze({
    maxAttempts,
    shouldRetry,
    nextAttempt
  });
}
