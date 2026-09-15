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

export function integerEnv(name, { fallback, min, max } = {}) {
  const raw = String(process.env[name] ?? "").trim();
  const value = raw ? Number(raw) : fallback;

  if (!Number.isInteger(value) || (min != null && value < min) || (max != null && value > max)) {
    const range = min != null && max != null
      ? ` between ${min} and ${max}`
      : min != null
        ? ` greater than or equal to ${min}`
        : max != null
          ? ` less than or equal to ${max}`
          : "";
    throw new Error(`${name} must be an integer${range}.`);
  }

  return value;
}
