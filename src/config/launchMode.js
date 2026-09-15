export function resolvePublicLaunchMode(value = process.env.PUBLIC_LAUNCH_MODE) {
  const setting = String(value || "waitlist").trim().toLowerCase();
  return setting === "internal" ? "internal" : "waitlist";
}

export function publicLaunchMode() {
  return resolvePublicLaunchMode();
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
    pathname === "/api/coverage/check" ||
    pathname === "/api/provider/catalogue"
  );
}
