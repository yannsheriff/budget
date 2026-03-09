"use client";

import { MonthSummary as MonthSummaryType } from "@/types";
import { formatEur } from "@/lib/formatters";

type Props = {
  summary: MonthSummaryType;
  salary: number;
  overdraft: number;
};

const statusConfig = {
  green: { label: "Budget équilibré", class: "bg-emerald-500/10 text-emerald-400" },
  orange: { label: "Attention", class: "bg-amber-500/10 text-amber-400" },
  red: { label: "Budget dépassé", class: "bg-red-500/10 text-red-400" },
};

const statusDot = {
  green: "bg-emerald-400",
  orange: "bg-amber-400",
  red: "bg-red-400",
};

const resteColor = {
  green: "text-emerald-400",
  orange: "text-amber-400",
  red: "text-red-400",
};

export default function MonthSummary({ summary, salary, overdraft }: Props) {
  const cfg = statusConfig[summary.status];

  return (
    <div className="space-y-5">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
        Récapitulatif
      </p>

      <div>
        <p className={`text-3xl font-extrabold tracking-tight ${resteColor[summary.status]}`}>
          {formatEur(summary.reste)}
        </p>
        <p className="text-sm text-zinc-500 mt-1">Reste après toutes les dépenses</p>
      </div>

      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${cfg.class}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[summary.status]}`} />
        {cfg.label}
      </span>

      {/* Budget réel breakdown */}
      <div className="space-y-0">
        <Row label="Salaire" value={formatEur(salary)} />
        <Row label="Autres revenus" value={`+ ${formatEur(summary.totalIncomes)}`} valueClass="text-emerald-400" />
        <Row label="Découvert" value={`− ${formatEur(overdraft)}`} valueClass="text-red-400" />
        <div className="border-t-2 border-zinc-700/50 my-1" />
        <Row label="Budget réel" value={formatEur(summary.budgetReel)} labelClass="font-semibold text-zinc-200" valueClass="text-base font-bold" />
      </div>

      {/* Expenses breakdown */}
      <div className="space-y-0 mt-4">
        <Row label="Charges récurrentes" value={`− ${formatEur(summary.totalRecurring)}`} valueClass="text-red-400" />
        <Row label="Every day life" value={`− ${formatEur(summary.totalEveryday)}`} valueClass="text-red-400" />
        <Row label="Divers" value={`− ${formatEur(summary.totalDiverse)}`} valueClass="text-red-400" />
        <Row label="Épargne" value={`− ${formatEur(summary.totalSavings)}`} valueClass="text-red-400" />
        <div className="border-t-2 border-zinc-700/50 my-1" />
        <div className="flex justify-between items-center py-3 text-base font-bold">
          <span>Reste</span>
          <span className={resteColor[summary.status]}>{formatEur(summary.reste)}</span>
        </div>
      </div>

      {/* Security buffer */}
      <div className="bg-zinc-800/50 rounded-lg p-3 text-center text-xs text-zinc-500">
        Tampon de sécurité : 100 €<br />
        {summary.reste >= 100 ? (
          <span className="text-emerald-400 font-semibold">
            {formatEur(summary.reste - 100)} au-dessus
          </span>
        ) : (
          <span className="text-red-400 font-semibold">
            {formatEur(100 - summary.reste)} en dessous
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  labelClass = "text-zinc-500",
  valueClass = "font-semibold",
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-zinc-800 last:border-none">
      <span className={`text-sm ${labelClass}`}>{label}</span>
      <span className={`text-sm tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
