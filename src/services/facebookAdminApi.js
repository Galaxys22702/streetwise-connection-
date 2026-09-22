import { requireFacebookAdmin } from "./facebookAdminAuth.js";
import { facebookPageService } from "./facebookPageService.js";
import {
  handleFacebookOAuthApi,
  isFacebookOAuthPath
} from "./facebookOAuthApi.js";

const ROUTE_METHODS = new Map([
  ["/api/admin/facebook/status", ["GET"]],
  ["/api/admin/facebook/page", ["GET", "PATCH"]],
  ["/api/admin/facebook/posts", ["GET", "POST"]]
]);

export async function handleFacebookAdminApi({
  req,
  res,
  url,
  readJsonBody,
  sendJson,
  sendError,
  service = facebookPageService,
  authenticate = requireFacebookAdmin
}) {
  res.setHeader("cache-control", "no-store");

  if (isFacebookOAuthPath(url.pathname)) {
    return handleFacebookOAuthApi({
      req,
      res,
      url,
      sendJson,
      sendError
    });
  }

  const allowedMethods = ROUTE_METHODS.get(url.pathname);
  if (!allowedMethods) {
    return sendJson(res, 404, { error: "not_found" });
  }

  try {
    authenticate(req);

    if (!allowedMethods.includes(req.method)) {
      res.setHeader("allow", allowedMethods.join(", "));
      return sendJson(res, 405, { error: "method_not_allowed" });
    }

    if (url.pathname === "/api/admin/facebook/status") {
      return sendJson(res, 200, await service.status());
    }

    if (url.pathname === "/api/admin/facebook/page" && req.method === "GET") {
      return sendJson(res, 200, { page: await service.getPage() });
    }

    if (url.pathname === "/api/admin/facebook/posts" && req.method === "GET") {
      return sendJson(res, 200, {
        posts: await service.listPosts({
          limit: url.searchParams.get("limit") || 10
        })
      });
    }

    if (url.pathname === "/api/admin/facebook/posts") {
      return sendJson(res, 201, {
        post: await service.createPost(await readJsonBody(req))
      });
    }

    return sendJson(res, 200, {
      result: await service.updatePage(await readJsonBody(req))
    });
  } catch (error) {
    if (error?.metaPublicCode) {
      return sendJson(res, error.statusCode || 502, {
        error: error.metaPublicCode
      });
    }
    return sendError(res, error);
  }
}
