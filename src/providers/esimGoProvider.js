const DEFAULT_BASE_URL = "https://api.esim-go.com/v2.5";

function getConfig() {
  return {
    baseUrl: String(process.env.ESIM_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey: String(process.env.ESIM_API_KEY || "").trim(),
    webhooksEnabled: String(process.env.ESIM_WEBHOOKS_ENABLED || "false").toLowerCase() === "true",
    liveOrdersEnabled: String(process.env.ESIM_LIVE_ORDERS_ENABLED || "false").toLowerCase() === "true"
  };
}

function requireApiKey() {
  const { apiKey } = getConfig();
  if (!apiKey) {
    const error = new Error("esim_provider_not_configured");
    error.statusCode = 503;
    throw error;
  }
  return apiKey;
}

async function request(path, options = {}) {
  const { baseUrl } = getConfig();
  const apiKey = requireApiKey();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || response.statusText };
  }

  if (!response.ok) {
    const error = new Error(data?.message || `esim_go_http_${response.status}`);
    error.statusCode = response.status;
    error.providerPayload = data;
    throw error;
  }

  return data;
}

function normalizeBundles(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.bundles)) return payload.bundles;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.bundles && typeof payload.bundles === "object") {
    return Object.values(payload.bundles).filter((item) => item && typeof item === "object" && item.name);
  }
  return [];
}

export async function listBundles({ country } = {}) {
  const params = new URLSearchParams();
  if (country) params.set("countries", String(country).trim().toUpperCase());
  params.set("perPage", "100");
  return normalizeBundles(await request(`/catalogue?${params.toString()}`));
}

export async function checkCoverage({ country, device } = {}) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const normalizedDevice = String(device || "").trim();

  if (!normalizedCountry) {
    return { supported: false, reason: "country_required" };
  }

  const bundles = await listBundles({ country: normalizedCountry });
  const deviceLooksEsimCapable = /iphone|pixel|galaxy|ipad|esim/i.test(normalizedDevice);

  return {
    supported: bundles.length > 0 && deviceLooksEsimCapable,
    country: normalizedCountry,
    device: normalizedDevice || null,
    networkStatus: "live-catalogue",
    bundleCount: bundles.length,
    message: bundles.length
      ? "Live provider catalogue contains coverage for this country. Verify the exact device supports eSIM before purchase."
      : "No live provider bundles were found for this country."
  };
}

export async function createEsimOrder({ bundleName, quantity = 1, validateOnly = true } = {}) {
  if (!bundleName) throw new Error("bundle_name_required");

  const config = getConfig();
  const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, 5));
  const transactionAllowed = config.liveOrdersEnabled && validateOnly === false;
  const type = transactionAllowed ? "transaction" : "validate";

  const payload = {
    type,
    assign: type === "transaction",
    order: [
      {
        type: "bundle",
        quantity: safeQuantity,
        item: bundleName
      }
    ]
  };

  const data = await request("/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const status = type === "validate"
    ? (data?.valid === false ? "invalid" : "validated")
    : (data?.status || "submitted");

  return {
    provider: "esim-go",
    mode: type,
    liveOrderExecuted: type === "transaction",
    orderReference: data?.orderReference || null,
    status,
    statusMessage: data?.statusMessage || null,
    total: data?.total ?? null,
    currency: data?.currency || null,
    assigned: Boolean(data?.assigned),
    valid: type === "validate" ? data?.valid !== false : null,
    providerPayload: data
  };
}

export async function getOrder(orderReference) {
  if (!orderReference) throw new Error("order_reference_required");
  return request(`/orders/${encodeURIComponent(orderReference)}`);
}

export async function getInstallDetails(orderReference) {
  if (!orderReference) throw new Error("order_reference_required");
  const params = new URLSearchParams({
    reference: orderReference,
    additionalFields: "installUrl"
  });
  return request(`/esims/assignments?${params.toString()}`);
}

export function getProviderStatus() {
  const config = getConfig();
  return {
    provider: "esim-go",
    configured: Boolean(config.apiKey),
    webhooksEnabled: config.webhooksEnabled,
    liveOrdersEnabled: config.liveOrdersEnabled,
    baseUrl: config.baseUrl
  };
}
