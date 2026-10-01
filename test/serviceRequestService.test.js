import test from "node:test";
import assert from "node:assert/strict";
import { createServiceRequest } from "../src/services/serviceRequestService.js";

const base = {
  name: "Test Customer",
  email: "customer@example.com",
  phone: "",
  customerType: "residential",
  division: "connect",
  service: "wifi-setup",
  deliveryPreference: "remote",
  description: "My home Wi-Fi needs troubleshooting."
};

test("rejects invalid email before database access", async () => {
  await assert.rejects(
    createServiceRequest({ ...base, email: "not-an-email" }),
    (error) => error.message === "valid_email_required" && error.statusCode === 400
  );
});

test("rejects a service that does not belong to the selected division", async () => {
  await assert.rejects(
    createServiceRequest({ ...base, division: "secure", service: "wifi-setup" }),
    (error) => error.message === "service_required" && error.statusCode === 400
  );
});

test("rejects unsupported delivery options", async () => {
  await assert.rejects(
    createServiceRequest({ ...base, deliveryPreference: "carrier-pigeon" }),
    (error) => error.message === "delivery_preference_required" && error.statusCode === 400
  );
});

test("rejects descriptions shorter than the minimum", async () => {
  await assert.rejects(
    createServiceRequest({ ...base, description: "help" }),
    (error) => error.message === "description_too_short" && error.statusCode === 400
  );
});
