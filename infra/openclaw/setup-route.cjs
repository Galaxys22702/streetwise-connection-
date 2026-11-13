// Serialized into the pinned wrapper; keep this function self-contained.
function resolveSetupModel(payload) {
  const model = (payload.model || "").trim();
  if (payload.authChoice !== "openrouter-api-key") return model;
  // OpenClaw's blank OpenRouter default is paid Auto. Select the free router
  // before the first gateway start, rather than waiting for restart recovery.
  if (!model || ["auto", "openrouter/auto", "openrouter:auto", "openrouter/openrouter/auto"].includes(model)) {
    return "openrouter/openrouter/free";
  }
  return model;
}

module.exports = { resolveSetupModel };
