import { facebookOAuthService } from "./facebookOAuthService.js";

const ROUTES = new Set([
  "/api/facebook/oauth/status",
  "/api/facebook/oauth/start",
  "/api/facebook/oauth/callback"
]);

export async function handleFacebookOAuthApi({
  req,
  res,
  url,
  sendJson,
  sendError,
  service = facebookOAuthService
}) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-robots-tag", "noindex");

  if (!ROUTES.has(url.pathname)) {
    return sendJson(res, 404, { error: "not_found" });
  }
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  try {
    if (url.pathname === "/api/facebook/oauth/status") {
      return sendJson(res, 200, service.status());
    }

    if (url.pathname === "/api/facebook/oauth/start") {
      res.statusCode = 302;
      res.setHeader("location", service.authorizationUrl());
      return res.end();
    }

    const result = await service.complete({
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
      providerError: url.searchParams.get("error") || url.searchParams.get("error_reason")
    });
    return sendJson(res, 200, result);
  } catch (error) {
    return sendError(res, error);
  }
}
