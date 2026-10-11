const DEFAULT_BASE_URL = "https://streetwise-connection.vercel.app";

function baseUrl(value) {
  const url = new URL(String(value || DEFAULT_BASE_URL).trim());
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("facebook_ops_base_url_must_use_https");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

async function requestJson(url, { adminKey, fetchImpl }) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "x-streetwise-admin-key": adminKey
      },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (cause) {
    const error = new Error("facebook_ops_unreachable");
    error.cause = cause;
    throw error;
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("facebook_ops_invalid_response");
  }

  if (!response.ok) {
    const error = new Error("facebook_ops_request_failed");
    error.statusCode = response.status;
    throw error;
  }
  return body;
}

export async function runFacebookOpsHeartbeat({
  baseUrl: configuredBaseUrl = DEFAULT_BASE_URL,
  adminKey = "",
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch_implementation_required");

  const key = String(adminKey || "").trim();
  if (!key) {
    return { state: "dormant", reason: "admin_key_not_configured" };
  }
  if (key.length < 32) throw new Error("facebook_ops_admin_key_too_short");

  const root = baseUrl(configuredBaseUrl);
  const statusUrl = new URL("/api/admin/facebook/status", root);
  const status = await requestJson(statusUrl, { adminKey: key, fetchImpl });

  if (!status?.enabled || !status?.pageIdConfigured || !status?.tokenConfigured) {
    return {
      state: "awaiting_meta_authorization",
      status: {
        enabled: Boolean(status?.enabled),
        writesEnabled: Boolean(status?.writesEnabled),
        metadataWritesEnabled: Boolean(status?.metadataWritesEnabled),
        pageIdConfigured: Boolean(status?.pageIdConfigured),
        tokenConfigured: Boolean(status?.tokenConfigured)
      }
    };
  }

  const pageUrl = new URL("/api/admin/facebook/page", root);
  const pageResponse = await requestJson(pageUrl, { adminKey: key, fetchImpl });
  const page = pageResponse?.page || {};

  return {
    state: "meta_ready",
    status: {
      enabled: true,
      writesEnabled: Boolean(status?.writesEnabled),
      metadataWritesEnabled: Boolean(status?.metadataWritesEnabled),
      pageIdConfigured: true,
      tokenConfigured: true
    },
    page: {
      id: String(page.id || ""),
      name: String(page.name || "")
    }
  };
}
