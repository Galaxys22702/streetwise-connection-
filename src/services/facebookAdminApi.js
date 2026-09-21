import { requireFacebookAdmin } from "./facebookAdminAuth.js";
import { facebookPageService } from "./facebookPageService.js";

export async function handleFacebookAdminApi({
  req,
  res,
  url,
  readJsonBody,
  sendJson,
  sendError,
  service = facebookPageService
}) {
  try {
    requireFacebookAdmin(req);

    if (req.method === "GET" && url.pathname === "/api/admin/facebook/status") {
      return sendJson(res, 200, service.status());
    }

    if (req.method === "GET" && url.pathname === "/api/admin/facebook/page") {
      return sendJson(res, 200, { page: await service.getPage() });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/facebook/posts") {
      return sendJson(res, 200, {
        posts: await service.listPosts({
          limit: url.searchParams.get("limit") || 10
        })
      });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/facebook/posts") {
      return sendJson(res, 201, {
        post: await service.createPost(await readJsonBody(req))
      });
    }

    if (req.method === "PATCH" && url.pathname === "/api/admin/facebook/page") {
      return sendJson(res, 200, {
        result: await service.updatePage(await readJsonBody(req))
      });
    }

    res.setHeader("allow", "GET, POST, PATCH");
    return sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    return sendError(res, error);
  }
}
