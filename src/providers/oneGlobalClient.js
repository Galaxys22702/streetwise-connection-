const DEFAULT_API_BASE_URL = "https://api.1global.com/connect";
const DEFAULT_API_VERSION = "2026-02-05";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function getConfig() {
  return {
    apiBaseUrl: String(process.env.ONEGLOBAL_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, ""),
    tokenUrl: String(process.env.ONEGLOBAL_TOKEN_URL || "").trim(),
    clientId: String(process.env.ONEGLOBAL_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.ONEGLOBAL_CLIENT_SECRET || "").trim(),
    apiVersion: String(process.env.ONEGLOBAL_API_VERSION || DEFAULT_API_VERSION).trim()
  };
}

function requireCredentials() {
  const config = getConfig();
  if (!config.tokenUrl || !config.clientId || !config.clientSecret) {
    const error = new Error("oneglobal_not_configured");
    error.statusCode = 503;
    throw error;
  }
  return config;
}

async function getAccessToken() {
  const config = requireCredentials();
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt - 15_000 > now) return cachedToken;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.access_token) {
    const error = new Error(data?.error_description || data?.error || `oneglobal_auth_http_${response.status}`);
    error.statusCode = response.status || 502;
    throw error;
  }

  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + Math.max(30, Number(data.expires_in) || 300) * 1000;
  return cachedToken;
}

async function request(path, { query } = {}) {
  const config = requireCredentials();
  const token = await getAccessToken();
  const url = new URL(`${config.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/hal+json, application/json",
      authorization: `Bearer ${token}`,
      "Api-Version": config.apiVersion
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.title || data?.message || `oneglobal_http_${response.status}`);
    error.statusCode = response.status;
    error.providerPayload = data;
    throw error;
  }
  return data;
}

export async function listProductOfferings({ country, limit = 40 } = {}) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const payload = await request("/product-offerings", {
    query: {
      status: "active",
      type: "plan",
      limit: Math.max(1, Math.min(Number(limit) || 40, 40)),
      ...(normalizedCountry ? { "allowances[coverage-area][countries]": normalizedCountry } : {})
    }
  });
  return payload?._embedded?.product_offerings || [];
}

export function getOneGlobalStatus() {
  const config = getConfig();
  return {
    provider: "1global",
    configured: Boolean(config.tokenUrl && config.clientId && config.clientSecret),
    apiBaseUrl: config.apiBaseUrl,
    apiVersion: config.apiVersion,
    readOnly: true
  };
}

export function clearOneGlobalTokenCacheForTests() {
  cachedToken = null;
  cachedTokenExpiresAt = 0;
}
