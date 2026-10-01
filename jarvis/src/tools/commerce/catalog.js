export function createCatalogue(products = []) {
  const items = new Map();

  for (const product of products) {
    validateProduct(product);
    if (items.has(product.id)) throw new Error(`product_already_registered:${product.id}`);
    items.set(product.id, Object.freeze({ ...product }));
  }

  function list() {
    return [...items.values()];
  }

  function get(id) {
    return items.get(id);
  }

  function search(query = "") {
    const term = String(query).trim().toLowerCase();
    if (!term) return list();
    return list().filter(product =>
      `${product.name} ${product.description || ""}`.toLowerCase().includes(term)
    );
  }

  return Object.freeze({ list, get, search });
}

function validateProduct(product) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new TypeError("product must be an object");
  }
  if (typeof product.id !== "string" || !product.id.trim()) {
    throw new TypeError("product.id is required");
  }
  if (typeof product.name !== "string" || !product.name.trim()) {
    throw new TypeError("product.name is required");
  }
  if (!Number.isInteger(product.priceCents) || product.priceCents < 0) {
    throw new TypeError("product.priceCents must be a non-negative integer");
  }
}
