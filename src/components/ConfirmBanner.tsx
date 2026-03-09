"use client";

import { ExpenseData } from "@/types";
import { updateExpense, updateMonth } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Props = {
  monthId: string;
  expenses: ExpenseData[];
  onUpdate: () => void;
};

export default function ConfirmBanner({ monthId, expenses, onUpdate }: Props) {
  const { toast } = useToast();
  const unconfirmed = expenses.filter(
    (e) => e.type === "RECURRING" && !e.isConfirmed
  );

  if (unconfirmed.length === 0) return null;

  async function handleConfirmAll() {
    try {
      await Promise.all(
        unconfirmed.map((e) => updateExpense(e.id, { isConfirmed: true }))
      );
      await updateMonth(monthId, { isConfirmed: true });
      toast("Toutes les charges confirmées !");
      onUpdate();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de la confirmation", "error");
    }
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
      <span className="text-sm text-amber-400 font-medium">
        {unconfirmed.length} charge{unconfirmed.length > 1 ? "s" : ""} récurrente
        {unconfirmed.length > 1 ? "s" : ""} reportée{unconfirmed.length > 1 ? "s" : ""} — vérifiez
        avant de continuer
      </span>
      <button
        onClick={handleConfirmAll}
        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
      >
        Tout confirmer
      </button>
    </div>
  );
}
