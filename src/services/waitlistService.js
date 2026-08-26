import { randomUUID } from "node:crypto";
import { databaseConfigured, query } from "../db/index.js";
import { isPublicWaitlistOnly } from "../config/launchMode.js";

const WAITLIST_CONSENT_VERSION = "2026-08-26";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function supportEmail() {
  const value = normalizeEmail(process.env.SUPPORT_EMAIL);
  return isValidEmail(value) ? value : "";
}

export function waitlistStatus() {
  const contact = supportEmail();
  const enabled =
    isPublicWaitlistOnly() &&
    process.env.WAITLIST_ENABLED === "true" &&
    Boolean(contact) &&
    databaseConfigured;

  return {
    open: enabled,
    consentVersion: WAITLIST_CONSENT_VERSION,
    supportEmail: contact || null,
    storageConfigured: databaseConfigured,
    message: enabled
      ? "Join the waitlist for launch updates. No payment or service activation is available."
      : "The public waitlist is being prepared. No email addresses are collected until secure storage and the support contact are configured."
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

  await query(
    `INSERT INTO waitlist_entries (id, email, consent_version)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET
       consent_version = EXCLUDED.consent_version,
       consented_at = NOW()`,
    [`wle_${randomUUID().replaceAll("-", "")}`, normalizedEmail, WAITLIST_CONSENT_VERSION]
  );

  return { joined: true, message: "You’re on the waitlist. We’ll email you when launch details are ready." };
}
