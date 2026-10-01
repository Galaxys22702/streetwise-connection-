const form = document.querySelector("#service-request-form");
const division = document.querySelector("#division");
const service = document.querySelector("#service");
const submit = document.querySelector("#service-request-submit");
const result = document.querySelector("#service-request-result");

const services = {
  connect: [
    ["wifi-setup", "Wi-Fi setup"],
    ["router-configuration", "Router configuration"],
    ["mesh-wifi-setup", "Mesh Wi-Fi setup"],
    ["network-troubleshooting", "Network troubleshooting"],
    ["network-setup", "Network setup"],
    ["network-documentation", "Network documentation"]
  ],
  support: [
    ["computer-setup", "Computer setup"],
    ["device-setup", "Device setup"],
    ["technical-troubleshooting", "Technical troubleshooting"],
    ["data-migration", "Data migration"],
    ["backup-setup", "Backup setup"],
    ["remote-technical-support", "Remote technical support"],
    ["technology-guidance", "Technology guidance"]
  ],
  secure: [
    ["account-security-review", "Account security review"],
    ["mfa-setup", "MFA setup"],
    ["password-manager-setup", "Password manager setup"],
    ["device-hardening", "Device hardening"],
    ["router-security", "Router security"],
    ["privacy-security-configuration", "Privacy & security configuration"],
    ["security-awareness", "Security awareness"],
    ["basic-security-assessment", "Basic security assessment"]
  ],
  business: [
    ["business-it-setup", "Business IT setup"],
    ["microsoft-365-setup", "Microsoft 365 setup"],
    ["google-workspace-setup", "Google Workspace setup"],
    ["business-network-setup", "Business network setup"],
    ["device-deployment", "Device deployment"],
    ["backup-recovery-planning", "Backup & recovery planning"],
    ["it-documentation", "IT documentation"],
    ["ongoing-business-it-support", "Ongoing business IT support"]
  ]
};

function setServices() {
  const selected = division.value;
  service.replaceChildren();

  if (!services[selected]) {
    service.disabled = true;
    service.append(new Option("Choose a service area first", ""));
    return;
  }

  service.disabled = false;
  service.append(new Option("Select a service", ""));
  for (const [value, label] of services[selected]) {
    service.append(new Option(label, value));
  }
}

division.addEventListener("change", setServices);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  result.textContent = "Submitting…";

  const body = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch("/api/service-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "service_request_failed");

    form.reset();
    setServices();
    result.textContent = data.message || "Service request received.";
  } catch (error) {
    result.textContent = error.message.replaceAll("_", " ");
  } finally {
    submit.disabled = false;
  }
});
