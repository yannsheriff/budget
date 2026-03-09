/**
 * Client-side API helpers for mutations.
 * All functions call the Next.js API routes and return JSON.
 */

const BASE = "";

// ─── Months ──────────────────────────────────────────

export async function updateMonth(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/months/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createMonth(year: number, month: number) {
  const res = await fetch(`${BASE}/api/months`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month }),
  });
  return res.json();
}

// ─── Expenses ────────────────────────────────────────

export async function createExpense(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateExpense(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/expenses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteExpense(id: string) {
  const res = await fetch(`${BASE}/api/expenses/${id}`, {
    method: "DELETE",
  });
  return res.json();
}

// ─── Incomes ─────────────────────────────────────────

export async function createIncome(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/incomes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateIncome(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/api/incomes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteIncome(id: string) {
  const res = await fetch(`${BASE}/api/incomes/${id}`, {
    method: "DELETE",
  });
  return res.json();
}
