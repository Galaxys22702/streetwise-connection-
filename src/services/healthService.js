import { isPublicWaitlistOnly, publicLaunchMode } from "../config/launchMode.js";
import { databaseStatus } from "../db/index.js";
import { providerStatus } from "./esimService.js";
import { paymentProviderStatus } from "./paymentService.js";
import { waitlistStatus } from "./waitlistService.js";

const SERVICE_NAME = "streetwise-connection";
const SERVICE_VERSION = "0.4.0";

function publicWaitlistHealth(runtime, waitlist) {
  const ready = !waitlist.open || waitlist.storageConfigured;
  return {
    statusCode: ready ? 200 : 503,
    body: {
      ok: ready,
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      ...(runtime ? { runtime } : {}),
      publicLaunchMode: "waitlist",
      waitlist: {
        open: waitlist.open,
        ready
      }
    }
  };
}

function safePaymentStatus() {
  try {
    return paymentProviderStatus();
  } catch {
    return {
      provider: "invalid",
      configured: false,
      liveModeEnabled: false,
      webhookConfigured: false
    };
  }
}

export async function buildHealthStatus({ runtime = null } = {}) {
  const waitlist = waitlistStatus();
  if (isPublicWaitlistOnly()) {
    return publicWaitlistHealth(runtime, waitlist);
  }

  const [database, provider] = await Promise.all([
    databaseStatus(),
    providerStatus().catch(() => ({ configured: false, connected: false }))
  ]);
  const payments = safePaymentStatus();
  const databaseReady = database.configured === true && database.connected === true;
  const providerReady = provider?.configured !== false;
  const paymentsReady = payments?.configured !== false;
  const ready = databaseReady && providerReady && paymentsReady;

  return {
    statusCode: ready ? 200 : 503,
    body: {
      ok: ready,
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      ...(runtime ? { runtime } : {}),
      database,
      payments,
      provider,
      publicLaunchMode: publicLaunchMode(),
      waitlist
    }
  };
}
