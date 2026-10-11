import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { booleanEnv } from "./config/env.js";
import { plans } from "./config/plans.js";
import { cellularCapabilities } from "./config/cellularCapabilities.js";
import { isCustomerServicePath, isPublicWaitlistOnly, publicLaunchMode } from "./config/launchMode.js";
import { sendError, sendJson } from "./http/response.js";
import {
  authenticateRequest,
  loginUser,
  logoutRequest,
  registerUser
} from "./services/authService.js";
import { getCustomerDashboard } from "./services/dashboardService.js";
import {
  createCheckout,
  getSubscriptionForUser,
  handleStripeWebhook,
  hasActiveSubscription,
  paymentProviderStatus
} from "./services/paymentService.js";
import {
  checkProviderCoverage,
  getEsimInstallDetails,
  getEsimOrder,
  listEsimOrdersForUser,
  listProviderBundles,
  providerStatus,
  provisionEsim,
  recordMockUsage
} from "./services/esimService.js";
import { handleEsimGoWebhook } from "./services/esimWebhookService.js";
import { buildHealthStatus } from "./services/healthService.js";
import { enforceWaitlistRateLimit } from "./services/waitlistRateLimit.js";
import { enforceRateLimit } from "./services/requestRateLimit.js";
import { joinWaitlist, waitlistStatus } from "./services/waitlistService.js";
import { handleFacebookAdminApi } from "./services/facebookAdminApi.js";

const configuredPort = Number(process.env.PORT || 3000);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
const PORT = configuredPort;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png"
};

function applySecurityHeaders(res) {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  res.setHeader(
    "content-security-policy",
    "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:"
  );
  if (IS_PRODUCTION) {
    res.setHeader("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
}

async function readRawBody(req, maxBytes = 1_048_576) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("request_too_large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readRawBody(req, 32_768);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    const error = new Error("invalid_json");
    error.statusCode = 400;
    throw error;
  }
}

function decodePathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    const error = new Error("invalid_path_parameter");
    error.statusCode = 400;
    throw error;
  }
}

