export default async function handler(req, res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cache-control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const status = {
    ok: true,
    service: "streetwise-connection",
    version: "0.4.0",
    runtime: "vercel",
    databaseConfigured: Boolean(String(process.env.DATABASE_URL || "").trim()),
    paymentProvider: String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase(),
    stripeConfigured: Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim()),
    esimProvider: String(process.env.ESIM_PROVIDER || "mock").toLowerCase(),
    esimConfigured: Boolean(String(process.env.ESIM_API_KEY || "").trim()),
    stripeLiveModeEnabled: process.env.STRIPE_LIVE_MODE_ENABLED === "true",
    esimLiveOrdersEnabled: process.env.ESIM_LIVE_ORDERS_ENABLED === "true"
  };

  return res.status(200).json(status);
}
