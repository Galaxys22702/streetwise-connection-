import {
  createMetaClient,
  metaConfigurationStatus
} from "../integrations/metaClient.js";

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

function safeHttpUrl(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  let url;
  try {
    url = new URL(String(value));
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
  return url.toString();
}

export function createFacebookPageService({
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  const status = () => metaConfigurationStatus(env);

  function client() {
    return createMetaClient({ env, fetchImpl });
  }

  return {
    status,

    async getPage() {
      const meta = client();
      return meta.request(meta.pageId, {
        query: { fields: PAGE_FIELDS }
      });
    },

    async listPosts({ limit = 10 } = {}) {
      const meta = client();
      return meta.request(`${meta.pageId}/published_posts`, {
        query: {
          fields: "id,message,created_time,permalink_url,full_picture",
          limit: normalizeLimit(limit)
        }
      });
    },

    async createPost({ message, link } = {}) {
      writeGuard(env);

      const normalizedMessage = String(message || "").trim();
      const normalizedLink = safeHttpUrl(link, "link");

      if (!normalizedMessage && !normalizedLink) {
        const error = new Error("message_or_link_required");
        error.statusCode = 400;
        throw error;
      }
      if (normalizedMessage.length > 5000) {
        const error = new Error("message_too_long");
        error.statusCode = 400;
        throw error;
      }

      const meta = client();
      return meta.request(`${meta.pageId}/feed`, {
        method: "POST",
        body: {
          ...(normalizedMessage ? { message: normalizedMessage } : {}),
          ...(normalizedLink ? { link: normalizedLink } : {})
        }
      });
    },

    async updatePage({ about, description, website } = {}) {
      writeGuard(env, true);

      const changes = {};
      if (about !== undefined) changes.about = String(about).trim();
      if (description !== undefined) changes.description = String(description).trim();
      if (website !== undefined) changes.website = safeHttpUrl(website, "website");

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

      const meta = client();
      return meta.request(meta.pageId, {
        method: "POST",
        body: changes
      });
    }
  };
}

export const facebookPageService = createFacebookPageService();
