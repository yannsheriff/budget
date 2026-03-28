"use client";

import { useState } from "react";
import { createInstallment } from "@/lib/api";
import { formatEur } from "@/lib/formatters";
import { useToast } from "@/components/Toast";

type Props = {
  monthId: string;
  onCreated: () => void;
};

export default function InstallmentForm({ monthId, onCreated }: Props) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [nbMonths, setNbMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = parseFloat(totalAmount) || 0;
  const months = parseInt(nbMonths) || 0;
  const perMonth = months > 0 ? Math.round((total / months) * 100) / 100 : 0;

  async function handleSubmit() {
    if (!label || !total || !months || submitting) return;
    setSubmitting(true);
    try {
      await createInstallment({ label, totalAmount: total, nbMonths: months, monthId });
      toast("Échelonné créé !");
      setLabel("");
      setTotalAmount("");
      setNbMonths("");
      setIsOpen(false);
      onCreated();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de la création", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors mb-6 flex items-center gap-1.5"
      >
        + Créer un paiement échelonné
      </button>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-zinc-800/40 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 mb-6 space-y-3">
      <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">Nouveau paiement échelonné</p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Libellé (ex: Billets réunion)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500"
          autoFocus
        />
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-zinc-500 mb-1 block">Montant total</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              placeholder="500"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500 text-right"
            />
            <span className="text-sm text-gray-500 dark:text-zinc-500">€</span>
          </div>
        </div>

        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-zinc-500 mb-1 block">Nombre de mois</label>
          <input
            type="number"
            placeholder="4"
            min="2"
            value={nbMonths}
            onChange={(e) => setNbMonths(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500 text-right"
          />
        </div>
      </div>

      {perMonth > 0 && (
        <div className="text-sm text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-900/60 rounded-lg px-3 py-2">
          {formatEur(perMonth)}/mois pendant {months} mois
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!label || !total || months < 2 || submitting}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Créer l&apos;échelonné
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 text-sm transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
