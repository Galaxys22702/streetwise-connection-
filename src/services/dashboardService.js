import { getSubscriptionForUser } from "./paymentService.js";
import { listEsimOrdersForUser } from "./esimService.js";

function summarizeOrders(orders) {
  const active = orders.filter((order) => ["completed", "active", "installed"].includes(order.status));
  const totalUsedBytes = active.reduce((sum, order) => sum + Number(order.usage?.usedBytes || 0), 0);
  const totalLimitBytes = active.reduce((sum, order) => sum + Number(order.usage?.limitBytes || 0), 0);
  return {
    total: orders.length,
    active: active.length,
    totalUsedBytes,
    totalLimitBytes: totalLimitBytes || null
  };
}

export async function getCustomerDashboard(user) {
  const [subscription, esims] = await Promise.all([
    getSubscriptionForUser(user.id),
    listEsimOrdersForUser(user.id)
  ]);

  return {
    user,
    subscription,
    esims,
    summary: summarizeOrders(esims)
  };
}
