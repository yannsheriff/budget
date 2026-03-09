import { Decimal } from "@prisma/client/runtime/library";

/**
 * Format a number as EUR currency.
 */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert a Prisma Decimal to a plain number.
 */
export function toNumber(value: Decimal | number): number {
  if (typeof value === "number") return value;
  return Number(value);
}

/**
 * Serialize a Prisma Month (with Decimals) to a plain MonthData object.
 */
export function serializeMonth(month: any) {
  return {
    ...month,
    salary: toNumber(month.salary),
    overdraft: toNumber(month.overdraft),
    weeklyEverydayBudget: toNumber(month.weeklyEverydayBudget),
    createdAt: month.createdAt.toISOString(),
    updatedAt: month.updatedAt.toISOString(),
    expenses: month.expenses?.map(serializeExpense) ?? [],
    incomes: month.incomes?.map(serializeIncome) ?? [],
  };
}

export function serializeExpense(expense: any) {
  return {
    ...expense,
    amount: toNumber(expense.amount),
    createdAt: expense.createdAt.toISOString(),
  };
}

export function serializeIncome(income: any) {
  return {
    ...income,
    amount: toNumber(income.amount),
    createdAt: income.createdAt.toISOString(),
  };
}
