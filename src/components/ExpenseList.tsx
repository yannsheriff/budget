"use client";

import { useState, useEffect } from "react";
import { ExpenseData, ExpenseType, ExpenseFrequency } from "@/types";
import { formatEur } from "@/lib/formatters";
import { createExpense, updateExpense, deleteExpense, updateMonth } from "@/lib/api";
import { getWeeksInMonth } from "@/lib/weeks";
import { useToast } from "@/components/Toast";

type Props = {
  expenses: ExpenseData[];
  type: ExpenseType;
  monthId: string;
  year: number;
  month: number;
  title: string;
  icon: string;
  showConfirm?: boolean;
  showCategory?: boolean;
  showFrequency?: boolean;
  filterReconciliation?: "only" | "exclude";
  onUpdate: () => void;
};

function getEffectiveAmount(expense: ExpenseData, weeks: number): number {
  if (expense.frequency === "WEEKLY") return expense.amount * weeks;
  return expense.amount;
}

export default function ExpenseList({
  expenses,
  type,
  monthId,
  year,
  month,
  title,
  icon,
  showConfirm = false,
  showCategory = false,
  showFrequency = false,
  filterReconciliation,
  onUpdate,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newFrequency, setNewFrequency] = useState<ExpenseFrequency>("MONTHLY");
  const [newCategory, setNewCategory] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  let filtered = expenses.filter((e) => e.type === type);
  if (filterReconciliation === "only") {
    filtered = expenses.filter((e) => e.isFromReconciliation);
  } else if (filterReconciliation === "exclude") {
    filtered = filtered.filter((e) => !e.isFromReconciliation);
  }
  const weeks = getWeeksInMonth(year, month);

  const total = filtered.reduce((sum, e) => sum + getEffectiveAmount(e, weeks), 0);

  // Fetch category suggestions when adding with category
  useEffect(() => {
    if (showCategory && isAdding) {
      fetch("/api/categories")
        .then((r) => r.json())
        .then(setCategorySuggestions)
        .catch(() => {});
    }
  }, [showCategory, isAdding]);

  // Group by category for display (only when showCategory)
  const grouped = showCategory ? groupByCategory(filtered) : null;

  async function handleAdd() {
    if (!newLabel || !newAmount) return;
    try {
      await createExpense({
        monthId,
        type,
        label: newLabel,
        amount: parseFloat(newAmount),
        frequency: showFrequency ? newFrequency : "MONTHLY",
        category: newCategory || undefined,
      });
      setNewLabel("");
      setNewAmount("");
      setNewFrequency("MONTHLY");
      setNewCategory("");
      setIsAdding(false);
      onUpdate();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de l'ajout", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id);
      onUpdate();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de la suppression", "error");
    }
  }

  async function handleConfirm(id: string) {
    try {
      await updateExpense(id, { isConfirmed: true });
      const remainingUnconfirmed = filtered.filter(
        (e) => !e.isConfirmed && e.id !== id
      );
      if (remainingUnconfirmed.length === 0) {
        await updateMonth(monthId, { isConfirmed: true });
        toast("Toutes les charges confirmées !");
      }
      onUpdate();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de la confirmation", "error");
    }
  }

  function renderExpenseRow(expense: ExpenseData) {
    return (
      <div
        key={expense.id}
        className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700/50 last:border-none hover:bg-gray-50 dark:hover:bg-zinc-700/20 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          {showConfirm && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                expense.isConfirmed ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"
              }`}
            />
          )}
          <span className="text-sm font-medium">{expense.label}</span>
          {/* Show category badge only when NOT grouped (avoid redundancy) */}
          {!showCategory && expense.category && (
            <span className="text-[11px] text-gray-500 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
              {expense.category}
            </span>
          )}
          {expense.frequency === "WEEKLY" && (
            <span className="text-[11px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
              Hebdo
            </span>
          )}
          {expense.installmentId && (
            <span className="text-[11px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">
              Échelonné
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatEur(getEffectiveAmount(expense, weeks))}
          </span>
          {showConfirm && !expense.isConfirmed && (
            <button
              onClick={() => handleConfirm(expense.id)}
              className="sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 dark:text-zinc-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all text-sm"
              title="Confirmer"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => handleDelete(expense.id)}
            className="sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all text-sm"
            title="Supprimer"
          >
            ✕
          </button>
        </div>
        {expense.frequency === "WEEKLY" && (
          <div className="w-full pl-[18px] text-[12px] text-gray-500 dark:text-zinc-500 mt-0.5">
            {formatEur(expense.amount)}/sem × {weeks} semaines ={" "}
            <span className="text-gray-700 dark:text-zinc-300 font-semibold">
              {formatEur(expense.amount * weeks)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/50 rounded-xl overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-700/20 transition-colors"
      >
        <h3 className="text-[15px] font-bold flex items-center gap-2">
          <span className="text-lg">{icon}</span> {title}
          <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">
            · {filtered.length} item{filtered.length > 1 ? "s" : ""}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-zinc-500 font-semibold tabular-nums">
            {formatEur(total)}
          </span>
          <span className={`text-xs text-gray-400 dark:text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>

      {open && (
        <>
          {/* Grouped view */}
          {grouped
            ? Object.entries(grouped).map(([category, items]) => {
                const catTotal = items.reduce(
                  (sum, e) => sum + getEffectiveAmount(e, weeks),
                  0
                );
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-700/50">
                      <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                        {category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-zinc-500 font-semibold tabular-nums">
                        {formatEur(catTotal)}
                      </span>
                    </div>
                    {items.map(renderExpenseRow)}
                  </div>
                );
              })
            : filtered.map(renderExpenseRow)}

          {/* Add form */}
          {isAdding ? (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-700/50 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Libellé"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500"
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Montant"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-28 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500 text-right"
                />
                <span className="text-sm text-gray-500 dark:text-zinc-500 self-center">€</span>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                {showFrequency && (
                  <select
                    value={newFrequency}
                    onChange={(e) =>
                      setNewFrequency(e.target.value as ExpenseFrequency)
                    }
                    className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none"
                  >
                    <option value="MONTHLY">Mensuel</option>
                    <option value="WEEKLY">Hebdomadaire</option>
                  </select>
                )}
                {showCategory && (
                  <>
                    <input
                      type="text"
                      placeholder="Catégorie"
                      list={`category-suggestions-${type}`}
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="flex-1 min-w-[120px] bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500"
                    />
                    <datalist id={`category-suggestions-${type}`}>
                      {categorySuggestions.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </>
                )}
                <button
                  onClick={handleAdd}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 text-sm transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-zinc-700/20 transition-colors"
            >
              + Ajouter
            </button>
          )}
        </>
      )}

      {/* Add button when closed */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setIsAdding(true); }}
          className="w-full py-2.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-zinc-700/20 transition-colors border-t border-gray-200 dark:border-zinc-700/50"
        >
          + Ajouter
        </button>
      )}
    </div>
  );
}

/**
 * Group expenses by category. Uncategorized goes last as "Autres".
 */
function groupByCategory(
  expenses: ExpenseData[]
): Record<string, ExpenseData[]> {
  const groups: Record<string, ExpenseData[]> = {};

  for (const e of expenses) {
    const cat = e.category || "Autres";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(e);
  }

  // Sort: named categories first alphabetically, "Autres" last
  const sorted: Record<string, ExpenseData[]> = {};
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === "Autres") return 1;
    if (b === "Autres") return -1;
    return a.localeCompare(b, "fr");
  });

  for (const key of keys) {
    sorted[key] = groups[key];
  }

  return sorted;
}
