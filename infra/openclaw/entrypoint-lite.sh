#!/bin/bash
set -e

# Perform the legacy volume ownership migration once, not on every restart.
if [ ! -f /data/.jarvis-ownership-v1 ]; then
  chown -R openclaw:openclaw /data
  touch /data/.jarvis-ownership-v1
fi
chown openclaw:openclaw /data
chmod 700 /data

if [ ! -d /data/.linuxbrew ]; then
  cp -a /home/linuxbrew/.linuxbrew /data/.linuxbrew
fi

rm -rf /home/linuxbrew/.linuxbrew
ln -sfn /data/.linuxbrew /home/linuxbrew/.linuxbrew

# Report authentication configuration presence without printing credentials.
if [ -n "${GEMINI_API_KEY:-}" ]; then
  echo "[JARVIS] Railway GEMINI_API_KEY is present in the container environment."
else
  echo "[JARVIS] Railway GEMINI_API_KEY is missing from the container environment."
fi
if [ -d "${OPENCLAW_STATE_DIR:-/data/.openclaw}/agents" ]; then
  echo "[JARVIS] Persistent agent settings exist; saved authentication may take precedence."
fi

# Repair only the known invalid model from the live logs. Leave other models,
# credentials, agent data, and conversations unchanged.
if [ -n "${GEMINI_API_KEY:-}" ] && [ -f "${OPENCLAW_STATE_DIR:-/data/.openclaw}/openclaw.json" ]; then
  CURRENT_MODEL="$(gosu openclaw node "${OPENCLAW_ENTRY:-/usr/local/lib/node_modules/openclaw/dist/entry.js}" config get agents.defaults.model.primary 2>/dev/null || true)"
  if [[ "$CURRENT_MODEL" == *"openai/Gemini"* ]]; then
    echo "[JARVIS] Replacing invalid openai/Gemini primary model with Google Gemini."
    gosu openclaw node "${OPENCLAW_ENTRY:-/usr/local/lib/node_modules/openclaw/dist/entry.js}" config set agents.defaults.model.primary google/gemini-2.5-flash || echo "[JARVIS] Model correction failed; saved config left intact."
  fi
fi

gosu openclaw node /app/optimize-plugins.cjs

exec gosu openclaw node src/server.js
