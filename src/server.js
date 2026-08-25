import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { plans } from "./config/plans.js";
import { checkCoverage } from "./providers/mockEsimProvider.js";

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
    return sendJson(res, 200, {
      ok: true,
      service: "streetwise-connection",
      version: "0.1.0"
    });
  }

  if (req.method === "GET" && url.pathname === "/api/plans") {
    return sendJson(res, 200, { plans });
  }

  if (req.method === "POST" && url.pathname === "/api/coverage/check") {
    try {
      const body = await readJsonBody(req);
      const result = await checkCoverage(body);
      return sendJson(res, 200, result);
    } catch (error) {
      const status = error.message === "request_too_large" ? 413 : 400;
      return sendJson(res, status, { error: error.message || "invalid_request" });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/esims/order") {
    return sendJson(res, 501, {
      error: "provider_not_connected",
      message: "Real eSIM provisioning will be enabled after a licensed provider API is integrated."
    });
  }

  if (req.method === "GET") {
    return serveStatic(url.pathname, res);
  }

  sendJson(res, 404, { error: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Streetwise Connection running at http://localhost:${PORT}`);
});
