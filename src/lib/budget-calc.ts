import { MonthData, MonthSummary } from "@/types";
import { getWeeksInMonth } from "./weeks";

const SECURITY_BUFFER = 100;

/**
 * Calculate the effective amount of an expense,
 * taking into account weekly frequency.
 */
function effectiveAmount(
  amount: number,
  frequency: "MONTHLY" | "WEEKLY",
  year: number,
  month: number
): number {
  if (frequency === "WEEKLY") {
    return amount * getWeeksInMonth(year, month);
  }
  return amount;
}

/**
 * Compute the full budget summary for a month.
 */
export function calculateMonthSummary(monthData: MonthData): MonthSummary {
  const { year, month, salary, overdraft, weeklyEverydayBudget, expenses, incomes } = monthData;

  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
  const budgetReel = salary + totalIncomes - overdraft;

  const totalRecurring = expenses
    .filter((e) => e.type === "RECURRING")
    .reduce(
      (sum, e) => sum + effectiveAmount(e.amount, e.frequency, year, month),
      0
    );

  const weeks = getWeeksInMonth(year, month);
  const totalEveryday = weeklyEverydayBudget * weeks;

  const totalDiverse = expenses
    .filter((e) => e.type === "DIVERSE")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSavings = expenses
    .filter((e) => e.type === "SAVINGS" && !e.isRemainder)
    .reduce((sum, e) => sum + e.amount, 0);

  const reste = budgetReel - totalRecurring - totalEveryday - totalDiverse - totalSavings;

  const remainderSavings = Math.max(0, reste - SECURITY_BUFFER);

  let status: "green" | "orange" | "red";
  if (reste >= SECURITY_BUFFER) {
    status = "green";
  } else if (reste >= 0) {
    status = "orange";
  } else {
    status = "red";
  }

  return {
    budgetReel,
    totalIncomes,
    totalRecurring,
    totalEveryday,
    totalDiverse,
    totalSavings,
    reste,
    remainderSavings,
    status,
  };
}
