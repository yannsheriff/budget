"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { MonthData } from "@/types";
import { calculateMonthSummary } from "@/lib/budget-calc";
import MonthSummary from "@/components/MonthSummary";
import MonthNav from "@/components/MonthNav";
import MonthFields from "@/components/MonthFields";
import IncomeList from "@/components/IncomeList";
import ExpenseList from "@/components/ExpenseList";
import EverydayLifeInput from "@/components/EverydayLifeInput";
import ConfirmBanner from "@/components/ConfirmBanner";
import InstallmentForm from "@/components/InstallmentForm";
import CategoryDrawer from "@/components/CategoryDrawer";

export default function MonthPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-open drawer if ?categorize=1
  useEffect(() => {
    if (searchParams.get("categorize") === "1" && monthData) {
      setDrawerOpen(true);
    }
  }, [searchParams, monthData]);

  const fetchMonth = useCallback(async () => {
    const res = await fetch(`/api/months/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMonthData(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-zinc-500">Chargement...</div>
      </div>
    );
  }

  if (!monthData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-zinc-500">Mois introuvable</div>
      </div>
    );
  }

  const summary = calculateMonthSummary(monthData);

  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Sidebar — Récapitulatif fixe */}
      <aside className="fixed top-14 left-0 bottom-0 w-80 bg-zinc-900/70 border-r border-zinc-800 p-6 overflow-y-auto hidden lg:block">
        <MonthSummary
          summary={summary}
          salary={monthData.salary}
          overdraft={monthData.overdraft}
        />
      </aside>

      {/* Main content */}
      <main className="lg:ml-80 flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-[900px]">
        {/* Month navigation + category button */}
        <div className="flex items-center justify-between">
          <MonthNav year={monthData.year} month={monthData.month} />
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/month/${monthData.id}/reconcile`)}
              className="text-xs font-medium text-zinc-500 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              🏦 Réconcilier
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="text-xs font-medium text-zinc-500 hover:text-blue-400 border border-zinc-800 hover:border-blue-500/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              🏷️ Catégoriser
            </button>
          </div>
        </div>

        {/* Mobile recap */}
        <div className="lg:hidden mb-6 bg-zinc-900/70 border border-zinc-800 rounded-xl p-5">
          <MonthSummary
            summary={summary}
            salary={monthData.salary}
            overdraft={monthData.overdraft}
          />
        </div>

        {/* Unpredicted expenses from reconciliation */}
        {monthData.expenses.some(e => e.isFromReconciliation) && (
          <ExpenseList
            expenses={monthData.expenses}
            type="DIVERSE"
            filterReconciliation="only"
            monthId={monthData.id}
            year={monthData.year}
            month={monthData.month}
            title="Non prédit"
            icon="⚠️"
            showCategory
            onUpdate={fetchMonth}
          />
        )}

        {/* Confirm banner */}
        <ConfirmBanner
          monthId={monthData.id}
          expenses={monthData.expenses}
          onUpdate={fetchMonth}
        />

        {/* Salary + Overdraft */}
        <MonthFields
          monthId={monthData.id}
          salary={monthData.salary}
          overdraft={monthData.overdraft}
          onUpdate={fetchMonth}
        />

        {/* Other incomes */}
        <IncomeList
          incomes={monthData.incomes}
          monthId={monthData.id}
          onUpdate={fetchMonth}
        />

        {/* Recurring expenses */}
        <ExpenseList
          expenses={monthData.expenses}
          type="RECURRING"
          filterReconciliation="exclude"
          monthId={monthData.id}
          year={monthData.year}
          month={monthData.month}
          title="Charges récurrentes"
          icon="🔁"
          showConfirm
          showCategory
          showFrequency
          onUpdate={fetchMonth}
        />

        {/* Everyday life */}
        <EverydayLifeInput
          monthId={monthData.id}
          year={monthData.year}
          month={monthData.month}
          weeklyBudget={monthData.weeklyEverydayBudget}
          onUpdate={fetchMonth}
        />

        {/* Diverse expenses */}
        <ExpenseList
          expenses={monthData.expenses}
          type="DIVERSE"
          filterReconciliation="exclude"
          monthId={monthData.id}
          year={monthData.year}
          month={monthData.month}
          title="Dépenses diverses"
          icon="🛍️"
          showCategory
          onUpdate={fetchMonth}
        />

        {/* Installment form */}
        <InstallmentForm monthId={monthData.id} onCreated={fetchMonth} />

        {/* Savings */}
        <ExpenseList
          expenses={monthData.expenses}
          type="SAVINGS"
          monthId={monthData.id}
          year={monthData.year}
          month={monthData.month}
          title="Épargne"
          icon="🏦"
          showCategory
          onUpdate={fetchMonth}
        />

        {/* Remainder savings info */}
        {summary.remainderSavings > 0 && (
          <div className="bg-emerald-500/10 border-t border-emerald-500/15 rounded-xl px-4 py-3 flex items-center justify-between -mt-3 mb-6">
            <span className="text-sm text-emerald-400 font-medium">
              💡 &quot;Tout le reste&quot; disponible pour l&apos;épargne
            </span>
            <span className="text-base text-emerald-400 font-bold tabular-nums">
              {new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                minimumFractionDigits: 0,
              }).format(summary.remainderSavings)}
            </span>
          </div>
        )}

        <div className="h-16" />
      </main>

      {/* Category drawer */}
      <CategoryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        expenses={monthData.expenses}
        onSaved={() => {
          fetchMonth();
          setDrawerOpen(false);
        }}
      />
    </div>
  );
}
