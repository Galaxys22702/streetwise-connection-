import {
  createMetaClient,
  metaConfigurationStatus
} from "../integrations/metaClient.js";
import { loadMetaPageConnection } from "./facebookTokenStore.js";

const PAGE_FIELDS = [
  "id",
  "name",
  "about",
  "description",
  "category",
  "website",
  "followers_count",
  "fan_count",
  "link"
].join(",");

function writeGuard(env, metadata = false) {
  const status = metaConfigurationStatus(env);
  if (!status.writesEnabled) {
    const error = new Error("meta_writes_disabled");
    error.statusCode = 503;
    throw error;
  }
  if (metadata && !status.metadataWritesEnabled) {
    const error = new Error("meta_metadata_writes_disabled");
    error.statusCode = 503;
    throw error;
  }
}

function normalizeLimit(value) {
  const parsed = Number(value ?? 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    const error = new Error("limit_must_be_between_1_and_50");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function requireObjectPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error("request_body_must_be_an_object");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function optionalString(value, fieldName) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    const error = new Error(`${fieldName}_must_be_a_string`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

function safeHttpUrl(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    const error = new Error(`${fieldName}_must_be_a_string`);
    error.statusCode = 400;
    throw error;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    const error = new Error(`${fieldName}_must_be_a_valid_url`);
    error.statusCode = 400;
    throw error;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error(`${fieldName}_must_use_http_or_https`);
    error.statusCode = 400;
    throw error;
  }
  if (url.username || url.password) {
    const error = new Error(`${fieldName}_must_not_contain_credentials`);
    error.statusCode = 400;
    throw error;
  }
  return url.toString();
}

export function createFacebookPageService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  loadConnection = loadMetaPageConnection
} = {}) {
  async function resolveCredentials() {
    const pageId = String(env.META_PAGE_ID || "").trim();
    const envToken = String(env.META_PAGE_ACCESS_TOKEN || "").trim();

    if (/^\d+$/.test(pageId) && envToken.length >= 20) {
      return { pageId, pageToken: envToken, source: "environment" };
    }

    if (/^\d+$/.test(pageId)) {
      const stored = await loadConnection(pageId, { env });
      if (stored?.pageToken) {
        return {
          pageId: stored.pageId,
          pageToken: stored.pageToken,
          source: "encrypted_store"
        };
      }
    }

    return { pageId, pageToken: envToken, source: "none" };
  }

  async function status() {
    const configured = metaConfigurationStatus(env);
    const credentials = await resolveCredentials();
    return {
      ...configured,
      pageIdConfigured: /^\d+$/.test(credentials.pageId),
      tokenConfigured: String(credentials.pageToken || "").length >= 20,
      credentialSource: credentials.source
    };
  }

  async function client() {
    const credentials = await resolveCredentials();
    return createMetaClient({
      env,
      fetchImpl,
      pageIdOverride: credentials.pageId,
      tokenOverride: credentials.pageToken
    });
  }

  return {
    status,

    async getPage() {
      const meta = await client();
      return meta.request(meta.pageId, {
        query: { fields: PAGE_FIELDS }
      });
    },

    async listPosts({ limit = 10 } = {}) {
      const meta = await client();
      return meta.request(`${meta.pageId}/published_posts`, {
        query: {
          fields: "id,message,created_time,permalink_url,full_picture",
          limit: normalizeLimit(limit)
        }
      });
    },

    async createPost(input = {}) {
      writeGuard(env);
      const { message, link, imageUrl } = requireObjectPayload(input);

      const normalizedMessage = optionalString(message, "message") || "";
      const normalizedLink = safeHttpUrl(link, "link");
      const normalizedImageUrl = safeHttpUrl(imageUrl, "imageUrl");

      if (!normalizedMessage && !normalizedLink && !normalizedImageUrl) {
        const error = new Error("message_link_or_image_required");
        error.statusCode = 400;
        throw error;
      }
      if (normalizedMessage.length > 5000) {
        const error = new Error("message_too_long");
        error.statusCode = 400;
        throw error;
      }
      if (normalizedLink && normalizedImageUrl) {
        const error = new Error("link_and_image_url_are_mutually_exclusive");
        error.statusCode = 400;
        throw error;
      }

      const meta = await client();
      if (normalizedImageUrl) {
        return meta.request(`${meta.pageId}/photos`, {
          method: "POST",
          body: {
            url: normalizedImageUrl,
            published: "true",
            ...(normalizedMessage ? { caption: normalizedMessage } : {})
          }
        });
      }

      return meta.request(`${meta.pageId}/feed`, {
        method: "POST",
        body: {
          ...(normalizedMessage ? { message: normalizedMessage } : {}),
          ...(normalizedLink ? { link: normalizedLink } : {})
        }
      });
    },

    async updatePage(input = {}) {
      writeGuard(env, true);
      const { about, description, website } = requireObjectPayload(input);

      const changes = {};
      if (about !== undefined) changes.about = optionalString(about, "about");
      if (description !== undefined) changes.description = optionalString(description, "description");
      if (website !== undefined) {
        const normalizedWebsite = safeHttpUrl(website, "website");
        if (!normalizedWebsite) {
          const error = new Error("website_must_be_a_valid_url");
          error.statusCode = 400;
          throw error;
        }
        changes.website = normalizedWebsite;
      }

      if (!Object.keys(changes).length) {
        const error = new Error("supported_page_change_required");
        error.statusCode = 400;
        throw error;
      }
      if ((changes.about?.length || 0) > 255) {
        const error = new Error("about_too_long");
        error.statusCode = 400;
        throw error;
      }
      if ((changes.description?.length || 0) > 2000) {
        const error = new Error("description_too_long");
        error.statusCode = 400;
        throw error;
      }

      const meta = await client();
      return meta.request(meta.pageId, {
        method: "POST",
        body: changes
      });
    }
  };
}

export const facebookPageService = createFacebookPageService();
