const TOKEN_KEY = "streetwise_session_token";
const emailEl = document.querySelector("#account-email");
const passwordEl = document.querySelector("#account-password");
const submitEl = document.querySelector("#account-submit");
const toggleEl = document.querySelector("#account-toggle");
const logoutEl = document.querySelector("#account-logout");
const titleEl = document.querySelector("#form-title");
const statusEl = document.querySelector("#account-status");

let registerMode = false;

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setMessage(message) {
  statusEl.textContent = message || "";
}

async function currentAccount() {
  const value = token();
  if (!value) return null;
  const response = await fetch("/api/account", {
    headers: { accept: "application/json", authorization: "Bearer " + value }
  });
  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return (await response.json()).user || null;
}

function renderLoggedOut() {
  titleEl.textContent = registerMode ? "Create account" : "Sign in";
  submitEl.textContent = registerMode ? "Create account ↗" : "Sign in ↗";
  toggleEl.textContent = registerMode ? "I already have an account" : "Create an account instead";
  logoutEl.hidden = true;
  emailEl.disabled = false;
  passwordEl.disabled = false;
  submitEl.hidden = false;
  toggleEl.hidden = false;
}

function renderLoggedIn(user) {
  titleEl.textContent = "Signed in";
  setMessage("Signed in as " + user.email + ".");
  emailEl.disabled = true;
  passwordEl.disabled = true;
  submitEl.hidden = true;
  toggleEl.hidden = true;
  logoutEl.hidden = false;
}

async function refresh() {
  const user = await currentAccount();
  if (user) renderLoggedIn(user);
  else renderLoggedOut();
}

toggleEl.addEventListener("click", () => {
  registerMode = !registerMode;
  setMessage("");
  renderLoggedOut();
});

submitEl.addEventListener("click", async () => {
  setMessage("");
  submitEl.disabled = true;
  try {
    const endpoint = registerMode ? "/api/auth/register" : "/api/auth/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: emailEl.value, password: passwordEl.value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(data.error || "account_request_failed").replaceAll("_", " "));
    localStorage.setItem(TOKEN_KEY, data.session.token);
    passwordEl.value = "";
    setMessage("Account ready. You can return to the store.");
    renderLoggedIn(data.user);
  } catch (error) {
    setMessage(error.message);
  } finally {
    submitEl.disabled = false;
  }
});

logoutEl.addEventListener("click", async () => {
  const value = token();
  try {
    if (value) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { accept: "application/json", authorization: "Bearer " + value }
      });
    }
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    registerMode = false;
    setMessage("Signed out.");
    renderLoggedOut();
  }
});

// The public website is in waitlist-only mode until cellular launch gates pass.
// Do not display actionable login/register controls when the API deliberately returns 503.
async function initializeAccountPage() {
  let status;
  try {
    const response = await fetch("/api/public-status", {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error("public_status_unavailable");
    status = await response.json();
  } catch {
    status = null;
  }
  if (status?.publicLaunchMode !== "internal") {
    emailEl.disabled = true;
    passwordEl.disabled = true;
    submitEl.hidden = true;
    toggleEl.hidden = true;
    logoutEl.hidden = true;
    titleEl.textContent = "Accounts are not open";
    setMessage(status?.publicLaunchMode === "waitlist"
      ? "Customer accounts and paid cellular plans are not open yet. You can join the launch waitlist or request independent phone setup help."
      : "Account availability could not be verified. Account actions are temporarily unavailable.");
    return;
  }
  await refresh();
}

initializeAccountPage().catch(() => setMessage("Account service is temporarily unavailable."));