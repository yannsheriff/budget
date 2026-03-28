"use client";

import { MonthSummary as MonthSummaryType } from "@/types";
import { formatEur } from "@/lib/formatters";

type Props = {
  summary: MonthSummaryType;
  salary: number;
  overdraft: number;
};

const resteColor = {
  green: "text-emerald-600 dark:text-emerald-400",
  orange: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

export default function MonthSummary({ summary, salary, overdraft }: Props) {
  return (
    <div className="space-y-5">
      <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold">
        Récapitulatif
      </p>

      <div>
        <p className={`text-3xl font-extrabold tracking-tight ${resteColor[summary.status]}`}>
          {formatEur(summary.reste)}
        </p>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-1">Reste après toutes les dépenses</p>
      </div>

      {/* Budget réel breakdown */}
      <div>
        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
          <Row label="Salaire" value={formatEur(salary)} />
          <Row label="Autres revenus" value={`+ ${formatEur(summary.totalIncomes)}`} valueClass="text-emerald-600 dark:text-emerald-400" />
          <Row label="Découvert" value={`− ${formatEur(overdraft)}`} valueClass="text-red-600 dark:text-red-400" />
        </div>
        <div className="border-t-2 border-gray-300 dark:border-zinc-700/50 mt-1" />
        <Row label="Budget réel" value={formatEur(summary.budgetReel)} labelClass="font-semibold text-gray-900 dark:text-zinc-200" valueClass="text-base font-bold" />
      </div>

      {/* Expenses breakdown */}
      <div className="mt-4">
        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
          <ExpenseRow label="Charges récurrentes" amount={summary.totalRecurring} />
          <ExpenseRow label="Every day life" amount={summary.totalEveryday} />
          <ExpenseRow label="Divers" amount={summary.totalDiverse} />
          <ExpenseRow label="Épargne" amount={summary.totalSavings} />
          {summary.totalUnpredicted > 0 && (
            <Row label="Non prédit" value={`− ${formatEur(summary.totalUnpredicted)}`} valueClass="text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div className="border-t-2 border-gray-300 dark:border-zinc-700/50 mt-1" />
        <div className="flex justify-between items-center py-3 text-base font-bold">
          <span>Reste</span>
          <span className={resteColor[summary.status]}>{formatEur(summary.reste)}</span>
        </div>
      </div>

      {/* Security buffer */}
      <div className="bg-gray-100 dark:bg-zinc-800/50 rounded-lg p-3 text-center text-xs text-gray-500 dark:text-zinc-500">
        Tampon de sécurité : 100 €<br />
        {summary.reste >= 100 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {formatEur(summary.reste - 100)} au-dessus
          </span>
        ) : (
          <span className="text-red-600 dark:text-red-400 font-semibold">
            {formatEur(100 - summary.reste)} en dessous
          </span>
        )}
      </div>
    </div>
  );
}

function ExpenseRow({ label, amount }: { label: string; amount: number }) {
  const isZero = amount === 0;
  return (
    <Row
      label={label}
      value={isZero ? formatEur(0) : `− ${formatEur(amount)}`}
      valueClass={isZero ? "text-gray-400 dark:text-zinc-600" : "text-red-600 dark:text-red-400"}
    />
  );
}

function Row({
  label,
  value,
  labelClass = "text-gray-500 dark:text-zinc-500",
  valueClass = "font-semibold",
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className={`text-sm ${labelClass}`}>{label}</span>
      <span className={`text-sm tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}
