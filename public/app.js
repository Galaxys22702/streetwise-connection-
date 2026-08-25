const plansEl = document.querySelector("#plans");
const form = document.querySelector("#coverage-form");
const resultEl = document.querySelector("#coverage-result");

async function loadPlans() {
  const response = await fetch("/api/plans");
  const data = await response.json();

  plansEl.innerHTML = data.plans.map((plan) => `
    <article class="card">
      <p class="eyebrow">${plan.status}</p>
      <h3>${plan.name}</h3>
      <p class="price">${plan.priceUsd ? `$${plan.priceUsd}` : "Flexible"}<small>${plan.priceUsd ? "/mo" : ""}</small></p>
      <p>${plan.description}</p>
    </article>
  `).join("");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resultEl.textContent = "Checking…";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch("/api/coverage/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  resultEl.innerHTML = data.supported
    ? `<strong>Prototype match found.</strong><br>${data.message}`
    : `<strong>Not confirmed yet.</strong><br>${data.message || data.reason}`;
});

loadPlans().catch(() => {
  plansEl.textContent = "Plans are temporarily unavailable.";
});
