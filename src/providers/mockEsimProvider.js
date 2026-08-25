const supportedCountries = new Set(["US", "CA", "MX", "GB", "FR", "DE", "ES", "IT", "JP", "AU"]);

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
    message: countrySupported
      ? "Country is in the prototype coverage set. Device compatibility must be verified before activation."
      : "Country is not in the prototype coverage set yet."
  };
}

export async function createEsimOrder() {
  throw new Error("Real eSIM ordering is disabled until a licensed provider API is connected.");
}
