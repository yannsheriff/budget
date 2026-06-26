"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExpenseType, ExpenseFrequency } from "@/types";
import { createExpense, createInstallment } from "@/lib/api";
import { formatEur } from "@/lib/formatters";
import { useToast } from "@/components/Toast";

const TYPES: { value: ExpenseType; label: string; icon: string; hint: string }[] = [
  { value: "RECURRING", label: "Récurrente", icon: "🔁", hint: "Charge qui revient chaque mois" },
  { value: "DIVERSE", label: "Diverse", icon: "🛍️", hint: "Dépense ponctuelle ou échelonnée" },
  { value: "SAVINGS", label: "Épargne", icon: "🏦", hint: "Mise de côté" },
];

const TYPE_LABEL: Record<ExpenseType, string> = {
  RECURRING: "Récurrente",
  DIVERSE: "Diverse",
  SAVINGS: "Épargne",
};

// Étapes du wizard : Type → Prix → Nom (→ Catégorie sauf échelonné)
export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const monthId = params.id as string;

  const [step, setStep] = useState(1);
  const [type, setType] = useState<ExpenseType | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<ExpenseFrequency>("MONTHLY");
  const [isInstallment, setIsInstallment] = useState(false);
  const [nbMonths, setNbMonths] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const amountNum = parseFloat(amount.replace(",", ".")) || 0;
  const monthsNum = parseInt(nbMonths) || 0;
  const showInstallment = type === "DIVERSE" && isInstallment;
  const perMonth =
    showInstallment && monthsNum > 0
      ? Math.round((amountNum / monthsNum) * 100) / 100
      : 0;

  // Échelonné : pas de catégorie (non supportée par le modèle) → étape Catégorie sautée
  const totalSteps = showInstallment ? 3 : 4;

  const step1Valid = !!type; // Type
  const step2Valid = amountNum > 0 && (!showInstallment || monthsNum >= 2); // Prix
  const step3Valid = label.trim().length > 0; // Nom
  const canSubmit = step1Valid && step2Valid && step3Valid && !submitting;

  function currentStepValid() {
    if (step === 1) return step1Valid;
    if (step === 2) return step2Valid;
    if (step === 3) return step3Valid;
    return true;
  }

  function goNext() {
    if (!currentStepValid()) return;
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  function goPrev() {
    if (step === 1) {
      router.push(`/month/${monthId}`);
    } else {
      setStep((s) => s - 1);
    }
  }

  function selectType(t: ExpenseType) {
    setType(t);
    setStep(2); // auto-avance pour la fluidité
  }

  async function handleSubmit() {
    if (!type || !canSubmit) return;
    setSubmitting(true);
    try {
      if (showInstallment) {
        await createInstallment({
          label: label.trim(),
          totalAmount: amountNum,
          nbMonths: monthsNum,
          monthId,
        });
        toast("Échelonné créé !");
      } else {
        await createExpense({
          monthId,
          type,
          label: label.trim(),
          amount: amountNum,
          frequency: type === "RECURRING" ? frequency : "MONTHLY",
          category: category.trim() || undefined,
        });
        toast("Dépense ajoutée !");
      }
      router.push(`/month/${monthId}`);
    } catch (err) {
      toast((err as Error).message || "Erreur lors de l'ajout", "error");
      setSubmitting(false);
    }
  }

  const isLastStep = step === totalSteps;
  const amountFieldLabel = showInstallment ? "Montant total" : "Montant";
  const stepTitle =
    step === 1 ? "Type" : step === 2 ? "Prix" : step === 3 ? "Nom" : "Catégorie";

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0f1117] flex flex-col">
      {/* Header + progress */}
      <header className="flex-shrink-0 border-b border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={goPrev}
            className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors w-20 text-left"
          >
            {step === 1 ? "Annuler" : "← Précédent"}
          </button>
          <span className="text-[15px] font-bold">{stepTitle}</span>
          <span className="w-20 text-right text-xs font-medium text-gray-400 dark:text-zinc-500">
            Étape {step}/{totalSteps}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-zinc-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-[600px] w-full mx-auto">
        {/* ── Étape 1 : Type ── */}
        {step === 1 && (
          <div className="space-y-3 animate-slide-up" key="step1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-1">
              Quel type de dépense ?
            </p>
            {TYPES.map((t) => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => selectType(t.value)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-gray-200 dark:border-zinc-700/60 hover:border-gray-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="flex flex-col">
                    <span className="text-base font-bold text-gray-900 dark:text-zinc-100">
                      {t.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-zinc-500">
                      {t.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Étape 2 : Prix (+ fréquence / échelonné) ── */}
        {step === 2 && type && (
          <div className="space-y-6 animate-slide-up" key="step2">
            {/* Montant */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2 block">
                {amountFieldLabel}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-3.5 text-2xl text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500 text-right tabular-nums"
                />
                <span className="text-2xl text-gray-500 dark:text-zinc-500">€</span>
              </div>
            </div>

            {/* Fréquence — récurrente uniquement */}
            {type === "RECURRING" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2 block">
                  Fréquence
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["MONTHLY", "WEEKLY"] as ExpenseFrequency[]).map((f) => {
                    const active = frequency === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFrequency(f)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          active
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-gray-200 dark:border-zinc-700/60 text-gray-600 dark:text-zinc-400"
                        }`}
                      >
                        {f === "MONTHLY" ? "Mensuel" : "Hebdomadaire"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Échelonné — diverse uniquement */}
            {type === "DIVERSE" && (
              <div>
                <button
                  onClick={() => setIsInstallment((v) => !v)}
                  className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl border border-gray-200 dark:border-zinc-700/60"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Paiement échelonné
                  </span>
                  <span
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                      isInstallment ? "bg-blue-500" : "bg-gray-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        isInstallment ? "translate-x-5" : ""
                      }`}
                    />
                  </span>
                </button>

                {isInstallment && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2 block">
                        Nombre de mois
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={nbMonths}
                        onChange={(e) => setNbMonths(e.target.value)}
                        placeholder="Ex : 4"
                        className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500 text-right tabular-nums"
                      />
                    </div>
                    {perMonth > 0 && (
                      <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-xl px-4 py-3">
                        {formatEur(perMonth)}/mois pendant {monthsNum} mois
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Étape 3 : Nom (+ récap si échelonné, dernière étape) ── */}
        {step === 3 && type && (
          <div className="space-y-6 animate-slide-up" key="step3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2 block">
                Nom
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex : Loyer, Courses, Netflix…"
                autoFocus
                className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500"
              />
            </div>

            {showInstallment && <Recap
              type={type}
              label={label}
              amountNum={amountNum}
              frequency={frequency}
              showInstallment={showInstallment}
              monthsNum={monthsNum}
              perMonth={perMonth}
              category={category}
            />}
          </div>
        )}

        {/* ── Étape 4 : Catégorie + récap (sauf échelonné) ── */}
        {step === 4 && type && !showInstallment && (
          <div className="space-y-6 animate-slide-up" key="step4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-2 block">
                Catégorie <span className="font-normal normal-case">(optionnel)</span>
              </label>
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {categories.map((cat) => {
                    const active = category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategory(active ? "" : cat)}
                        className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                          active
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "border-gray-200 dark:border-zinc-700/60 text-gray-600 dark:text-zinc-400"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Nouvelle catégorie…"
                className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-zinc-200 outline-none focus:border-blue-500"
              />
            </div>

            <Recap
              type={type}
              label={label}
              amountNum={amountNum}
              frequency={frequency}
              showInstallment={showInstallment}
              monthsNum={monthsNum}
              perMonth={perMonth}
              category={category}
            />
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-zinc-800 max-w-[600px] w-full mx-auto flex gap-3">
        {step > 1 && (
          <button
            onClick={goPrev}
            className="flex-1 py-4 rounded-xl text-base font-bold text-gray-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            Précédent
          </button>
        )}
        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-bold transition-colors"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!currentStepValid()}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-bold transition-colors"
          >
            Suivant
          </button>
        )}
      </div>
    </div>
  );
}

function Recap({
  type,
  label,
  amountNum,
  frequency,
  showInstallment,
  monthsNum,
  perMonth,
  category,
}: {
  type: ExpenseType;
  label: string;
  amountNum: number;
  frequency: ExpenseFrequency;
  showInstallment: boolean;
  monthsNum: number;
  perMonth: number;
  category: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/60 divide-y divide-gray-100 dark:divide-zinc-800 text-sm">
      <RecapRow label="Type" value={TYPE_LABEL[type]} />
      <RecapRow label="Nom" value={label.trim() || "—"} />
      <RecapRow
        label={showInstallment ? "Montant total" : "Montant"}
        value={formatEur(amountNum)}
      />
      {type === "RECURRING" && (
        <RecapRow label="Fréquence" value={frequency === "MONTHLY" ? "Mensuel" : "Hebdomadaire"} />
      )}
      {showInstallment && (
        <RecapRow label="Échelonné" value={`${formatEur(perMonth)}/mois × ${monthsNum}`} />
      )}
      {!showInstallment && (
        <RecapRow label="Catégorie" value={category.trim() || "Aucune"} />
      )}
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-gray-500 dark:text-zinc-500">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-zinc-200 text-right">{value}</span>
    </div>
  );
}
