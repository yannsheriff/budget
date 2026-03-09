/**
 * Client-side API helpers for mutations.
 * All functions call the Next.js API routes and return JSON.
 * Throws on non-OK responses for centralized error handling.
 */

const BASE = "";

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

function post(url: string, data: unknown) {
  return request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function patch(url: string, data: unknown) {
  return request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function del(url: string) {
  return request(url, { method: "DELETE" });
}

// ─── Months ──────────────────────────────────────────

export async function updateMonth(id: string, data: Record<string, unknown>) {
  return patch(`${BASE}/api/months/${id}`, data);
}

export async function createMonth(year: number, month: number) {
  return post(`${BASE}/api/months`, { year, month });
}

// ─── Expenses ────────────────────────────────────────

export async function createExpense(data: Record<string, unknown>) {
  return post(`${BASE}/api/expenses`, data);
}

export async function updateExpense(id: string, data: Record<string, unknown>) {
  return patch(`${BASE}/api/expenses/${id}`, data);
}

export async function deleteExpense(id: string) {
  return del(`${BASE}/api/expenses/${id}`);
}

// ─── Incomes ─────────────────────────────────────────

export async function createIncome(data: Record<string, unknown>) {
  return post(`${BASE}/api/incomes`, data);
}

export async function updateIncome(id: string, data: Record<string, unknown>) {
  return patch(`${BASE}/api/incomes/${id}`, data);
}

export async function deleteIncome(id: string) {
  return del(`${BASE}/api/incomes/${id}`);
}

// ─── Installments ────────────────────────────────────

export async function fetchInstallments() {
  return request(`${BASE}/api/installments`);
}

export async function createInstallment(data: {
  label: string;
  totalAmount: number;
  nbMonths: number;
  monthId: string;
}) {
  return post(`${BASE}/api/installments`, data);
}

export async function deleteInstallment(id: string) {
  return del(`${BASE}/api/installments/${id}`);
}
