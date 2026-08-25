import * as mockProvider from "./mockEsimProvider.js";
import * as esimGoProvider from "./esimGoProvider.js";

const providers = {
  mock: mockProvider,
  "esim-go": esimGoProvider
};

export function getProviderName() {
  return String(process.env.ESIM_PROVIDER || "mock").trim().toLowerCase();
}

export function getProvider() {
  const name = getProviderName();
  const provider = providers[name];
  if (!provider) {
    const error = new Error(`unsupported_esim_provider:${name}`);
    error.statusCode = 500;
    throw error;
  }
  return provider;
}

export function getProviderStatus() {
  const provider = getProvider();
  return provider.getProviderStatus
    ? provider.getProviderStatus()
    : { provider: getProviderName(), configured: true };
}
