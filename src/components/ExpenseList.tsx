"use client";

import { useState } from "react";
import { ExpenseData, ExpenseType, ExpenseFrequency } from "@/types";
import { formatEur } from "@/lib/formatters";
import { createExpense, updateExpense, deleteExpense, updateMonth } from "@/lib/api";
import { getWeeksInMonth } from "@/lib/weeks";

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
  onUpdate: () => void;
};

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
  onUpdate,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newFrequency, setNewFrequency] = useState<ExpenseFrequency>("MONTHLY");
  const [newCategory, setNewCategory] = useState("");

  const filtered = expenses.filter((e) => e.type === type);
  const weeks = getWeeksInMonth(year, month);

  const total = filtered.reduce((sum, e) => {
    if (e.frequency === "WEEKLY") return sum + e.amount * weeks;
    return sum + e.amount;
  }, 0);

  async function handleAdd() {
    if (!newLabel || !newAmount) return;
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
  }

  async function handleDelete(id: string) {
    await deleteExpense(id);
    onUpdate();
  }

  async function handleConfirm(id: string) {
    await updateExpense(id, { isConfirmed: true });
    // Check if all recurring are now confirmed → update month
    const remainingUnconfirmed = filtered.filter(
      (e) => !e.isConfirmed && e.id !== id
    );
    if (remainingUnconfirmed.length === 0) {
      await updateMonth(monthId, { isConfirmed: true });
    }
    onUpdate();
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold flex items-center gap-2">
          <span className="text-lg">{icon}</span> {title}
        </h3>
        <span className="text-sm text-zinc-500 font-semibold tabular-nums">
          {formatEur(total)}
        </span>
      </div>

      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
        {filtered.map((expense) => (
          <div
            key={expense.id}
            className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-zinc-700/50 last:border-none hover:bg-zinc-700/20 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              {showConfirm && (
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    expense.isConfirmed ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              )}
              <span className="text-sm font-medium">{expense.label}</span>
              {expense.category && (
                <span className="text-[11px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                  {expense.category}
                </span>
              )}
              {expense.frequency === "WEEKLY" && (
                <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  Hebdo
                </span>
              )}
              {expense.installmentId && (
                <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                  Échelonné
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tabular-nums">
                {expense.frequency === "WEEKLY"
                  ? formatEur(expense.amount * weeks)
                  : formatEur(expense.amount)}
              </span>
              {showConfirm && !expense.isConfirmed && (
                <button
                  onClick={() => handleConfirm(expense.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all text-sm"
                  title="Confirmer"
                >
                  ✓
                </button>
              )}
              <button
                onClick={() => handleDelete(expense.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
            {expense.frequency === "WEEKLY" && (
              <div className="w-full pl-[18px] text-[12px] text-zinc-500 mt-0.5">
                {formatEur(expense.amount)}/sem × {weeks} semaines ={" "}
                <span className="text-zinc-300 font-semibold">
                  {formatEur(expense.amount * weeks)}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Add form */}
        {isAdding ? (
          <div className="px-4 py-3 border-t border-zinc-700/50 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Libellé"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                autoFocus
              />
              <input
                type="number"
                placeholder="Montant"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-28 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 text-right"
              />
              <span className="text-sm text-zinc-500 self-center">€</span>
            </div>
            <div className="flex gap-2 items-center">
              {showFrequency && (
                <select
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value as ExpenseFrequency)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none"
                >
                  <option value="MONTHLY">Mensuel</option>
                  <option value="WEEKLY">Hebdomadaire</option>
                </select>
              )}
              {showCategory && (
                <input
                  type="text"
                  placeholder="Catégorie"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
                />
              )}
              <button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Ajouter
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2.5 text-sm text-zinc-500 hover:text-blue-400 hover:bg-zinc-700/20 transition-colors"
          >
            + Ajouter
          </button>
        )}
      </div>
    </div>
  );
}
