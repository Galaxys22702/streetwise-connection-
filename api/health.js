import { publicLaunchMode } from "../src/config/launchMode.js";
import { databaseStatus } from "../src/db/index.js";
import { providerStatus } from "../src/services/esimService.js";
import { paymentProviderStatus } from "../src/services/paymentService.js";
import { waitlistStatus } from "../src/services/waitlistService.js";

export default async function handler(req, res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cache-control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const [applicationDatabase, provider] = await Promise.all([
    databaseStatus(),
    providerStatus().catch((error) => ({
      configured: false,
      connected: false,
      error: error.message || "provider_status_unavailable"
    }))
  ]);
  const waitlist = waitlistStatus();

  const status = {
    ok: true,
    service: "streetwise-connection",
    version: "0.4.0",
    runtime: "vercel",
    database: {
      ...applicationDatabase,
      role: "customer-service",
      requiredForPublicWaitlist: false
    },
    storage: {
      publicWaitlist: {
        provider: waitlist.storageProvider,
        configured: waitlist.storageConfigured,
        required: waitlist.open
      }
    },
    payments: paymentProviderStatus(),
    provider,
    publicLaunchMode: publicLaunchMode(),
    waitlist
  };

  return res.status(200).json(status);
}
