import { buildHealthStatus } from "../src/services/healthService.js";

export default async function handler(req, res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cache-control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const health = await buildHealthStatus({ runtime: "vercel" });
  return res.status(health.statusCode).json(health.body);
}
