import { createJarvisVoice } from "./jarvis-voice.js";
import { createCommandControls } from "./jarvis-commands.js";

const byId = id => document.getElementById(id);
let token = "";
let history = [];
let busy = false;
let listening = false;
const voice = createJarvisVoice({
  onTranscript(text) {
    const draft = byId("message");
    draft.value = [draft.value.trim(), text].filter(Boolean).join(" ").slice(0, 4000);
    draft.focus();
  },
  onNotice(text) { byId("notice").textContent = text; },
  onListening(active) {
    listening = active;
    byId("voice-input").textContent = active ? "Stop listening" : "Speak a message";
    byId("voice-input").setAttribute("aria-pressed", String(active));
    byId("send").disabled = busy || active || commandControls.running;
  },
  onSpeaking(active) { byId("stop-speaking").hidden = !active; }
});
byId("voice-input").disabled = !voice.canListen;
byId("speak-replies").disabled = !voice.canSpeak;
if (!voice.canListen) {
  byId("voice-note").textContent = "Voice input isn’t available in this browser. You can type instead. Spoken playback, if supported, may send reply text to your browser’s voice service.";
}
byId("voice-input").addEventListener("click", () => {
  if (busy || commandControls.running || !token) return;
  if (listening) {
    voice.finishListening();
  } else voice.startListening();
});
byId("speak-replies").addEventListener("change", () => {
  if (!byId("speak-replies").checked) voice.stopSpeaking();
});
byId("stop-speaking").addEventListener("click", () => voice.stopSpeaking());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) voice.stop();
});
window.addEventListener("pagehide", () => voice.stop());
const errors = {
  jarvis_disabled: "Jarvis is not enabled on this server yet.",
  jarvis_access_not_configured: "The server needs a private Jarvis access token before you can connect.",
  jarvis_access_denied: "That access token was not accepted. Check it and try again.",
  jarvis_ai_not_configured: "Free-form chat needs an AI connection on the server. You can still send /status.",
  jarvis_provider_unavailable: "The AI connection is unavailable. Please try again later.",
  jarvis_invalid_provider_url: "The server’s AI connection needs configuration.",
  jarvis_access_rate_limited: "Too many requests. Please wait before trying again.",
  jarvis_chat_rate_limited: "Please wait before sending more messages.",
  jarvis_invalid_messages: "This conversation is too long. Disconnect and reconnect to start a new one."
};
Object.assign(errors, {
  jarvis_commands_unavailable: "Commands are disabled on this runner. They require explicit development configuration.",
  jarvis_invalid_command: "Enter a command of up to 4,000 characters.",
  jarvis_invalid_directory: "That starting directory is unavailable or outside the configured workspace.",
  jarvis_invalid_command_ticket: "That command approval is invalid. Review the command again.",
  jarvis_command_expired: "That command approval expired or was already used. Review the command again.",
  jarvis_command_running: "A command is already running. Wait for it to finish.",
  jarvis_too_many_pending_commands: "Too many pending command reviews. Wait five minutes before trying again.",
  jarvis_commands_rate_limited: "Too many command requests. Please wait before trying again.",
  jarvis_command_failed: "The runner couldn’t start that command. Check the runner and try again."
});
const commandControls = createCommandControls({ api, byId, isChatBusy: () => busy || listening,
  onRunningChange(active) {
    byId("send").disabled = active || busy || listening;
    byId("voice-input").disabled = active || busy || !voice.canListen;
  }
});

async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET", credentials: "omit", cache: "no-store",
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(35000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(errors[data.error] || "Jarvis couldn’t complete that request. Please try again.");
  return data;
}

function bubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = role === "user" ? "YOU" : "JARVIS";
  div.append(speaker, document.createTextNode(text));
  byId("messages").append(div);
  div.scrollIntoView({ block: "nearest" });
}

byId("connect-form").addEventListener("submit", async event => {
  event.preventDefault();
  token = byId("access-token").value;
  const button = event.submitter;
  button.disabled = true;
  byId("notice").textContent = "Connecting…";
  try {
    const status = await api("/api/jarvis/status");
    byId("access-token").value = "";
    byId("connection").hidden = true;
    byId("workspace").hidden = false;
    commandControls.connect(status.commandsAvailable);
    byId("availability").textContent = status.commandsAvailable ? "Jarvis connected · Command workspace ready" : status.aiConfigured ? "Jarvis connected · Chat ready" : "Jarvis connected · Status available";
    byId("notice").textContent = status.aiConfigured ? "Your messages are sent to the configured AI provider. Don’t share passwords or other secrets." : errors.jarvis_ai_not_configured;
    bubble("assistant", "Hello, I’m Jarvis. What would you like help with?");
    byId("message").focus();
  } catch (error) {
    token = "";
    byId("notice").textContent = error.message;
  } finally { button.disabled = false; }
});

byId("disconnect").addEventListener("click", () => {
  if (commandControls.running) return;
  commandControls.reset();
  voice.stop();
  byId("speak-replies").checked = false;
  token = ""; history = [];
  byId("messages").replaceChildren();
  byId("message").value = "";
  byId("workspace").hidden = true;
  byId("connection").hidden = false;
  byId("notice").textContent = "Disconnected. Conversation cleared.";
});

byId("chat-form").addEventListener("submit", async event => {
  event.preventDefault();
  const draft = byId("message").value;
  const content = draft.trim();
  if (!content || busy || listening || commandControls.running) return;
  voice.stop();
  busy = true;
  byId("voice-input").disabled = true;
  byId("send").disabled = true;
  byId("disconnect").disabled = true;
  byId("notice").textContent = "Jarvis is thinking…";
  // Keep full user/assistant pairs, leaving room for the next user message.
  const previous = history.slice(-18);
  while (previous.length && previous.reduce((sum, item) => sum + item.content.length, content.length) > 16000) {
    previous.splice(0, 2);
  }
  const messages = [...previous, { role: "user", content }];
  try {
    const result = await api("/api/jarvis/chat", { messages });
    bubble("user", content);
    bubble("assistant", result.reply);
    history = [...messages, { role: "assistant", content: result.reply.slice(0, 4000) }];
    if (byId("message").value === draft) byId("message").value = "";
    byId("notice").textContent = result.source === "ai" ? "Reply received. AI answers can be mistaken; check product instructions and measurements." : "Verified Streetwise status received.";
    if (byId("speak-replies").checked && !document.hidden) voice.speak(result.reply);
  } catch (error) {
    byId("notice").textContent = error.message;
  } finally {
    busy = false;
    byId("voice-input").disabled = !voice.canListen;
    byId("send").disabled = false;
    byId("disconnect").disabled = commandControls.running;
    byId("message").focus();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    byId("message").value = button.dataset.prompt;
    byId("message").focus();
  });
});
