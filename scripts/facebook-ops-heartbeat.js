import { runFacebookOpsHeartbeat } from "../src/services/facebookOpsHeartbeat.js";

const result = await runFacebookOpsHeartbeat({
  baseUrl: process.env.FACEBOOK_OPS_BASE_URL,
  adminKey: process.env.FACEBOOK_OPS_ADMIN_KEY
});

console.log(JSON.stringify(result));

if (result.state === "meta_ready") {
  console.log(`Facebook operations ready for Page ${result.page.name || result.page.id}`);
} else if (result.state === "awaiting_meta_authorization") {
  console.log("Facebook operations heartbeat is alive; Meta authorization is not fully enabled yet.");
} else {
  console.log("Facebook operations heartbeat is dormant until the admin key is configured.");
}
