"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MonthData, ExpenseData } from "@/types";
import { useToast } from "@/components/Toast";
import { BankLine, ParsedStatement } from "@/lib/csv-parser";
import { reconcile, ReconciliationResult, MatchResult } from "@/lib/reconciliation";
import { getWeeksInMonth } from "@/lib/weeks";
import { formatEur } from "@/lib/formatters";
import SearchSelect from "@/components/SearchSelect";

// Item decision type
type ItemDecision = {
  status: "MATCHED" | "IGNORED" | "ADDED_PUNCTUAL" | "ADDED_RECURRING" | "LINKED";
  matchedExpenseId?: string;
  matchedExpenseLabel?: string;
  bankLabelToSave?: string;
  newExpense?: {
    label: string;
    amount: number;
    category?: string;
    type: "RECURRING" | "DIVERSE";
  };
};

export default function ReconcilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const monthId = params.id as string;

  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedStatement | null>(null);

  // Step 2 state
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [decisions, setDecisions] = useState<Map<string, ItemDecision>>(new Map());

  // Step 3 state
  const [saving, setSaving] = useState(false);

  // Fetch month data
  const fetchMonth = useCallback(async () => {
    const res = await fetch(`/api/months/${monthId}`);
    if (res.ok) {
      setMonthData(await res.json());
    }
    setLoading(false);
  }, [monthId]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // Handle CSV upload
  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast("Format non supporté. Utilisez un fichier .csv", "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/reconciliation/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsed(data);
      // Run matching
      if (monthData) {
        const weeks = getWeeksInMonth(monthData.year, monthData.month);
        const expenses = monthData.expenses.map(e => ({
          id: e.id,
          label: e.label,
          amount: e.amount,
          bankLabel: e.bankLabel,
          type: e.type,
          frequency: e.frequency,
        }));
        const incomes = monthData.incomes.map(i => ({
          id: i.id,
          label: i.label,
          amount: i.amount,
        }));
        const reconciliation = reconcile(data.debits, data.credits, expenses, incomes, monthData.weeklyEverydayBudget, weeks);
        setResult(reconciliation);

        // Pre-populate decisions for matched items
        const initial = new Map<string, ItemDecision>();
        for (const m of reconciliation.matched) {
          const key = bankLineKey(m.bankLine);
          initial.set(key, {
            status: "MATCHED",
            matchedExpenseId: m.matchedExpenseId,
            matchedExpenseLabel: m.matchedExpenseLabel,
          });
        }
        setDecisions(initial);
        setStep(2);
      }
      toast(`${data.lines.length} lignes importées`);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  // Set a decision for an unmatched/probable item
  function setDecision(bankLine: BankLine, decision: ItemDecision) {
    setDecisions(prev => {
      const next = new Map(prev);
      next.set(bankLineKey(bankLine), decision);
      return next;
    });
  }

  function getDecision(bankLine: BankLine): ItemDecision | undefined {
    return decisions.get(bankLineKey(bankLine));
  }

  // Count progress
  function getProgress() {
    if (!result) return { done: 0, total: 0 };
    const total = result.unmatched.length + result.probable.length + result.unmatchedCredits.length;
    let done = 0;
    for (const m of [...result.unmatched, ...result.probable, ...result.unmatchedCredits]) {
      if (decisions.has(bankLineKey(m.bankLine))) done++;
    }
    return { done, total };
  }

  // Save reconciliation
  async function handleSave() {
    if (!monthData || !result) return;
    setSaving(true);
    try {
      const { budgetReel } = await import("@/lib/budget-calc").then(m => {
        const summary = m.calculateMonthSummary(monthData);
        return { budgetReel: summary.budgetReel };
      });

      // Build the full items array with bank line data
      const allItems: any[] = [];
      const addItems = (matches: MatchResult[]) => {
        for (const m of matches) {
          const decision = getDecision(m.bankLine);
          if (decision) {
            allItems.push({
              bankLabel: m.bankLine.label,
              bankAmount: m.bankLine.amount,
              bankDate: m.bankLine.date,
              bankCategory: m.bankLine.category,
              ...decision,
            });
          }
        }
      };
      addItems(result.matched);
      addItems(result.probable);
      addItems(result.unmatched);
      addItems(result.unmatchedCredits);

      // Also add everyday lines as IGNORED
      for (const line of result.everydayLifeComparison.lines) {
        allItems.push({
          bankLabel: line.label,
          bankAmount: line.amount,
          bankDate: line.date,
          bankCategory: line.category,
          status: "IGNORED",
        });
      }

      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId,
          bankBalance: monthData.overdraft,
          predictedBalance: budgetReel,
          items: allItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast("Réconciliation enregistrée !");
      setStep(3);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="text-zinc-500">Chargement...</div></div>;
  }

  if (!monthData) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="text-zinc-500">Mois introuvable</div></div>;
  }

  const progress = getProgress();
  const allDone = progress.done === progress.total && progress.total > 0;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-5 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push(`/month/${monthId}`)} className="text-sm text-zinc-500 hover:text-zinc-300 mb-2 block">
          &larr; Retour au mois
        </button>
        <h1 className="text-xl font-bold">Réconciliation bancaire</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2 mb-6">
        {[
          { n: 1, label: "Import" },
          { n: 2, label: "Réconciliation" },
          { n: 3, label: "Bilan" },
        ].map(({ n, label }) => (
          <div
            key={n}
            className={`flex-1 text-center text-sm font-medium py-2 rounded-lg border transition-colors ${
              step === n
                ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                : step > n
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-900 text-zinc-600 border-zinc-800"
            }`}
          >
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1.5 ${
              step > n ? "bg-emerald-500 text-emerald-950" : step === n ? "bg-zinc-200 text-zinc-900" : "bg-zinc-800 text-zinc-500"
            }`}>
              {step > n ? "\u2713" : n}
            </span>
            {label}
          </div>
        ))}
      </div>

      {/* Step 1: Import */}
      {step === 1 && (
        <StepImport
          uploading={uploading}
          onFile={handleFile}
        />
      )}

      {/* Step 2: Reconciliation */}
      {step === 2 && result && monthData && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard value={result.matched.length} label="Matchées" color="emerald" />
            <StatCard value={result.probable.length} label="Match probable" color="yellow" />
            <StatCard value={result.unmatched.length} label="Non matchées" color="red" />
            <StatCard value={result.unmatchedCredits.length} label="Revenus" color="blue" />
          </div>

          {/* Matched section (collapsed) */}
          <CollapsibleSection
            title="Matchées automatiquement"
            count={result.matched.length}
            dotColor="bg-emerald-400"
            defaultOpen={false}
          >
            {result.matched.map((m, i) => (
              <MatchedItem key={i} match={m} />
            ))}
          </CollapsibleSection>

          {/* Probable section */}
          {result.probable.length > 0 && (
            <CollapsibleSection
              title="Match probable"
              count={result.probable.length}
              dotColor="bg-yellow-400"
              defaultOpen={true}
            >
              {result.probable.map((m, i) => (
                <ProbableItem
                  key={i}
                  match={m}
                  decision={getDecision(m.bankLine)}
                  onDecision={(d) => setDecision(m.bankLine, d)}
                  expenses={monthData.expenses}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Unmatched section */}
          {result.unmatched.length > 0 && (
            <CollapsibleSection
              title="Non matchées — à traiter"
              count={result.unmatched.length}
              dotColor="bg-red-400"
              defaultOpen={true}
            >
              {result.unmatched.map((m, i) => (
                <UnmatchedItem
                  key={i}
                  match={m}
                  decision={getDecision(m.bankLine)}
                  onDecision={(d) => setDecision(m.bankLine, d)}
                  expenses={monthData.expenses}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Everyday life comparison */}
          <div className="border border-zinc-800 rounded-xl mb-5 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <h2 className="text-sm font-semibold">Every day life (agrégé)</h2>
            </div>
            <div className="border-t border-zinc-800 px-4 py-4">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Budget prévu</div>
                  <div className="text-lg font-bold">{formatEur(result.everydayLifeComparison.budgeted)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Dépenses relevé</div>
                  <div className="text-lg font-bold text-red-400">{formatEur(result.everydayLifeComparison.actual)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Écart</div>
                  <div className={`text-lg font-bold ${result.everydayLifeComparison.gap > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {result.everydayLifeComparison.gap > 0 ? "+" : ""}{formatEur(result.everydayLifeComparison.gap)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-600">
                {result.everydayLifeComparison.lines.map(l => l.label).join(", ")}
              </div>
            </div>
          </div>

          {/* Unmatched credits */}
          {result.unmatchedCredits.length > 0 && (
            <CollapsibleSection
              title="Revenus non prévus"
              count={result.unmatchedCredits.length}
              dotColor="bg-blue-400"
              defaultOpen={true}
            >
              {result.unmatchedCredits.map((m, i) => (
                <UnmatchedCreditItem
                  key={i}
                  match={m}
                  decision={getDecision(m.bankLine)}
                  onDecision={(d) => setDecision(m.bankLine, d)}
                />
              ))}
            </CollapsibleSection>
          )}

          {/* Validate bar */}
          <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 py-4 mt-6 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              <strong className="text-zinc-200">{progress.done}</strong> / {progress.total} traitées
            </span>
            <button
              onClick={handleSave}
              disabled={!allDone || saving}
              className={`text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors ${
                allDone && !saving
                  ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              }`}
            >
              {saving ? "Enregistrement..." : "Valider la réconciliation"}
            </button>
          </div>
        </>
      )}

      {/* Step 3: Summary */}
      {step === 3 && result && (
        <ReconciliationBilan
          result={result}
          decisions={decisions}
          monthData={monthData}
          onGoToMonth={() => router.push(`/month/${monthId}`)}
        />
      )}
    </div>
  );
}

// ─── Utility ──────────────────────────────────────

function bankLineKey(line: BankLine): string {
  return `${line.date}|${line.label}|${line.amount}`;
}

// ─── Sub-components ───────────────────────────────

function StepImport({ uploading, onFile }: { uploading: boolean; onFile: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.onchange = (e) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) onFile(f);
        };
        input.click();
      }}
      className={`border-2 border-dashed rounded-xl px-6 py-16 text-center cursor-pointer transition-all ${
        dragOver
          ? "border-blue-500 bg-blue-500/10"
          : "border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/30"
      } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Analyse en cours...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl opacity-50">📄</span>
          <p className="text-sm text-zinc-400">
            <span className="text-blue-400 font-medium">Cliquez</span> ou glissez votre relevé bancaire CSV
          </p>
          <p className="text-xs text-zinc-600">Format : Date, Libellé, Montant, Catégorie</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}

function CollapsibleSection({ title, count, dotColor, defaultOpen, children }: {
  title: string; count: number; dotColor: string; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800 rounded-xl mb-5 overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          {title}
          <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{count}</span>
        </h2>
        <span className={`text-zinc-600 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </div>
      {open && <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">{children}</div>}
    </div>
  );
}

