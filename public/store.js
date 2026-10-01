const plansEl = document.querySelector("#store-plans");
const statusEl = document.querySelector("#store-status");
const cartPanel = document.querySelector("#cart-panel");
const cartItemsEl = document.querySelector("#cart-items");
const cartTotalEl = document.querySelector("#cart-total");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutResult = document.querySelector("#checkout-result");

let plans = [];
let storeOpen = false;
let selectedPlan = null;

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value));
}

function renderPlans() {
  plansEl.replaceChildren();

  for (const plan of plans) {
    const card = document.createElement("article");
    card.className = "service-card" + (plan.id === selectedPlan?.id ? " featured-service" : "");

    const top = document.createElement("div");
    const audience = document.createElement("span");
    audience.textContent = plan.audience === "commercial" ? "BUSINESS" : "RESIDENTIAL";
    const price = document.createElement("strong");
    price.textContent = money(plan.priceUsd) + "/mo";
    top.append(audience, price);

    const title = document.createElement("h2");
    title.textContent = plan.name;

    const description = document.createElement("p");
    description.textContent = plan.description;

    const button = document.createElement("button");
    button.className = "button";
    button.type = "button";
    button.textContent = storeOpen && plan.status === "sellable" ? "Add to order ↗" : "Not available yet";
    button.disabled = !(storeOpen && plan.status === "sellable");
    button.addEventListener("click", () => {
      selectedPlan = plan;
      renderPlans();
      renderCart();
    });

    card.append(top, title, description, button);
    plansEl.append(card);
  }
}

function renderCart() {
  if (!selectedPlan) {
    cartPanel.hidden = true;
    return;
  }

  cartPanel.hidden = false;
  cartItemsEl.replaceChildren();

  const item = document.createElement("p");
  item.textContent = selectedPlan.name + " · " + money(selectedPlan.priceUsd) + "/month";
  cartItemsEl.append(item);
  cartTotalEl.textContent = money(selectedPlan.priceUsd) + "/mo";
}

async function loadStore() {
  const [statusResponse, plansResponse] = await Promise.all([
    fetch("/api/public-status", { headers: { accept: "application/json" } }),
    fetch("/api/plans", { headers: { accept: "application/json" } })
  ]);

  const status = await statusResponse.json();
  const planData = await plansResponse.json();

  if (!statusResponse.ok || !plansResponse.ok) throw new Error("store_unavailable");

  plans = Array.isArray(planData.plans) ? planData.plans : [];
  storeOpen = status.publicLaunchMode !== "waitlist" &&
    plans.some(plan => plan.status === "sellable");

  statusEl.textContent = storeOpen
    ? "Store open. Select a sellable plan to begin."
    : "Store preview. Public sales are currently locked.";

  renderPlans();
}

checkoutButton.addEventListener("click", async () => {
  if (!selectedPlan) return;

  checkoutButton.disabled = true;
  checkoutResult.textContent = "Preparing secure checkout…";

  try {
    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ planId: selectedPlan.id })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (data.error === "authentication_required") {
        throw new Error("Please sign in to continue to checkout.");
      }
      throw new Error(String(data.error || "checkout_unavailable").replaceAll("_", " "));
    }

    if (data.checkout?.url) window.location.assign(data.checkout.url);
    else throw new Error("checkout_url_missing");
  } catch (error) {
    checkoutResult.textContent = error.message;
  } finally {
    checkoutButton.disabled = false;
  }
});

loadStore().catch(() => {
  statusEl.textContent = "The storefront is temporarily unavailable.";
  plansEl.replaceChildren();
  const card = document.createElement("article");
  card.className = "service-card";
  card.innerHTML = "<h2>Store unavailable</h2><p>Please check back later.</p>";
  plansEl.append(card);
});
