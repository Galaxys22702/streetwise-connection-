import { inject } from 'https://cdn.jsdelivr.net/npm/@vercel/analytics@2.0.1/dist/index.mjs';

// Initialize Vercel Web Analytics
inject();

const plansEl = document.querySelector("#plans");
const coverageForm = document.querySelector("#coverage-form");
const coverageResultEl = document.querySelector("#coverage-result");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const authResultEl = document.querySelector("#auth-result");
const accountSummaryEl = document.querySelector("#account-summary");
const logoutButton = document.querySelector("#logout-button");
const dashboardSection = document.querySelector("#dashboard");
const dashboardSummaryEl = document.querySelector("#dashboard-summary");
const esimListEl = document.querySelector("#esim-list");
const refreshDashboardButton = document.querySelector("#refresh-dashboard");

const TOKEN_KEY = "streetwise_session_token";
let token = sessionStorage.getItem(TOKEN_KEY) || "";

const HTML_ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPE[character]);
}

function displayValue(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : fallback;
}

function safePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

function checkoutUrl(value) {
  const url = new URL(String(value || ""), window.location.origin);
  const isLocal = url.origin === window.location.origin;
  const isStripe = url.protocol === "https:" && (url.hostname === "stripe.com" || url.hostname.endsWith(".stripe.com"));
  if (!isLocal && !isStripe) throw new Error("invalid_checkout_url");
  return url.href;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `request_failed_${response.status}`);
  return data;
}

function formatBytes(value) {
  if (value == null) return "—";
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${bytes} B`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

async function loadPlans() {
  const data = await api("/api/plans");
  plansEl.innerHTML = data.plans.map((plan) => {
    const price = Number(plan.priceUsd);
    const hasPrice = Number.isFinite(price) && price > 0;
    return `
      <article class="card">
        <p class="eyebrow">${displayValue(plan.status, "planned")}</p>
        <h3>${displayValue(plan.name, "Streetwise plan")}</h3>
        <p class="price">${hasPrice ? `$${price}` : "Flexible"}<small>${hasPrice ? "/mo" : ""}</small></p>
        <p>${displayValue(plan.description, "Plan details coming soon.")}</p>
        ${hasPrice ? `<button class="button subscribe-button" data-plan-id="${escapeHtml(plan.id)}" type="button">Start checkout</button>` : ""}
      </article>
    `;
  }).join("");
}

function renderDashboard(data) {
  const subscription = data.subscription;
  dashboardSummaryEl.innerHTML = `
    <article class="stat-card"><span>Plan</span><strong>${displayValue(subscription?.planId, "None")}</strong></article>
    <article class="stat-card"><span>Status</span><strong>${displayValue(subscription?.status, "Not active")}</strong></article>
    <article class="stat-card"><span>eSIMs</span><strong>${Number(data.summary.total) || 0}</strong></article>
    <article class="stat-card"><span>Data used</span><strong>${formatBytes(data.summary.totalUsedBytes)}</strong></article>
  `;

  if (!data.esims.length) {
    esimListEl.innerHTML = `<article class="card"><h3>No eSIMs yet</h3><p>Once a profile is provisioned, it will appear here with installation and usage information.</p></article>`;
    return;
  }

  esimListEl.innerHTML = data.esims.map((order) => {
    const percentUsed = safePercent(order.usage?.percentUsed);
    const limitBytes = Number(order.usage?.limitBytes || 0);
    return `
      <article class="card esim-card">
        <div class="esim-heading">
          <div>
            <p class="eyebrow">${displayValue(order.status, "pending")}</p>
            <h3>${displayValue(order.bundleName, "eSIM plan")}</h3>
          </div>
          <span class="badge">${displayValue(order.country, "Global")}</span>
        </div>
        <div class="usage-row">
          <span>Used ${formatBytes(order.usage?.usedBytes)}</span>
          <span>${limitBytes > 0 ? `${formatBytes(order.usage?.remainingBytes)} remaining` : "Allowance pending"}</span>
        </div>
        <div class="usage-bar"><span style="width:${percentUsed}%"></span></div>
        <dl class="details-grid">
          <div><dt>Device</dt><dd>${displayValue(order.device)}</dd></div>
          <div><dt>Activated</dt><dd>${formatDate(order.activatedAt)}</dd></div>
          <div><dt>ICCID</dt><dd>${displayValue(order.install?.iccid, "Pending")}</dd></div>
          <div><dt>SM-DP+</dt><dd>${displayValue(order.install?.smdpAddress, "Pending")}</dd></div>
        </dl>
        ${order.install?.activationCode ? `<details><summary>Installation code</summary><code>${escapeHtml(order.install.activationCode)}</code></details>` : ""}
        ${order.provider === "mock" ? `<button class="button secondary usage-button" type="button" data-order-id="${escapeHtml(order.id)}">Simulate 100 MB use</button>` : ""}
      </article>
    `;
  }).join("");
}

async function refreshDashboard() {
  if (!token) {
    dashboardSection.hidden = true;
    return;
  }
  const data = await api("/api/dashboard");
  dashboardSection.hidden = false;
  renderDashboard(data);
}

async function refreshAccount() {
  if (!token) {
    accountSummaryEl.textContent = "Not signed in.";
    logoutButton.hidden = true;
    dashboardSection.hidden = true;
    return;
  }

  try {
    const data = await api("/api/account");
    const subscription = data.subscription;
    accountSummaryEl.innerHTML = `<strong>${escapeHtml(data.user.email)}</strong><br>${subscription ? `Plan: ${displayValue(subscription.planId)} · Status: ${displayValue(subscription.status)}` : "No subscription yet."}`;
    logoutButton.hidden = false;
    await refreshDashboard();
  } catch {
    token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    accountSummaryEl.textContent = "Session expired. Sign in again.";
    logoutButton.hidden = true;
    dashboardSection.hidden = true;
  }
}

async function submitAuth(form, endpoint) {
  authResultEl.textContent = "Working…";
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const data = await api(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    token = data.session.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    form.reset();
    authResultEl.textContent = "Signed in successfully.";
    await refreshAccount();
  } catch (error) {
    authResultEl.textContent = error.message.replaceAll("_", " ");
  }
}

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth(registerForm, "/api/auth/register");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitAuth(loginForm, "/api/auth/login");
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {}
  token = "";
  sessionStorage.removeItem(TOKEN_KEY);
  authResultEl.textContent = "Signed out.";
  await refreshAccount();
});

refreshDashboardButton.addEventListener("click", () => {
  refreshDashboard().catch((error) => {
    authResultEl.textContent = error.message.replaceAll("_", " ");
  });
});

esimListEl.addEventListener("click", async (event) => {
  const button = event.target.closest(".usage-button");
  if (!button) return;
  button.disabled = true;
  try {
    await api(`/api/esims/orders/${encodeURIComponent(button.dataset.orderId)}/usage/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usedMegabytes: 100 })
    });
    await refreshDashboard();
  } catch (error) {
    authResultEl.textContent = error.message.replaceAll("_", " ");
    button.disabled = false;
  }
});

