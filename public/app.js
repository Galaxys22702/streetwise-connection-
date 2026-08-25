const plansEl = document.querySelector("#plans");
const coverageForm = document.querySelector("#coverage-form");
const coverageResultEl = document.querySelector("#coverage-result");
const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const authResultEl = document.querySelector("#auth-result");
const accountSummaryEl = document.querySelector("#account-summary");
const logoutButton = document.querySelector("#logout-button");

const TOKEN_KEY = "streetwise_session_token";
let token = sessionStorage.getItem(TOKEN_KEY) || "";

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `request_failed_${response.status}`);
  return data;
}

async function loadPlans() {
  const data = await api("/api/plans");
  plansEl.innerHTML = data.plans.map((plan) => `
    <article class="card">
      <p class="eyebrow">${plan.status}</p>
      <h3>${plan.name}</h3>
      <p class="price">${plan.priceUsd ? `$${plan.priceUsd}` : "Flexible"}<small>${plan.priceUsd ? "/mo" : ""}</small></p>
      <p>${plan.description}</p>
      ${plan.priceUsd ? `<button class="button subscribe-button" data-plan-id="${plan.id}" type="button">Start checkout</button>` : ""}
    </article>
  `).join("");
}

async function refreshAccount() {
  if (!token) {
    accountSummaryEl.textContent = "Not signed in.";
    logoutButton.hidden = true;
    return;
  }

  try {
    const data = await api("/api/account");
    const subscription = data.subscription;
    accountSummaryEl.innerHTML = `<strong>${data.user.email}</strong><br>${subscription ? `Plan: ${subscription.planId} · Status: ${subscription.status}` : "No subscription yet."}`;
    logoutButton.hidden = false;
  } catch {
    token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    accountSummaryEl.textContent = "Session expired. Sign in again.";
    logoutButton.hidden = true;
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
    window.location.assign(data.checkout.url);
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
    coverageResultEl.innerHTML = data.supported
      ? `<strong>Prototype match found.</strong><br>${data.message}`
      : `<strong>Not confirmed yet.</strong><br>${data.message || data.reason}`;
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
