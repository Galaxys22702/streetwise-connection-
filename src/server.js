import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { plans } from "./config/plans.js";
import {
  checkProviderCoverage,
  getEsimInstallDetails,
  getEsimOrder,
  listProviderBundles,
  providerStatus,
  provisionEsim
} from "./services/esimService.js";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, error, fallbackStatus = 400) {
  return sendJson(res, Number(error.statusCode) || fallbackStatus, {
    error: error.message || "request_failed",
    ...(error.providerPayload ? { provider: error.providerPayload } : {})
  });
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32_768) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^([.][.][/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    const provider = await providerStatus();
    return sendJson(res, 200, {
      ok: true,
      service: "streetwise-connection",
      version: "0.2.0",
      provider
    });
  }

  if (req.method === "GET" && url.pathname === "/api/plans") {
    return sendJson(res, 200, { plans });
  }

  if (req.method === "GET" && url.pathname === "/api/provider/status") {
    return sendJson(res, 200, await providerStatus());
  }

  if (req.method === "GET" && url.pathname === "/api/provider/catalogue") {
    try {
      const bundles = await listProviderBundles({ country: url.searchParams.get("country") || "" });
      return sendJson(res, 200, { bundles });
    } catch (error) {
      return sendError(res, error, 502);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/coverage/check") {
    try {
      const body = await readJsonBody(req);
      const result = await checkProviderCoverage(body);
      return sendJson(res, 200, result);
    } catch (error) {
      const status = error.message === "request_too_large" ? 413 : 400;
      return sendError(res, error, status);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/esims/order") {
    try {
      const body = await readJsonBody(req);
      const result = await provisionEsim(body);
      return sendJson(res, 201, result);
    } catch (error) {
      const status = error.message === "request_too_large" ? 413 : 400;
      return sendError(res, error, status);
    }
  }

  const installMatch = url.pathname.match(/^\/api\/esims\/orders\/([^/]+)\/install$/);
  if (req.method === "GET" && installMatch) {
    try {
      const details = await getEsimInstallDetails(decodeURIComponent(installMatch[1]));
      if (!details) return sendJson(res, 404, { error: "install_details_not_found" });
      return sendJson(res, 200, { install: details });
    } catch (error) {
      return sendError(res, error, 502);
    }
  }

  const orderMatch = url.pathname.match(/^\/api\/esims\/orders\/([^/]+)$/);
  if (req.method === "GET" && orderMatch) {
    const order = await getEsimOrder(decodeURIComponent(orderMatch[1]), {
      refresh: url.searchParams.get("refresh") === "true"
    });
    if (!order) return sendJson(res, 404, { error: "order_not_found" });
    return sendJson(res, 200, { order });
  }

  if (req.method === "GET") {
    return serveStatic(url.pathname, res);
  }

  sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Streetwise Connection running at http://localhost:${PORT}`);
});
