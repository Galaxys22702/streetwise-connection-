import { isPublicWaitlistOnly } from "../config/launchMode.js";

const WAITLIST_CONSENT_VERSION = "2026-08-26";
const WAITLIST_BACKEND_URL = "https://wzzreonjszvcldifoaod.supabase.co/functions/v1/streetwise-waitlist";
const WAITLIST_SUPPORT_EMAIL = "iamgalaxy8484@gmail.com";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isWaitlistEnabled() {
  return String(process.env.WAITLIST_ENABLED || "").trim().toLowerCase() === "true";
}

export function waitlistStatus() {
  const enabled = isPublicWaitlistOnly() && isWaitlistEnabled();

  return {
    open: enabled,
    consentVersion: WAITLIST_CONSENT_VERSION,
    supportEmail: WAITLIST_SUPPORT_EMAIL,
    storageConfigured: true,
    storageProvider: "supabase",
    message: enabled
      ? "Join the waitlist for launch updates. No payment or service activation is available."
      : "The public waitlist is currently closed."
  };
}

export async function joinWaitlist({ email, consentVersion }) {
  const status = waitlistStatus();
  if (!status.open) {
    const error = new Error("waitlist_not_open");
    error.statusCode = 503;
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail) || normalizedEmail.length > 254) {
    const error = new Error("valid_email_required");
    error.statusCode = 400;
    throw error;
  }
  if (String(consentVersion || "") !== WAITLIST_CONSENT_VERSION) {
    const error = new Error("waitlist_consent_required");
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await fetch(WAITLIST_BACKEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        email: normalizedEmail,
        consentVersion: WAITLIST_CONSENT_VERSION
      }),
      signal: AbortSignal.timeout(10_000)
    });
  } catch {
    const error = new Error("waitlist_storage_unavailable");
    error.statusCode = 503;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "waitlist_storage_unavailable");
    error.statusCode = response.status;
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) error.retryAfterSeconds = Number(retryAfter) || 900;
    throw error;
  }

  return {
    joined: true,
    message: payload.message || "You’re on the waitlist. We’ll email you when launch details are ready."
  };
}
