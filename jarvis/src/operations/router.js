import { operationRoutes } from "./task.js";

export function createOperationRouter({ routes = {} } = {}) {
  if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
    throw new TypeError("routes must be an object");
  }

  const table = new Map();

  for (const [capability, route] of Object.entries(routes)) {
    if (typeof capability !== "string" || !capability.trim()) {
      throw new TypeError("route capability must be a non-empty string");
    }
    if (!Object.values(operationRoutes).includes(route)) {
      throw new TypeError("route must be TECH, CALLER, or OPS");
    }
    if (table.has(capability)) throw new Error(`route_already_registered:${capability}`);
    table.set(capability, route);
  }

  function resolve(capability) {
    if (typeof capability !== "string" || !capability.trim()) {
      throw new TypeError("capability is required");
    }
    return table.get(capability) || null;
  }

  function list() {
    return Object.freeze([...table.entries()].map(([capability, route]) => ({
      capability,
      route
    })));
  }

  return Object.freeze({ resolve, list });
}
