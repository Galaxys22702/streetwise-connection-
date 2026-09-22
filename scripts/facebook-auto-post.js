import { runFacebookAutoPost } from "../src/services/facebookAutoPost.js";

const enabledValue = String(process.env.FACEBOOK_AUTO_POST_ENABLED ?? "true").trim();
if (!new Set(["true", "false"]).has(enabledValue)) {
  throw new Error("FACEBOOK_AUTO_POST_ENABLED must be exactly true or false");
}

const result = await runFacebookAutoPost({
  baseUrl: process.env.FACEBOOK_OPS_BASE_URL,
  adminKey: process.env.FACEBOOK_OPS_ADMIN_KEY,
  enabled: enabledValue === "true",
  imageUrl: process.env.FACEBOOK_AUTO_POST_IMAGE_URL
});

console.log(JSON.stringify(result));

if (result.state === "posted") {
  console.log(`Published Streetwise Facebook photo post ${result.postId || "(id unavailable)"}.`);
} else if (result.state === "skipped_recent_post") {
  console.log("Skipped Facebook auto-post because the Page already has a recent post.");
} else if (result.state === "awaiting_meta_write_authorization") {
  console.log("Facebook auto-post is ready but Meta Page writes are not fully authorised yet.");
} else if (result.state === "disabled") {
  console.log("Facebook auto-post is disabled.");
} else {
  console.log("Facebook auto-post is dormant until the admin key is configured.");
}
