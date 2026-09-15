export function resolvePublicLaunchMode(value) {
  return String(value || "waitlist").trim().toLowerCase() === "internal"
    ? "internal"
    : "waitlist";
}

const PUBLIC_LAUNCH_MODE = resolvePublicLaunchMode(process.env.PUBLIC_LAUNCH_MODE);

export function publicLaunchMode() {
  return PUBLIC_LAUNCH_MODE;
}

export function isPublicWaitlistOnly() {
  return publicLaunchMode() === "waitlist";
}

export function isCustomerServicePath(pathname) {
  return (
    pathname === "/api/account" ||
    pathname === "/api/dashboard" ||
    pathname === "/api/esims" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/esims/") ||
    pathname === "/api/payments/checkout" ||
    pathname === "/api/payments/subscription" ||
    pathname === "/api/payments/status" ||
    pathname === "/api/coverage/check" ||
    pathname === "/api/provider/catalogue" ||
    pathname === "/api/provider/status"
  );
}
