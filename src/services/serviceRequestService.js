import { randomUUID } from "node:crypto";
import { query } from "../db/index.js";

const DIVISIONS = new Set(["connect", "support", "secure", "business"]);
const DELIVERY_OPTIONS = new Set(["remote", "on-site", "no-preference"]);
const CUSTOMER_TYPES = new Set(["residential", "commercial"]);

const SERVICES = new Map([
  ["connect", new Set([
    "wifi-setup",
    "router-configuration",
    "mesh-wifi-setup",
    "network-troubleshooting",
    "network-setup",
    "network-documentation"
  ])],
  ["support", new Set([
    "computer-setup",
    "device-setup",
    "technical-troubleshooting",
    "data-migration",
    "backup-setup",
    "remote-technical-support",
    "technology-guidance"
  ])],
  ["secure", new Set([
    "account-security-review",
    "mfa-setup",
    "password-manager-setup",
    "device-hardening",
    "router-security",
    "privacy-security-configuration",
    "security-awareness",
    "basic-security-assessment"
  ])],
  ["business", new Set([
    "business-it-setup",
    "microsoft-365-setup",
    "google-workspace-setup",
    "business-network-setup",
    "device-deployment",
    "backup-recovery-planning",
    "it-documentation",
    "ongoing-business-it-support"
  ])]
]);

function cleanText(value, maxLength) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export async function createServiceRequest(input = {}) {
  const name = cleanText(input.name, 120);
  const email = normalizeEmail(input.email);
  const phone = cleanText(input.phone, 40);
  const customerType = cleanText(input.customerType, 20);
  const division = cleanText(input.division, 20).toLowerCase();
  const service = cleanText(input.service, 80).toLowerCase();
  const deliveryPreference = cleanText(input.deliveryPreference, 20).toLowerCase();
  const description = cleanText(input.description, 4000);
  const preferredContactTime = cleanText(input.preferredContactTime, 120);

  if (name.length < 1) throw invalid("name_required");
  if (!validEmail(email)) throw invalid("valid_email_required");
  if (!CUSTOMER_TYPES.has(customerType)) throw invalid("customer_type_required");
  if (!DIVISIONS.has(division)) throw invalid("service_division_required");
  if (!SERVICES.get(division)?.has(service)) throw invalid("service_required");
  if (!DELIVERY_OPTIONS.has(deliveryPreference)) throw invalid("delivery_preference_required");
  if (description.length < 10) throw invalid("description_too_short");

  const id = `req_${randomUUID().replaceAll("-", "")}`;
  const result = await query(
    `INSERT INTO service_requests
      (id, name, email, phone, customer_type, division, service_slug,
       delivery_preference, description, preferred_contact_time)
     VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7, $8, $9, NULLIF($10, ''))
     RETURNING id, name, email, customer_type, division, service_slug,
               delivery_preference, status, created_at`,
    [
      id,
      name,
      email,
      phone,
      customerType,
      division,
      service,
      deliveryPreference,
      description,
      preferredContactTime
    ]
  );

  return {
    request: result.rows[0],
    message: "Service request received. Streetwise Connection will review the request and contact you about the next step."
  };
}
