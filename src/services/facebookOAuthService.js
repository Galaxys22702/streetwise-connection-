import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { metaConfigurationStatus } from "../integrations/metaClient.js";
import { saveMetaPageConnection } from "./facebookTokenStore.js";

const STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CALLBACK_PATH = "/api/admin/facebook/oauth/callback";

function exactBoolean(env, name, fallback = false) {
  const value = env[name];
  if (value === undefined || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false`);
}

function configError(code) {
  const error = new Error(code);
  error.statusCode = 503;
  return error;
}

function safeRedirectUri(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw configError("meta_oauth_redirect_uri_invalid");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw configError("meta_oauth_redirect_uri_must_use_https");
  }
  if (url.pathname !== OAUTH_CALLBACK_PATH || url.search || url.hash) {
    throw configError("meta_oauth_redirect_uri_must_match_callback_path");
  }
  return url.toString();
}

function oauthConfiguration(env = process.env) {
  const enabled = exactBoolean(env, "META_OAUTH_ENABLED", false);
  const appId = String(env.META_APP_ID || "").trim();
  const appSecret = String(env.META_APP_SECRET || "").trim();
  const configId = String(env.META_LOGIN_CONFIG_ID || "").trim();
  const stateSecret = String(env.META_OAUTH_STATE_SECRET || "").trim();
  const pageId = String(env.META_PAGE_ID || "").trim();
  const redirectUriRaw = String(env.META_OAUTH_REDIRECT_URI || "").trim();
  const graphVersion = metaConfigurationStatus(env).graphVersion;

  return {
    enabled,
    appId,
    appSecret,
    configId,
    stateSecret,
    pageId,
    redirectUriRaw,
    graphVersion,
    configured: Boolean(
      appId &&
      appSecret.length >= 16 &&
      configId &&
      stateSecret.length >= 32 &&
      /^\d+$/.test(pageId) &&
      redirectUriRaw
    )
  };
}

function requireConfiguration(env) {
  const config = oauthConfiguration(env);
  if (!config.enabled) throw configError("meta_oauth_disabled");
  if (!config.configured) throw configError("meta_oauth_not_configured");
  return {
    ...config,
    redirectUri: safeRedirectUri(config.redirectUriRaw)
  };
}

function signStatePayload(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyStatePayload(state, secret, now = Date.now()) {
  const [encoded, signature, extra] = String(state || "").split(".");
  if (!encoded || !signature || extra !== undefined) {
    const error = new Error("meta_oauth_state_invalid");
    error.statusCode = 400;
    throw error;
  }

  const expected = createHmac("sha256", secret).update(encoded).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    supplied = Buffer.alloc(0);
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    const error = new Error("meta_oauth_state_invalid");
    error.statusCode = 400;
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    const error = new Error("meta_oauth_state_invalid");
    error.statusCode = 400;
    throw error;
  }

  if (
    payload?.v !== 1 ||
    !Number.isFinite(payload?.iat) ||
    !Number.isFinite(payload?.exp) ||
    typeof payload?.nonce !== "string" ||
    payload.nonce.length < 16 ||
    payload.iat > now + 60_000 ||
    payload.exp < now
  ) {
    const error = new Error("meta_oauth_state_expired_or_invalid");
    error.statusCode = 400;
    throw error;
  }
  return payload;
}

async function fetchJson(url, { fetchImpl, headers = {} } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (cause) {
    const error = new Error("meta_oauth_upstream_unavailable");
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const error = new Error("meta_oauth_upstream_invalid_response");
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok || data?.error) {
    const error = new Error("meta_oauth_upstream_rejected");
    error.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
    error.metaCode = data?.error?.code ?? null;
    throw error;
  }
  return data;
}

async function exchangeCodeForUserToken({ config, code, fetchImpl }) {
  const tokenUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("code", code);

  const shortLived = await fetchJson(tokenUrl, { fetchImpl });
  const shortToken = String(shortLived?.access_token || "").trim();
  if (shortToken.length < 20) throw configError("meta_oauth_user_token_missing");

  const longUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", config.appId);
  longUrl.searchParams.set("client_secret", config.appSecret);
  longUrl.searchParams.set("fb_exchange_token", shortToken);

  const longLived = await fetchJson(longUrl, { fetchImpl });
  const longToken = String(longLived?.access_token || "").trim();
  if (longToken.length < 20) throw configError("meta_oauth_long_lived_token_missing");
  return longToken;
}

async function findTargetPage({ config, userToken, fetchImpl }) {
  let after = "";

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`https://graph.facebook.com/${config.graphVersion}/me/accounts`);
    url.searchParams.set("fields", "id,name,access_token,tasks");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);

    const result = await fetchJson(url, {
      fetchImpl,
      headers: { authorization: `Bearer ${userToken}` }
    });

    const match = Array.isArray(result?.data)
      ? result.data.find(item => String(item?.id || "") === config.pageId)
      : null;

    if (match) {
      const pageToken = String(match.access_token || "").trim();
      if (pageToken.length < 20) throw configError("meta_page_token_missing");
      return {
        pageId: config.pageId,
        pageName: String(match.name || "").trim(),
        pageToken,
        tasks: Array.isArray(match.tasks) ? match.tasks : []
      };
    }

    after = String(result?.paging?.cursors?.after || "").trim();
    if (!after) break;
  }

  const error = new Error("streetwise_page_not_authorized");
  error.statusCode = 403;
  throw error;
}

export function metaOAuthStatus(env = process.env) {
  const config = oauthConfiguration(env);
  return {
    enabled: config.enabled,
    configured: config.configured,
    graphVersion: config.graphVersion,
    pageIdConfigured: /^\d+$/.test(config.pageId),
    appIdConfigured: Boolean(config.appId),
    appSecretConfigured: config.appSecret.length >= 16,
    loginConfigConfigured: Boolean(config.configId),
    redirectUriConfigured: Boolean(config.redirectUriRaw),
    stateSecretConfigured: config.stateSecret.length >= 32,
    tokenEncryptionKeyConfigured: Boolean(String(env.META_TOKEN_ENCRYPTION_KEY || "").trim())
  };
}

export function createFacebookOAuthService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  saveConnection = saveMetaPageConnection,
  now = () => Date.now()
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("fetch_implementation_required");

  return {
    status() {
      return metaOAuthStatus(env);
    },

    authorizationUrl() {
      const config = requireConfiguration(env);
      const issuedAt = now();
      const state = signStatePayload({
        v: 1,
        iat: issuedAt,
        exp: issuedAt + STATE_TTL_MS,
        nonce: randomBytes(18).toString("base64url")
      }, config.stateSecret);

      const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
      url.searchParams.set("client_id", config.appId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("state", state);
      url.searchParams.set("config_id", config.configId);
      return url.toString();
    },

    async complete({ code, state, providerError } = {}) {
      const config = requireConfiguration(env);
      if (providerError) {
        const error = new Error("meta_oauth_denied");
        error.statusCode = 400;
        throw error;
      }

      const authCode = String(code || "").trim();
      if (!authCode) {
        const error = new Error("meta_oauth_code_missing");
        error.statusCode = 400;
        throw error;
      }

      verifyStatePayload(state, config.stateSecret, now());
      const userToken = await exchangeCodeForUserToken({ config, code: authCode, fetchImpl });
      const page = await findTargetPage({ config, userToken, fetchImpl });

      await saveConnection(page, { env });
      return {
        connected: true,
        pageId: page.pageId,
        pageName: page.pageName,
        tasks: page.tasks
      };
    }
  };
}

export const facebookOAuthService = createFacebookOAuthService();
