const waitlistForm = document.querySelector("#waitlist-form");
const waitlistSubmit = document.querySelector("#waitlist-submit");
const waitlistResult = document.querySelector("#waitlist-result");
const waitlistContact = document.querySelector("#waitlist-contact");
let consentVersion = "";

function setWaitlistOpen(open, message, updateMessage = true) {
  for (const control of waitlistForm.querySelectorAll("input, button")) {
    control.disabled = !open;
  }
  if (updateMessage) waitlistResult.textContent = message;
}

async function loadPublicStatus({ updateMessage = true } = {}) {
  const response = await fetch("/api/public-status", { headers: { accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "status_unavailable");

  const waitlist = data.waitlist || {};
  consentVersion = String(waitlist.consentVersion || "");
  setWaitlistOpen(Boolean(waitlist.open), String(waitlist.message || "Waitlist status is unavailable."), updateMessage);

  if (waitlist.supportEmail) {
    waitlistContact.hidden = false;
    const link = document.createElement("a");
    link.href = `mailto:${waitlist.supportEmail}`;
    link.textContent = waitlist.supportEmail;
    waitlistContact.replaceChildren("Questions? ", link);
  }
}

waitlistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  waitlistSubmit.disabled = true;
  waitlistResult.textContent = "Joining…";

  try {
    const email = new FormData(waitlistForm).get("email");
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email, consentVersion })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "waitlist_request_failed");
    waitlistForm.reset();
    waitlistResult.textContent = data.message || "You’re on the waitlist.";
  } catch (error) {
    waitlistResult.textContent = error.message === "waitlist_not_open"
      ? "The waitlist is not open yet. Please check back soon."
      : error.message.replaceAll("_", " ");
  } finally {
    await loadPublicStatus({ updateMessage: false }).catch(() => {
      waitlistSubmit.disabled = true;
    });
  }
});

loadPublicStatus().catch(() => {
  setWaitlistOpen(false, "The waitlist is temporarily unavailable. Please check back soon.");
});
