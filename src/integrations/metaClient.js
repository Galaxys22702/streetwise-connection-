const DEFAULT_GRAPH_VERSION = "v26.0";

function readBoolean(env, name, fallback = false) {
  const value = env[name];
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false`);
}

function graphVersion(env) {
  const value = String(env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION).trim();
  if (!/^v\d+\.\d+$/.test(value)) {
    throw new Error("META_GRAPH_VERSION must look like v26.0");
  }
  return value;
}

function redact(value, token) {
  const text = String(value || "");
  return token ? text.replaceAll(token, "[REDACTED]") : text;
}

function classifyGraphError(graphError, responseStatus) {
  const code = Number(graphError?.code);

  if (code === 190 || code === 102) {
    return {
      statusCode: 503,
      publicCode: "meta_reauthorization_required"
    };
  }

  if (code === 200 || code === 230 || code === 283) {
    return {
      statusCode: 503,
      publicCode: "meta_permission_required"
    };
  }

  if ([80001, 80002, 80005, 80006].includes(code)) {
    return {
      statusCode: 429,
      publicCode: "meta_rate_limited"
    };
  }

  if (code === 368) {
    return {
      statusCode: 403,
      publicCode: "meta_action_disallowed"
    };
  }

  return {
    statusCode: responseStatus >= 400 && responseStatus < 500 ? 400 : 502,
    publicCode: null
  };
}

export function metaConfigurationStatus(env = process.env) {
  const pageId = String(env.META_PAGE_ID || "").trim();
  const token = String(env.META_PAGE_ACCESS_TOKEN || "").trim();

  return {
    enabled: readBoolean(env, "META_INTEGRATION_ENABLED", false),
    writesEnabled: readBoolean(env, "META_WRITES_ENABLED", false),
    metadataWritesEnabled: readBoolean(env, "META_METADATA_WRITES_ENABLED", false),
    graphVersion: graphVersion(env),
    pageIdConfigured: /^\d+$/.test(pageId),
    tokenConfigured: token.length >= 20
  };
}

export function createMetaClient({
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required");
  }

  const status = metaConfigurationStatus(env);
  const pageId = String(env.META_PAGE_ID || "").trim();
  const token = String(env.META_PAGE_ACCESS_TOKEN || "").trim();

  if (!status.enabled) {
    const error = new Error("meta_integration_disabled");
    error.statusCode = 503;
    throw error;
  }
  if (!status.pageIdConfigured || !status.tokenConfigured) {
    const error = new Error("meta_integration_not_configured");
    error.statusCode = 503;
    throw error;
  }

  async function request(path, {
    method = "GET",
    query = {},
    body = null
  } = {}) {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    if (!cleanPath || cleanPath.includes("://") || cleanPath.includes("..")) {
      const error = new Error("invalid_meta_graph_path");
      error.statusCode = 400;
      throw error;
    }

    const url = new URL(
      `https://graph.facebook.com/${status.graphVersion}/${cleanPath}`
    );

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const headers = {
      accept: "application/json",
      authorization: `Bearer ${token}`
    };

    let requestBody;
    if (body && method !== "GET") {
      const encoded = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          encoded.set(key, String(value));
        }
      }
      headers["content-type"] = "application/x-www-form-urlencoded";
      requestBody = encoded.toString();
    }

    const response = await fetchImpl(url, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(15_000)
    });

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      const error = new Error("meta_graph_invalid_response");
      error.statusCode = 502;
      throw error;
    }

    if (!response.ok || data?.error) {
      const graphError = data?.error || {};
      const message = redact(graphError.message || `HTTP ${response.status}`, token);
      const classification = classifyGraphError(graphError, response.status);
      const error = new Error(`meta_graph_error: ${message}`);
      error.statusCode = classification.statusCode;
      error.metaPublicCode = classification.publicCode;
      error.metaCode = graphError.code ?? null;
      error.metaType = graphError.type ?? null;
      throw error;
    }

    return data;
  }

  return {
    pageId,
    graphVersion: status.graphVersion,
    request
  };
}
