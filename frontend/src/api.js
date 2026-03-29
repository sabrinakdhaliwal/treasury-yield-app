/**
 * API client — all backend requests live here.
 * Base URL defaults to same origin (proxied in dev via package.json).
 */

const BASE = process.env.REACT_APP_API_URL || '';

export async function fetchYields() {
  const res = await fetch(`${BASE}/api/yields`);
  if (!res.ok) throw new Error('Failed to fetch yield data');
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${BASE}/api/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function createOrder({ term, amount, notes }) {
  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term, amount: Number(amount), notes: notes || null }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to submit order');
  }
  return res.json();
}

export async function deleteOrder(id) {
  const res = await fetch(`${BASE}/api/orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete order');
  return res.json();
}
