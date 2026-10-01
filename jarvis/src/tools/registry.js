export function createToolRegistry() {
  const tools = new Map();

  function register(tool) {
    if (!tool || typeof tool.id !== "string" || !tool.id.trim()) throw new TypeError("tool.id is required");
    if (typeof tool.execute !== "function") throw new TypeError("tool.execute must be a function");
    if (!Number.isInteger(tool.riskTier) || tool.riskTier < 0 || tool.riskTier > 3) {
      throw new TypeError("tool.riskTier must be an integer from 0 to 3");
    }
    if (tools.has(tool.id)) throw new Error(`tool_already_registered:${tool.id}`);
    tools.set(tool.id, Object.freeze({ ...tool }));
    return tool.id;
  }

  return Object.freeze({
    register,
    get(id) { return tools.get(id); },
    has(id) { return tools.has(id); },
    list() { return [...tools.values()].map(({ execute, ...tool }) => tool); }
  });
}
