import { authorizeJarvis, jarvisStatus, chatWithJarvis } from "./jarvisChat.js";
import { enforceRateLimit } from "./requestRateLimit.js";

export async function handleJarvisApi({ req, res, url, readJsonBody, sendJson, sendError }) {
  try {
    if (!["/api/jarvis/status", "/api/jarvis/chat"].includes(url.pathname)) {
      return sendJson(res, 404, { error: "not_found" });
    }
    enforceRateLimit(req, { scope: "jarvis_access", maxAttempts: 60 });
    authorizeJarvis(req);
    if (url.pathname === "/api/jarvis/status" && req.method === "GET") {
      return sendJson(res, 200, jarvisStatus());
    }
    if (url.pathname === "/api/jarvis/chat" && req.method === "POST") {
      enforceRateLimit(req, { scope: "jarvis_chat", maxAttempts: 20 });
      return sendJson(res, 200, await chatWithJarvis(await readJsonBody(req)));
    }
    res.setHeader("allow", url.pathname.endsWith("/chat") ? "POST" : "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    if (error.retryAfterSeconds) res.setHeader("retry-after", String(error.retryAfterSeconds));
    // Only expose known error codes, never an unexpected exception's details.
    const code = /^(jarvis_[a-z_]+|invalid_json|request_too_large)$/.test(error.message || "")
      ? error.message : "jarvis_request_failed";
    const status = Number(error.statusCode);
    return sendJson(res, Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500, { error: code });
  }
}