plansEl.addEventListener("click", async (event) => {
  const button = event.target.closest(".subscribe-button");
  if (!button) return;
  if (!token) {
    authResultEl.textContent = "Create an account or sign in before checkout.";
    document.querySelector("#account").scrollIntoView({ behavior: "smooth" });
    return;
  }

  button.disabled = true;
  button.textContent = "Opening checkout…";
  try {
    const data = await api("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId: button.dataset.planId })
    });
    window.location.assign(checkoutUrl(data.checkout.url));
  } catch (error) {
    authResultEl.textContent = error.message.replaceAll("_", " ");
    button.disabled = false;
    button.textContent = "Start checkout";
  }
});

coverageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  coverageResultEl.textContent = "Checking…";
  const payload = Object.fromEntries(new FormData(coverageForm).entries());

  try {
    const data = await api("/api/coverage/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const message = displayValue(data.message || data.reason, "Coverage has not been confirmed yet.");
    coverageResultEl.innerHTML = data.supported
      ? `<strong>Prototype match found.</strong><br>${message}`
      : `<strong>Not confirmed yet.</strong><br>${message}`;
  } catch (error) {
    coverageResultEl.textContent = error.message.replaceAll("_", " ");
  }
});

const checkoutState = new URLSearchParams(window.location.search).get("checkout");
if (checkoutState === "success") authResultEl.textContent = "Checkout completed. Subscription status will update after the payment webhook arrives.";
if (checkoutState === "cancelled") authResultEl.textContent = "Checkout was cancelled.";
if (checkoutState === "mock") authResultEl.textContent = "Mock checkout opened successfully.";

Promise.all([loadPlans(), refreshAccount()]).catch(() => {
  plansEl.textContent = "Plans are temporarily unavailable.";
});
