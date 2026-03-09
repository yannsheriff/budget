"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthData } from "@/types";
import { calculateMonthSummary } from "@/lib/budget-calc";
import { getMonthLabel } from "@/lib/weeks";
import { formatEur } from "@/lib/formatters";

export default function MonthsListPage() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/months");
      const data = await res.json();
      setMonths(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Tous les mois</h1>

      {months.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">Aucun mois créé</p>
        </div>
      )}

      <div className="space-y-2">
        {months.map((m) => {
          const summary = calculateMonthSummary(m);
          const label = getMonthLabel(m.year, m.month);

          const totalSavingsWithRemainder =
            summary.totalSavings + (summary.remainderSavings > 0 ? summary.remainderSavings : 0);

          return (
            <button
              key={m.id}
              onClick={() => router.push(`/month/${m.id}`)}
              className="w-full flex items-center justify-between bg-zinc-800/40 border border-zinc-700/50 rounded-xl px-5 py-4 hover:border-blue-500/40 hover:bg-zinc-700/20 transition-all text-left group"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      summary.status === "green"
                        ? "bg-emerald-400"
                        : summary.status === "orange"
                        ? "bg-amber-400"
                        : "bg-red-400"
                    }`}
                  />
                  <span className="text-base font-semibold group-hover:text-blue-400 transition-colors">
                    {label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 pl-[18px]">
                  <span>Budget : {formatEur(summary.budgetReel)}</span>
                  <span>Dépenses : {formatEur(summary.totalRecurring + summary.totalEveryday + summary.totalDiverse)}</span>
                  <span>Épargne : {formatEur(totalSavingsWithRemainder)}</span>
                </div>
              </div>
              <span
                className={`text-lg font-bold tabular-nums flex-shrink-0 ${
                  summary.status === "green"
                    ? "text-emerald-400"
                    : summary.status === "orange"
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {summary.reste >= 0 ? "+" : ""}
                {formatEur(summary.reste)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
