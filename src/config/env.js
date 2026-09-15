export function booleanEnv(name, fallback = false) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return value === "true";
}

export function validatedBooleanEnv(name, fallback = false) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  if (value !== "true" && value !== "false") {
    throw new Error(`${name} must be either true or false when set.`);
  }
  return value === "true";
}
