import test from "node:test";
import assert from "node:assert/strict";
import { handleFacebookAdminApi } from "../src/services/facebookAdminApi.js";

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value);
    }
  };
}

function sendJson(_res, status, payload) {
  return { status, payload };
}

function sendError(_res, error) {
  return { status: error.statusCode || 500, payload: { error: error.message } };
}

function baseArgs({ method = "GET", path = "/api/admin/facebook/status", service } = {}) {
  return {
    req: { method, headers: {} },
    res: createResponse(),
    url: new URL(`https://streetwise.local${path}`),
    readJsonBody: async () => ({}),
    sendJson,
    sendError,
    authenticate: () => true,
    service: service || {
      status: () => ({ enabled: false }),
      getPage: async () => ({ id: "123" }),
      listPosts: async () => ({ data: [] }),
      createPost: async body => ({ id: "123_456", ...body }),
      updatePage: async body => ({ success: true, ...body })
    }
  };
}

test("unknown Facebook admin routes return 404 without invoking authentication", async () => {
  let authenticated = false;
  const args = baseArgs({ path: "/api/admin/facebook/unknown" });
  args.authenticate = () => {
    authenticated = true;
  };

  const result = await handleFacebookAdminApi(args);

  assert.equal(result.status, 404);
  assert.deepEqual(result.payload, { error: "not_found" });
  assert.equal(authenticated, false);
});

test("Facebook posts endpoint advertises only its supported methods", async () => {
  const args = baseArgs({ method: "DELETE", path: "/api/admin/facebook/posts" });

  const result = await handleFacebookAdminApi(args);

  assert.equal(result.status, 405);
  assert.deepEqual(result.payload, { error: "method_not_allowed" });
  assert.equal(args.res.headers.allow, "GET, POST");
});

test("Facebook page endpoint advertises GET and PATCH only", async () => {
  const args = baseArgs({ method: "POST", path: "/api/admin/facebook/page" });

  const result = await handleFacebookAdminApi(args);

  assert.equal(result.status, 405);
  assert.equal(args.res.headers.allow, "GET, PATCH");
});

test("Facebook status route remains protected", async () => {
  const args = baseArgs();
  args.authenticate = () => {
    const error = new Error("facebook_admin_authentication_required");
    error.statusCode = 401;
    throw error;
  };

  const result = await handleFacebookAdminApi(args);

  assert.equal(result.status, 401);
  assert.deepEqual(result.payload, { error: "facebook_admin_authentication_required" });
});

test("Facebook post creation passes the parsed request body to the service", async () => {
  let receivedBody;
  const args = baseArgs({ method: "POST", path: "/api/admin/facebook/posts" });
  args.readJsonBody = async () => ({ message: "Streetwise test" });
  args.service.createPost = async body => {
    receivedBody = body;
    return { id: "123_456" };
  };

  const result = await handleFacebookAdminApi(args);

  assert.equal(result.status, 201);
  assert.deepEqual(receivedBody, { message: "Streetwise test" });
  assert.deepEqual(result.payload, { post: { id: "123_456" } });
});
