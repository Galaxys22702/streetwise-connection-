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

gosu openclaw node /app/optimize-plugins.cjs

exec gosu openclaw node src/server.js
