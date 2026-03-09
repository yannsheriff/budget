"use client";

import { useEffect, useState } from "react";
import { fetchInstallments, deleteInstallment } from "@/lib/api";
import { formatEur } from "@/lib/formatters";
import { getMonthLabel } from "@/lib/weeks";

type InstallmentData = {
  id: string;
  label: string;
  totalAmount: number;
  nbMonths: number;
  amountPerMonth: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  paid: number;
  remaining: number;
  isComplete: boolean;
};

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<InstallmentData[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await fetchInstallments();
    setInstallments(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet échelonné et ses échéances futures ?")) return;
    await deleteInstallment(id);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  const active = installments.filter((i) => !i.isComplete);
  const completed = installments.filter((i) => i.isComplete);

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Échéanciers</h1>

      {installments.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Aucun paiement échelonné</p>
          <p className="text-zinc-600 text-xs mt-2">
            Créez-en un depuis la section &quot;Dépenses diverses&quot; d&apos;un mois.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
            En cours ({active.length})
          </p>
          <div className="space-y-3">
            {active.map((inst) => (
              <InstallmentCard key={inst.id} inst={inst} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
            Terminés ({completed.length})
          </p>
          <div className="space-y-3">
            {completed.map((inst) => (
              <InstallmentCard key={inst.id} inst={inst} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InstallmentCard({
  inst,
  onDelete,
}: {
  inst: InstallmentData;
  onDelete: (id: string) => void;
}) {
  const progress = (inst.paid / inst.nbMonths) * 100;

  return (
    <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-5 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold">{inst.label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums">
            {formatEur(inst.totalAmount)}
          </span>
          {!inst.isComplete && (
            <button
              onClick={() => onDelete(inst.id)}
              className="sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
              title="Supprimer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400 mb-3">
        <span>{formatEur(inst.amountPerMonth)} / mois</span>
        <span>
          {inst.paid} sur {inst.nbMonths} payés
        </span>
        <span>Fin : {getMonthLabel(inst.endYear, inst.endMonth)}</span>
      </div>

      <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            inst.isComplete ? "bg-emerald-400" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