function MatchedItem({ match }: { match: MatchResult }) {
  return (
    <div className="flex items-center px-4 py-2.5 gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{match.bankLine.label}</div>
        <div className="text-xs text-zinc-600">{match.bankLine.date}</div>
      </div>
      <div className="text-sm font-semibold text-red-400 tabular-nums whitespace-nowrap">
        {formatEur(match.bankLine.amount)}
      </div>
      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded whitespace-nowrap">
        ✓ {match.matchedExpenseLabel}
      </span>
    </div>
  );
}

function ProbableItem({ match, decision, onDecision, expenses }: {
  match: MatchResult;
  decision?: ItemDecision;
  onDecision: (d: ItemDecision) => void;
  expenses: ExpenseData[];
}) {
  const confirmed = decision?.status === "MATCHED" || decision?.status === "LINKED";
  const rejected = decision?.status === "IGNORED";
  const decided = confirmed || rejected;
  const [saveBankLabel, setSaveBankLabel] = useState(true);

  // Compact view once decided
  if (decided) {
    return (
      <div className="flex items-center px-4 py-2.5 gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{match.bankLine.label}</div>
          <div className="text-xs text-zinc-600">{match.bankLine.date}</div>
        </div>
        <div className="text-sm font-semibold text-red-400 tabular-nums whitespace-nowrap">
          {formatEur(match.bankLine.amount)}
        </div>
        {confirmed ? (
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded whitespace-nowrap">
            ✓ {match.matchedExpenseLabel}
          </span>
        ) : (
          <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded whitespace-nowrap">
            ✕ Pas le bon
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center px-4 py-2.5 gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{match.bankLine.label}</div>
          <div className="text-xs text-zinc-600">{match.bankLine.date} &middot; montant correspond à &quot;{match.matchedExpenseLabel}&quot;</div>
        </div>
        <div className="text-sm font-semibold text-red-400 tabular-nums whitespace-nowrap">
          {formatEur(match.bankLine.amount)}
        </div>
        <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded whitespace-nowrap">
          &asymp; {match.matchedExpenseLabel}
        </span>
      </div>
      <div className="px-4 pb-3 pl-8 flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={saveBankLabel}
            onChange={(e) => setSaveBankLabel(e.target.checked)}
            className="accent-emerald-500"
          />
          Retenir &quot;{match.bankLine.label}&quot;
        </label>
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => onDecision({
              status: "MATCHED",
              matchedExpenseId: match.matchedExpenseId,
              matchedExpenseLabel: match.matchedExpenseLabel,
              bankLabelToSave: saveBankLabel ? match.bankLine.label : undefined,
            })}
            className="text-xs px-2.5 py-1 rounded border transition-colors bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
          >
            ✓ Confirmer
          </button>
          <button
            onClick={() => {
              onDecision({ status: "IGNORED" });
            }}
            className="text-xs px-2.5 py-1 rounded border bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
          >
            ✕ Pas le bon
          </button>
        </div>
      </div>
    </div>
  );
}

function UnmatchedItem({ match, decision, onDecision, expenses }: {
  match: MatchResult;
  decision?: ItemDecision;
  onDecision: (d: ItemDecision) => void;
  expenses: ExpenseData[];
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [formConfirmed, setFormConfirmed] = useState(false);
  const [saveBankLabel, setSaveBankLabel] = useState(true);
  const [newLabel, setNewLabel] = useState(match.bankLine.label);
  const [newAmount, setNewAmount] = useState(Math.abs(match.bankLine.amount));
  const [newCategory, setNewCategory] = useState(match.bankLine.category || "");
  const linkPanelRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);

  // Close link panel on click outside
  useEffect(() => {
    if (!linkOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (linkPanelRef.current && !linkPanelRef.current.contains(e.target as Node)) {
        setLinkOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [linkOpen]);

  const status = decision?.status;
  const isLinked = status === "LINKED";
  const isIgnored = status === "IGNORED";
  const isPunctual = status === "ADDED_PUNCTUAL";
  const isRecurring = status === "ADDED_RECURRING";
  const showForm = isRecurring && !formConfirmed;

  function handleLink(expense: ExpenseData) {
    onDecision({
      status: "LINKED",
      matchedExpenseId: expense.id,
      matchedExpenseLabel: expense.label,
      bankLabelToSave: saveBankLabel ? match.bankLine.label : undefined,
    });
    setLinkOpen(false);
  }

  return (
    <div>
      <div className={`flex items-center px-4 py-2.5 gap-3 ${isIgnored || isPunctual ? "opacity-50" : ""} ${isLinked ? "border-l-2 border-emerald-400" : ""}`}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{match.bankLine.label}</div>
          <div className="text-xs text-zinc-600">{match.bankLine.date} &middot; {match.bankLine.category}</div>
        </div>
        <div className="text-sm font-semibold text-red-400 tabular-nums whitespace-nowrap">
          {formatEur(match.bankLine.amount)}
        </div>
        {isLinked && decision && (
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded whitespace-nowrap">
            ✓ {decision.matchedExpenseLabel}
          </span>
        )}
        {isPunctual && (
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded whitespace-nowrap">
            ● Ponctuel
          </span>
        )}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => { setLinkOpen(!linkOpen); }}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isLinked ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            🔗 Lier
          </button>
          <button
            onClick={() => onDecision({ status: "IGNORED" })}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isIgnored ? "bg-zinc-800 text-zinc-500 border-zinc-600" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            Ignorer
          </button>
          <button
            onClick={() => onDecision({
              status: "ADDED_PUNCTUAL",
              newExpense: { label: newLabel, amount: newAmount, category: newCategory || undefined, type: "DIVERSE" },
            })}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isPunctual ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            Ponctuel
          </button>
          <button
            onClick={() => {
              setFormConfirmed(false);
              onDecision({
                status: "ADDED_RECURRING",
                newExpense: { label: newLabel, amount: newAmount, category: newCategory || undefined, type: "RECURRING" },
                bankLabelToSave: saveBankLabel ? match.bankLine.label : undefined,
              });
            }}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              isRecurring ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            ★ Récurrent
          </button>
        </div>
      </div>

      {/* Link search panel */}
      {linkOpen && !isLinked && (
        <div ref={linkPanelRef} className="px-4 pb-3 pl-8 bg-zinc-900/50">
          <div className="text-xs text-zinc-600 mb-1.5">Rechercher une dépense existante :</div>
          <SearchSelect
            items={expenses}
            filterFn={(e, q) => {
              const lower = q.toLowerCase();
              return e.label.toLowerCase().includes(lower)
                || (e.category ? e.category.toLowerCase().includes(lower) : false)
                || Math.abs(e.amount).toString().includes(q);
            }}
            renderItem={(exp, highlighted) => (
              <div className={`flex items-center justify-between px-3 py-2 ${highlighted ? "bg-zinc-800" : "hover:bg-zinc-800"}`}>
                <div>
                  <div className="text-xs font-medium">{exp.label}</div>
                  <div className="text-xs text-zinc-600">{exp.category || "Sans catégorie"} &middot; {exp.type}</div>
                </div>
                <div className="text-xs font-semibold text-red-400">{formatEur(-exp.amount)}</div>
              </div>
            )}
            onSelect={handleLink}
            keyFn={(e) => e.id}
            placeholder="Rechercher par label, montant ou catégorie..."
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <input type="checkbox" checked={saveBankLabel} onChange={(e) => setSaveBankLabel(e.target.checked)} className="accent-emerald-500" />
              Retenir ce libellé bancaire
            </label>
          </div>
        </div>
      )}

      {/* Compact confirmed view for recurring */}
      {isRecurring && formConfirmed && (
        <div className="flex items-center px-4 py-2 pl-8 gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
            ★ Récurrent
          </span>
          <span className="text-xs text-zinc-300">{newLabel}</span>
          <span className="text-xs text-zinc-500">{formatEur(newAmount)}</span>
          {newCategory && <span className="text-xs text-zinc-600">{newCategory}</span>}
          <button
            onClick={() => setFormConfirmed(false)}
            className="text-xs text-zinc-600 hover:text-zinc-400 ml-auto"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Inline form for punctual/recurring */}
      {showForm && (
        <div className="px-4 pb-3 pl-8 bg-zinc-900/50">
          <div className="flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => {
                setNewLabel(e.target.value);
                onDecision({
                  ...decision!,
                  newExpense: { label: e.target.value, amount: newAmount, category: newCategory || undefined, type: isRecurring ? "RECURRING" : "DIVERSE" },
                });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); amountRef.current?.focus(); } }}
              className="flex-1 min-w-[150px] bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              placeholder="Label"
              autoFocus
            />
            <input
              ref={amountRef}
              type="number"
              value={newAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setNewAmount(val);
                onDecision({
                  ...decision!,
                  newExpense: { label: newLabel, amount: val, category: newCategory || undefined, type: isRecurring ? "RECURRING" : "DIVERSE" },
                });
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); categoryRef.current?.focus(); } }}
              className="w-20 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              step="0.01"
            />
            <input
              ref={categoryRef}
              type="text"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                onDecision({
                  ...decision!,
                  newExpense: { label: newLabel, amount: newAmount, category: e.target.value || undefined, type: isRecurring ? "RECURRING" : "DIVERSE" },
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onDecision({
                    ...decision!,
                    newExpense: { label: newLabel, amount: newAmount, category: newCategory || undefined, type: isRecurring ? "RECURRING" : "DIVERSE" },
                    bankLabelToSave: isRecurring && saveBankLabel ? match.bankLine.label : undefined,
                  });
                  setFormConfirmed(true);
                }
              }}
              className="w-28 bg-zinc-950 border border-zinc-700 rounded-md px-2.5 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
              placeholder="Catégorie"
            />
            {isRecurring && (
              <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                <input type="checkbox" checked={saveBankLabel} onChange={(e) => {
                  setSaveBankLabel(e.target.checked);
                  onDecision({
                    ...decision!,
                    bankLabelToSave: e.target.checked ? match.bankLine.label : undefined,
                  });
                }} className="accent-emerald-500" />
                Retenir &quot;{match.bankLine.label}&quot;
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UnmatchedCreditItem({ match, decision, onDecision }: {
  match: MatchResult;
  decision?: ItemDecision;
  onDecision: (d: ItemDecision) => void;
}) {
  const isIgnored = decision?.status === "IGNORED";
  const isRecurring = decision?.status === "ADDED_RECURRING";

  return (
    <div className={`flex items-center px-4 py-2.5 gap-3 ${isIgnored ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{match.bankLine.label}</div>
        <div className="text-xs text-zinc-600">{match.bankLine.date}</div>
      </div>
      <div className="text-sm font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
        +{formatEur(match.bankLine.amount)}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onDecision({ status: "IGNORED" })}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            isIgnored ? "bg-zinc-800 text-zinc-500 border-zinc-600" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
          }`}
        >
          Ignorer
        </button>
        <button
          onClick={() => onDecision({
            status: "ADDED_RECURRING",
            newExpense: { label: match.bankLine.label, amount: match.bankLine.amount, type: "RECURRING" },
          })}
          className={`text-xs px-2 py-1 rounded border transition-colors ${
            isRecurring ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800"
          }`}
        >
          ★ Revenu récurrent
        </button>
      </div>
    </div>
  );
}

function ReconciliationBilan({ result, decisions, monthData, onGoToMonth }: {
  result: ReconciliationResult;
  decisions: Map<string, ItemDecision>;
  monthData: MonthData;
  onGoToMonth: () => void;
}) {
  const allDecisions = Array.from(decisions.values());
  const recurring = allDecisions.filter(d => d.status === "ADDED_RECURRING");
  const punctual = allDecisions.filter(d => d.status === "ADDED_PUNCTUAL");
  const ignored = allDecisions.filter(d => d.status === "IGNORED");
  const linked = allDecisions.filter(d => d.status === "LINKED");
  const matched = allDecisions.filter(d => d.status === "MATCHED");
  const bankLabelsLearned = allDecisions.filter(d => d.bankLabelToSave).length;

  // --- Calculs de précision ---
  // Total des dépenses prévues = toutes les dépenses de l'app + budget everyday life
  const totalPrevu = monthData.expenses.reduce((s, e) => s + e.amount, 0)
    + result.everydayLifeComparison.budgeted;

  // Total réel du relevé (tous les débits uniquement, sans les crédits)
  const totalReel = result.matched
      .filter(m => m.bankLine.amount < 0)
      .reduce((s, m) => s + Math.abs(m.bankLine.amount), 0)
    + result.probable.reduce((s, m) => s + Math.abs(m.bankLine.amount), 0)
    + result.unmatched.reduce((s, m) => s + Math.abs(m.bankLine.amount), 0)
    + result.everydayLifeComparison.actual;

  // Écart = ce qu'on n'avait pas prévu
  const ecart = totalReel - totalPrevu;
  const pourcentageErreur = totalPrevu > 0 ? (ecart / totalPrevu) * 100 : 0;

  // Transactions non prévues = unmatched (non liées) + everyday life overshoot
  const transactionsNonPrevues = result.unmatched.length;
  const totalTransactions = result.matched.length + result.probable.length + result.unmatched.length + result.everydayLifeComparison.lines.length;
  const transactionsMatchees = result.matched.length + result.probable.length;
  const tauxCouverture = totalTransactions > 0 ? (transactionsMatchees / totalTransactions) * 100 : 100;

  // Couleur du score
  const scoreColor = pourcentageErreur <= 5 ? "text-emerald-400" : pourcentageErreur <= 15 ? "text-yellow-400" : "text-red-400";
  const scoreBg = pourcentageErreur <= 5 ? "bg-emerald-500" : pourcentageErreur <= 15 ? "bg-yellow-500" : "bg-red-500";
  const scoreLabel = pourcentageErreur <= 5 ? "Excellent" : pourcentageErreur <= 15 ? "Correct" : "À améliorer";

  return (
    <div className="space-y-5">
      {/* Score principal */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Précision des prévisions</div>
        <div className={`text-5xl font-black tabular-nums ${scoreColor}`}>
          {pourcentageErreur <= 0 ? "0" : pourcentageErreur.toFixed(1)}%
        </div>
        <div className={`text-sm font-medium mt-1 ${scoreColor}`}>d&apos;écart — {scoreLabel}</div>
        <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden max-w-xs mx-auto">
          <div
            className={`h-full rounded-full ${scoreBg} transition-all`}
            style={{ width: `${Math.min(100, 100 - pourcentageErreur)}%` }}
          />
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Dépenses prévues</div>
          <div className="text-xl font-bold">{formatEur(totalPrevu)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Dépenses réelles</div>
          <div className="text-xl font-bold text-red-400">{formatEur(totalReel)}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Écart</div>
          <div className={`text-xl font-bold ${ecart > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {ecart > 0 ? "+" : ""}{formatEur(ecart)}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-1">Transactions non prévues</div>
          <div className={`text-xl font-bold ${transactionsNonPrevues > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {transactionsNonPrevues}
          </div>
          <div className="text-xs text-zinc-600 mt-0.5">{transactionsMatchees} / {totalTransactions} matchées ({tauxCouverture.toFixed(0)}%)</div>
        </div>
      </div>

      {/* Détail everyday life */}
      {result.everydayLifeComparison.gap !== 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-500 mb-2">Every day life</div>
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-zinc-400">Budget {formatEur(result.everydayLifeComparison.budgeted)}</span>
            <span className="text-zinc-600">→</span>
            <span className="text-sm text-zinc-200">Réel {formatEur(result.everydayLifeComparison.actual)}</span>
            <span className={`text-sm font-semibold ${result.everydayLifeComparison.gap > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ({result.everydayLifeComparison.gap > 0 ? "+" : ""}{formatEur(result.everydayLifeComparison.gap)})
            </span>
          </div>
        </div>
      )}

      {/* Actions effectuées */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Actions effectuées</div>
        <div className="space-y-1.5 text-sm">
          {recurring.length > 0 && (
            <div className="text-yellow-400">★ {recurring.length} nouvelle(s) récurrente(s) ajoutée(s) pour le mois prochain</div>
          )}
          {punctual.length > 0 && (
            <div className="text-blue-400">● {punctual.length} dépense(s) ponctuelle(s) enregistrée(s)</div>
          )}
          {linked.length > 0 && (
            <div className="text-emerald-400">🔗 {linked.length} dépense(s) liée(s) manuellement</div>
          )}
          {ignored.length > 0 && (
            <div className="text-zinc-500">● {ignored.length} ligne(s) ignorée(s)</div>
          )}
          {bankLabelsLearned > 0 && (
            <div className="text-emerald-400">✓ {bankLabelsLearned} libellé(s) bancaire(s) appris pour les prochains mois</div>
          )}
        </div>
      </div>

      {/* Bouton retour */}
      <button
        onClick={onGoToMonth}
        className="w-full bg-emerald-500 text-emerald-950 font-semibold py-2.5 rounded-lg hover:bg-emerald-400 transition-colors"
      >
        Retour au mois →
      </button>
    </div>
  );
}