async function requireUser(req) {
  const user = await authenticateRequest(req);
  if (!user) {
    const error = new Error("authentication_required");
    error.statusCode = 401;
    throw error;
  }
  return user;
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(PUBLIC_DIR, `.${requested}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader("content-type", mimeTypes[extname(filePath)] || "application/octet-stream");
    res.setHeader("cache-control", extname(filePath) === ".html" ? "no-cache" : "public, max-age=300");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    const health = await buildHealthStatus({ runtime: "node" });
    return sendJson(res, health.statusCode, health.body);
  }

  if (url.pathname.startsWith("/api/admin/facebook")) {
    return handleFacebookAdminApi({
      req,
      res,
      url,
      readJsonBody,
      sendJson,
      sendError
    });
  }

  if (req.method === "GET" && url.pathname === "/api/public-status") {
    return sendJson(res, 200, {
      publicLaunchMode: publicLaunchMode(),
      serviceModel: "cellular-mvno",
      waitlist: waitlistStatus(),
      cellularCapabilities
    });
  }

  if (req.method === "POST" && url.pathname === "/api/waitlist") {
    try {
      enforceWaitlistRateLimit(req);
      return sendJson(res, 201, await joinWaitlist(await readJsonBody(req)));
    } catch (error) {
      if (error.retryAfterSeconds) res.setHeader("retry-after", String(error.retryAfterSeconds));
      return sendError(res, error);
    }
  }

  if (isPublicWaitlistOnly() && isCustomerServicePath(url.pathname)) {
    return sendJson(res, 503, { error: "public_waitlist_only" });
  }

  if (req.method === "GET" && url.pathname === "/api/plans") {
    return sendJson(res, 200, { plans });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    try {
      enforceRateLimit(req, { scope: "auth_register", maxAttempts: 5 });
      return sendJson(res, 201, await registerUser(await readJsonBody(req)));
    } catch (error) {
      if (error.retryAfterSeconds) res.setHeader("retry-after", String(error.retryAfterSeconds));
      return sendError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      enforceRateLimit(req, { scope: "auth_login", maxAttempts: 10 });
      return sendJson(res, 200, await loginUser(await readJsonBody(req)));
    } catch (error) {
      if (error.retryAfterSeconds) res.setHeader("retry-after", String(error.retryAfterSeconds));
      return sendError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    try {
      await requireUser(req);
      await logoutRequest(req);
      return sendJson(res, 200, { loggedOut: true });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/account") {
    try {
      const user = await requireUser(req);
      return sendJson(res, 200, {
        user,
        subscription: await getSubscriptionForUser(user.id)
      });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    try {
      const user = await requireUser(req);
      return sendJson(res, 200, await getCustomerDashboard(user));
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/esims") {
    try {
      const user = await requireUser(req);
      return sendJson(res, 200, { esims: await listEsimOrdersForUser(user.id) });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/payments/status") {
    return sendJson(res, 200, paymentProviderStatus());
  }

  if (req.method === "POST" && url.pathname === "/api/payments/checkout") {
    try {
      const user = await requireUser(req);
      return sendJson(res, 201, {
        checkout: await createCheckout(user, await readJsonBody(req))
      });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/payments/subscription") {
    try {
      const user = await requireUser(req);
      return sendJson(res, 200, {
        subscription: await getSubscriptionForUser(user.id)
      });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/payments/webhook") {
    try {
      if (String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase() !== "stripe") {
        return sendJson(res, 404, { error: "stripe_webhook_not_enabled" });
      }
      const signature = String(req.headers["stripe-signature"] || "");
      if (!signature) return sendJson(res, 400, { error: "stripe_signature_required" });
      return sendJson(res, 200, await handleStripeWebhook(await readRawBody(req), signature));
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/providers/esim-go/webhook") {
    try {
      const enabled = booleanEnv("ESIM_WEBHOOKS_ENABLED");
      const provider = String(process.env.ESIM_PROVIDER || "mock").toLowerCase();
      if (!enabled || provider !== "esim-go") {
        return sendJson(res, 404, { error: "esim_go_webhook_not_enabled" });
      }
      const signature = String(req.headers["x-signature-sha256"] || "");
      if (!signature) return sendJson(res, 400, { error: "esim_go_signature_required" });
      return sendJson(res, 200, await handleEsimGoWebhook(await readRawBody(req), signature));
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "GET" && url.pathname === "/api/provider/status") {
    return sendJson(res, 200, await providerStatus());
  }

  if (req.method === "GET" && url.pathname === "/api/provider/catalogue") {
    try {
      return sendJson(res, 200, {
        bundles: await listProviderBundles({ country: url.searchParams.get("country") || "" })
      });
    } catch (error) {
      return sendError(res, error, { fallbackStatus: 502 });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/coverage/check") {
    try {
      return sendJson(res, 200, await checkProviderCoverage(await readJsonBody(req)));
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/esims/order") {
    try {
      const user = await authenticateRequest(req);
      const body = await readJsonBody(req);
      const isTransaction = body.validateOnly === false;
      const idempotencyKey = String(req.headers["idempotency-key"] || "").trim();

      if (isTransaction && !user) {
        return sendJson(res, 401, { error: "authentication_required" });
      }
      if (isTransaction && !idempotencyKey) {
        return sendJson(res, 400, { error: "idempotency_key_required" });
      }
      if (booleanEnv("ESIM_LIVE_ORDERS_ENABLED")) {
        if (!user || !(await hasActiveSubscription(user.id))) {
          return sendJson(res, 402, { error: "active_subscription_required" });
        }
      }

      return sendJson(res, 201, await provisionEsim(body, { user, idempotencyKey }));
    } catch (error) {
      return sendError(res, error);
    }
  }

  const usageMatch = url.pathname.match(/^\/api\/esims\/orders\/([^/]+)\/usage\/simulate$/);
  if (req.method === "POST" && usageMatch) {
    try {
      const user = await requireUser(req);
      const body = await readJsonBody(req);
      return sendJson(res, 200, {
        order: await recordMockUsage(
          decodePathSegment(usageMatch[1]),
          user.id,
          body.usedMegabytes
        )
      });
    } catch (error) {
      return sendError(res, error);
    }
  }

  const installMatch = url.pathname.match(/^\/api\/esims\/orders\/([^/]+)\/install$/);
  if (req.method === "GET" && installMatch) {
    try {
      const user = await requireUser(req);
      const details = await getEsimInstallDetails(decodePathSegment(installMatch[1]), {
        userId: user.id
      });
      if (!details) return sendJson(res, 404, { error: "install_details_not_found" });
      return sendJson(res, 200, { install: details });
    } catch (error) {
      return sendError(res, error);
    }
  }

  const orderMatch = url.pathname.match(/^\/api\/esims\/orders\/([^/]+)$/);
  if (req.method === "GET" && orderMatch) {
    try {
      const user = await requireUser(req);
      const order = await getEsimOrder(decodePathSegment(orderMatch[1]), {
        refresh: url.searchParams.get("refresh") === "true",
        userId: user.id
      });
      if (!order) return sendJson(res, 404, { error: "order_not_found" });
      return sendJson(res, 200, { order });
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (url.pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "not_found" });
  }

  if (req.method === "GET") {
    return serveStatic(url.pathname, res);
  }

  return sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Streetwise Connection running at http://localhost:${PORT}`);
});
