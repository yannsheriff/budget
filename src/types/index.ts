import { Decimal } from "@prisma/client/runtime/library";

// ─── Enums (mirror Prisma) ───────────────────────────

export type ExpenseType = "RECURRING" | "DIVERSE" | "SAVINGS";
export type ExpenseFrequency = "MONTHLY" | "WEEKLY";

// ─── Serialized types (Decimal → number for client) ──

export type MonthData = {
  id: string;
  year: number;
  month: number;
  salary: number;
  overdraft: number;
  weeklyEverydayBudget: number;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  expenses: ExpenseData[];
  incomes: IncomeData[];
};

export type ExpenseData = {
  id: string;
  monthId: string;
  type: ExpenseType;
  label: string;
  amount: number;
  frequency: ExpenseFrequency;
  category: string | null;
  bankLabel: string | null;
  isConfirmed: boolean;
  isRemainder: boolean;
  isFromReconciliation: boolean;
  installmentId: string | null;
  createdAt: string;
};

export type IncomeData = {
  id: string;
  monthId: string;
  label: string;
  amount: number;
  createdAt: string;
};

// ─── Budget calculation types ────────────────────────

export type MonthSummary = {
  budgetReel: number;
  totalIncomes: number;
  totalRecurring: number;
  totalEveryday: number;
  totalDiverse: number;
  totalSavings: number;
  totalUnpredicted: number;
  reste: number;
  remainderSavings: number;
  status: "green" | "orange" | "red";
};

// ─── API request types ───────────────────────────────

export type CreateExpenseInput = {
  monthId: string;
  type: ExpenseType;
  label: string;
  amount: number;
  frequency?: ExpenseFrequency;
  category?: string;
  isRemainder?: boolean;
};

export type UpdateExpenseInput = {
  label?: string;
  amount?: number;
  frequency?: ExpenseFrequency;
  category?: string;
  isConfirmed?: boolean;
  isRemainder?: boolean;
};

export type CreateIncomeInput = {
  monthId: string;
  label: string;
  amount: number;
};

export type UpdateMonthInput = {
  salary?: number;
  overdraft?: number;
  weeklyEverydayBudget?: number;
  isConfirmed?: boolean;
};
