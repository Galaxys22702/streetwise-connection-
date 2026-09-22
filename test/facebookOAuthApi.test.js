import test from "node:test";
import assert from "node:assert/strict";
import {
  handleFacebookOAuthApi,
  isFacebookOAuthPath
} from "../src/services/facebookOAuthApi.js";

function responseObject() {
  return {
    statusCode: 200,
    headers: {},
    ended: false,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value);
    },
    end() {
      this.ended = true;
    }
  };
}

function sendJson(_res, status, payload) {
  return { status, payload };
}

function sendError(_res, error) {
  return { status: error.statusCode || 500, payload: { error: error.message } };
}

test("OAuth path detection is limited to the dedicated Facebook OAuth namespace", () => {
  assert.equal(isFacebookOAuthPath("/api/admin/facebook/oauth/start"), true);
  assert.equal(isFacebookOAuthPath("/api/admin/facebook/oauth/callback"), true);
  assert.equal(isFacebookOAuthPath("/api/admin/facebook/page"), false);
  assert.equal(isFacebookOAuthPath("/api/admin/facebook/oauthish/start"), false);
});

test("OAuth start redirects to Meta without exposing secrets in the response body", async () => {
  const res = responseObject();
  const result = await handleFacebookOAuthApi({
    req: { method: "GET" },
    res,
    url: new URL("https://streetwise.example/api/admin/facebook/oauth/start"),
    sendJson,
    sendError,
    service: {
      status: () => ({}),
      authorizationUrl: () => "https://www.facebook.com/v26.0/dialog/oauth?client_id=123&state=signed",
      complete: async () => ({ connected: true })
    }
  });

  assert.equal(result, undefined);
  assert.equal(res.statusCode, 302);
  assert.match(res.headers.location, /^https:\/\/www\.facebook\.com\//);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["x-robots-tag"], "noindex");
  assert.equal(res.ended, true);
});

test("OAuth callback returns only non-secret connection metadata", async () => {
  const res = responseObject();
  const result = await handleFacebookOAuthApi({
    req: { method: "GET" },
    res,
    url: new URL("https://streetwise.example/api/admin/facebook/oauth/callback?code=abc&state=signed"),
    sendJson,
    sendError,
    service: {
      status: () => ({}),
      authorizationUrl: () => "https://www.facebook.com/",
      complete: async ({ code, state }) => ({
        connected: true,
        pageId: "108798728689570",
        pageName: "Streetwise Connection",
        tasks: ["CREATE_CONTENT"],
        codeSeen: code,
        stateSeen: state
      })
    }
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.connected, true);
  assert.equal(result.payload.pageId, "108798728689570");
  assert.equal(result.payload.codeSeen, "abc");
  assert.equal(result.payload.stateSeen, "signed");
});

test("OAuth routes accept GET only", async () => {
  const res = responseObject();
  const result = await handleFacebookOAuthApi({
    req: { method: "POST" },
    res,
    url: new URL("https://streetwise.example/api/admin/facebook/oauth/start"),
    sendJson,
    sendError,
    service: {}
  });

  assert.equal(result.status, 405);
  assert.equal(res.headers.allow, "GET");
});
