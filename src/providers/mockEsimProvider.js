import { randomUUID } from "node:crypto";

const supportedCountries = new Set(["US", "CA", "MX", "GB", "FR", "DE", "ES", "IT", "JP", "AU"]);

const mockBundles = [
  { name: "mock_1GB_7D_GLOBAL", dataAmount: 1, duration: 7, region: "Global", priceUsd: 3.5 },
  { name: "mock_3GB_30D_GLOBAL", dataAmount: 3, duration: 30, region: "Global", priceUsd: 7.5 },
  { name: "mock_5GB_30D_GLOBAL", dataAmount: 5, duration: 30, region: "Global", priceUsd: 11 }
];

export async function checkCoverage({ country, device }) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const normalizedDevice = String(device || "").trim();

  if (!normalizedCountry) {
    return { supported: false, reason: "country_required" };
  }

  const countrySupported = supportedCountries.has(normalizedCountry);
  const deviceLooksEsimCapable = /iphone|pixel|galaxy|ipad|esim/i.test(normalizedDevice);

  return {
    supported: countrySupported && deviceLooksEsimCapable,
    country: normalizedCountry,
    device: normalizedDevice || null,
    networkStatus: "mock",
    bundleCount: countrySupported ? mockBundles.length : 0,
    message: countrySupported
      ? "Country is in the prototype coverage set. Device compatibility must be verified before activation."
      : "Country is not in the prototype coverage set yet."
  };
}

export async function listBundles({ country } = {}) {
  const normalizedCountry = String(country || "").trim().toUpperCase();
  if (normalizedCountry && !supportedCountries.has(normalizedCountry)) return [];
  return mockBundles;
}

export async function createEsimOrder({ bundleName, quantity = 1, validateOnly = false } = {}) {
  const bundle = mockBundles.find((item) => item.name === bundleName);
  if (!bundle) throw new Error("bundle_not_found");

  const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, 5));
  const orderReference = `mock-${randomUUID()}`;

  if (validateOnly) {
    return {
      provider: "mock",
      mode: "validate",
      liveOrderExecuted: false,
      orderReference,
      status: "validated",
      total: Number((bundle.priceUsd * safeQuantity).toFixed(2)),
      currency: "USD",
      assigned: false
    };
  }

  const matchingId = randomUUID().toUpperCase();
  const smdpAddress = "rsp.mock.streetwise.invalid";
  const iccid = `890000${String(Date.now()).slice(-13)}`;

  return {
    provider: "mock",
    mode: "transaction",
    liveOrderExecuted: false,
    orderReference,
    status: "completed",
    statusMessage: "Mock eSIM provisioned for development only.",
    total: Number((bundle.priceUsd * safeQuantity).toFixed(2)),
    currency: "USD",
    assigned: true,
    install: {
      iccid,
      matchingId,
      smdpAddress,
      activationCode: `LPA:1$${smdpAddress}$${matchingId}`,
      profileStatus: "Released",
      mock: true
    }
  };
}

export async function getOrder(orderReference) {
  return {
    provider: "mock",
    orderReference,
    status: "completed",
    message: "Mock provider does not persist provider-side orders."
  };
}

export async function getInstallDetails(orderReference) {
  return {
    provider: "mock",
    orderReference,
    message: "Installation details are returned with the mock order response."
  };
}

export function getProviderStatus() {
  return {
    provider: "mock",
    configured: true,
    liveOrdersEnabled: false,
    warning: "Development mode only. No carrier service is being provisioned."
  };
}
