/**
 * Reconciliation logic: match bank statement lines against app expenses/incomes.
 */

import { BankLine } from "./csv-parser";

// ─── Types ──────────────────────────────────────────

export type MatchConfidence = "exact" | "probable" | "none";

export type MatchResult = {
  bankLine: BankLine;
  confidence: MatchConfidence;
  matchedExpenseId?: string;
  matchedExpenseLabel?: string;
};

export type ReconciliationResult = {
  matched: MatchResult[]; // exact matches
  probable: MatchResult[]; // probable matches
  unmatched: MatchResult[]; // no match found
  unmatchedCredits: MatchResult[]; // unmatched credits (revenues)
  everydayLifeComparison: {
    budgeted: number; // weeklyEverydayBudget * weeks
    actual: number; // sum of small everyday expenses from bank
    gap: number; // actual - budgeted
    lines: BankLine[]; // the lines included in everyday
  };
};

// ─── Everyday-life bank categories ──────────────────

const EVERYDAY_CATEGORIES = new Set([
  "restauration",
  "courses",
  "boulangerie",
  "alimentation",
  "supermarche",
  "supermarch\u00e9",
  "restaurant",
  "caf\u00e9",
  "cafe",
  "fast-food",
  "fast food",
  "snack",
]);

const SMALL_AMOUNT_THRESHOLD = 15;

// ─── Helpers ────────────────────────────────────────

/**
 * Lowercase and collapse extra whitespace.
 */
export function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Compute a similarity score between two labels (0 to 1).
 *
 * Split both into words, count how many words from the shorter label
 * appear in the longer one, and divide by the shorter word count.
 */
export function labelSimilarity(a: string, b: string): number {
  const wordsA = normalizeLabel(a).split(" ").filter(Boolean);
  const wordsB = normalizeLabel(b).split(" ").filter(Boolean);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const [shorter, longer] =
    wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA];

  const longerSet = new Set(longer);
  const matches = shorter.filter((w) => longerSet.has(w)).length;

  return matches / shorter.length;
}

// ─── Main reconciliation ────────────────────────────

export function reconcile(
  debits: BankLine[],
  credits: BankLine[],
  expenses: {
    id: string;
    label: string;
    amount: number;
    bankLabel: string | null;
    type: string;
    frequency: string;
  }[],
  incomes: { id: string; label: string; amount: number }[],
  weeklyEverydayBudget: number,
  weeksInMonth: number
): ReconciliationResult {
  // Track which expenses have already been matched (1:1 constraint)
  const matchedExpenseIds = new Set<string>();

  // ── Step 1: Separate everyday-life bank lines from the rest ──

  const everydayLines: BankLine[] = [];
  const nonEverydayDebits: BankLine[] = [];

  for (const line of debits) {
    if (isEverydayLine(line, expenses)) {
      everydayLines.push(line);
    } else {
      nonEverydayDebits.push(line);
    }
  }

  // ── Step 2: Match non-everyday debits against expenses ──

  const matched: MatchResult[] = [];
  const probable: MatchResult[] = [];
  const unmatched: MatchResult[] = [];

  // Pass 1 — exact matches (bankLabel)
  const pendingDebits: BankLine[] = [];

  for (const line of nonEverydayDebits) {
    const normalizedLine = normalizeLabel(line.label);
    let found = false;

    for (const exp of expenses) {
      if (matchedExpenseIds.has(exp.id)) continue;
      if (!exp.bankLabel) continue;

      if (normalizeLabel(exp.bankLabel) === normalizedLine) {
        matched.push({
          bankLine: line,
          confidence: "exact",
          matchedExpenseId: exp.id,
          matchedExpenseLabel: exp.label,
        });
        matchedExpenseIds.add(exp.id);
        found = true;
        break;
      }
    }

    if (!found) {
      pendingDebits.push(line);
    }
  }

  // Pass 2 — probable matches (same amount + label similarity > 0.3)
  const stillPending: BankLine[] = [];

  for (const line of pendingDebits) {
    const absAmount = Math.abs(line.amount);
    let bestMatch: {
      expense: (typeof expenses)[number];
      similarity: number;
    } | null = null;

    for (const exp of expenses) {
      if (matchedExpenseIds.has(exp.id)) continue;

      // Amounts must match exactly (comparing absolute values)
      if (Math.abs(absAmount - exp.amount) > 0.01) continue;

      const sim = labelSimilarity(line.label, exp.label);
      if (sim > 0.3 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { expense: exp, similarity: sim };
      }
    }

    if (bestMatch) {
      probable.push({
        bankLine: line,
        confidence: "probable",
        matchedExpenseId: bestMatch.expense.id,
        matchedExpenseLabel: bestMatch.expense.label,
      });
      matchedExpenseIds.add(bestMatch.expense.id);
    } else {
      stillPending.push(line);
    }
  }

  // Pass 3 — unmatched debits
  for (const line of stillPending) {
    unmatched.push({
      bankLine: line,
      confidence: "none",
    });
  }

  // ── Step 3: Match credits against incomes ──

  const matchedIncomeIds = new Set<string>();
  const unmatchedCredits: MatchResult[] = [];

  for (const line of credits) {
    const absAmount = Math.abs(line.amount);
    let found = false;

    for (const inc of incomes) {
      if (matchedIncomeIds.has(inc.id)) continue;
      if (Math.abs(absAmount - inc.amount) > 0.01) continue;

      matched.push({
        bankLine: line,
        confidence: "exact",
        matchedExpenseId: inc.id,
        matchedExpenseLabel: inc.label,
      });
      matchedIncomeIds.add(inc.id);
      found = true;
      break;
    }

    if (!found) {
      unmatchedCredits.push({
        bankLine: line,
        confidence: "none",
      });
    }
  }

  // ── Step 4: Everyday life comparison ──

  const budgeted = weeklyEverydayBudget * weeksInMonth;
  const actual = everydayLines.reduce((sum, l) => sum + Math.abs(l.amount), 0);

  return {
    matched,
    probable,
    unmatched,
    unmatchedCredits,
    everydayLifeComparison: {
      budgeted,
      actual,
      gap: actual - budgeted,
      lines: everydayLines,
    },
  };
}

// ─── Internal helpers ───────────────────────────────

/**
 * Determine if a bank line is an "everyday life" expense.
 *
 * A line qualifies if its bank category matches known everyday categories,
 * OR if its absolute amount is small (< 15 EUR) and it doesn't match
 * any specific expense by bankLabel.
 */
function isEverydayLine(
  line: BankLine,
  expenses: { bankLabel: string | null }[]
): boolean {
  const normalizedCategory = normalizeLabel(line.category);

  // Check if the category matches any known everyday category
  for (const cat of EVERYDAY_CATEGORIES) {
    if (normalizedCategory.includes(cat)) {
      return true;
    }
  }

  // Small amounts that don't match any expense bankLabel
  if (Math.abs(line.amount) < SMALL_AMOUNT_THRESHOLD) {
    const normalizedLine = normalizeLabel(line.label);
    const matchesExpense = expenses.some(
      (exp) =>
        exp.bankLabel && normalizeLabel(exp.bankLabel) === normalizedLine
    );
    if (!matchesExpense) {
      return true;
    }
  }

  return false;
}
