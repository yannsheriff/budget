"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ExpenseData, ExpenseType } from "@/types";
import { useToast } from "@/components/Toast";

type Props = {
  open: boolean;
  onClose: () => void;
  expenses: ExpenseData[];
  onSaved: () => void;
};

type TabKey = "all" | "no-cat" | "RECURRING" | "DIVERSE" | "SAVINGS";

const SUGGESTED_CATEGORIES = [
  "Abonnements",
  "Logement",
  "Santé",
  "Télécom",
  "Banque",
  "Transport",
  "Loisirs",
  "Shopping",
  "Voyage",
  "Énergie",
  "Assurance",
  "Don",
];

const TYPE_LABELS: Record<ExpenseType, string> = {
  RECURRING: "Récurrentes",
  DIVERSE: "Diverses",
  SAVINGS: "Épargne",
};

const TYPE_ICONS: Record<ExpenseType, string> = {
  RECURRING: "🔁",
  DIVERSE: "🛍️",
  SAVINGS: "🏦",
};

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
});

export default function CategoryDrawer({ open, onClose, expenses, onSaved }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize categories from existing expense data
  useEffect(() => {
    const initial: Record<string, string> = {};
    expenses.forEach((e) => {
      if (e.category) initial[e.id] = e.category;
    });
    setCategories(initial);
    setSelected(new Set());
    setSearch("");
    setTab("all");
  }, [expenses]);

  // Collect unique categories already used
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) cats.add(e.category);
    });
    Object.values(categories).forEach((c) => {
      if (c) cats.add(c);
    });
    return [...new Set([...SUGGESTED_CATEGORIES, ...cats])];
  }, [expenses, categories]);

  // Filtered expenses
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      // Tab filter
      if (tab === "no-cat") {
        const cat = categories[e.id] || e.category;
        if (cat) return false;
      } else if (tab !== "all") {
        if (e.type !== tab) return false;
      }
      // Search filter
      if (search) {
        return e.label.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });
  }, [expenses, tab, search, categories]);

  // Group by type for display
  const grouped = useMemo(() => {
    const groups: Partial<Record<ExpenseType, ExpenseData[]>> = {};
    filtered.forEach((e) => {
      if (!groups[e.type]) groups[e.type] = [];
      groups[e.type]!.push(e);
    });
    return groups;
  }, [filtered]);

  // Counts for tabs
  const counts = useMemo((): Record<TabKey, number> => {
    const noCatCount = expenses.filter(
      (e) => !(categories[e.id] || e.category)
    ).length;
    const byType: Partial<Record<TabKey, number>> = {};
    expenses.forEach((e) => {
      byType[e.type as TabKey] = (byType[e.type as TabKey] || 0) + 1;
    });
    return {
      all: expenses.length,
      "no-cat": noCatCount,
      RECURRING: byType.RECURRING || 0,
      DIVERSE: byType.DIVERSE || 0,
      SAVINGS: byType.SAVINGS || 0,
    };
  }, [expenses, categories]);

  // Track changes
  const changes = useMemo(() => {
    const changed: { id: string; category: string }[] = [];
    for (const [id, cat] of Object.entries(categories)) {
      const expense = expenses.find((e) => e.id === id);
      if (expense && cat !== (expense.category || "")) {
        changed.push({ id, category: cat });
      }
    }
    return changed;
  }, [categories, expenses]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  }, [filtered, selected]);

  const bulkApply = useCallback(
    (category: string) => {
      if (!category || selected.size === 0) return;
      setCategories((prev) => {
        const next = { ...prev };
        selected.forEach((id) => {
          next[id] = category;
        });
        return next;
      });
      setSelected(new Set());
    },
    [selected]
  );

  const setCategoryForExpense = useCallback((id: string, category: string) => {
    setCategories((prev) => ({ ...prev, [id]: category }));
  }, []);

  const handleSave = useCallback(async () => {
    if (changes.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: changes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erreur lors de la sauvegarde");
      }
      toast(`${changes.length} catégorie(s) mise(s) à jour`);
      onSaved();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }, [changes, toast, onSaved]);

  if (!open) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "no-cat", label: "Sans catégorie" },
    { key: "RECURRING", label: "Récurrentes" },
    { key: "DIVERSE", label: "Diverses" },
    { key: "SAVINGS", label: "Épargne" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[580px] lg:w-[640px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold tracking-tight">
              Catégoriser les dépenses
            </h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 text-xl leading-none p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-zinc-500">
            {expenses.length} dépenses · {counts["no-cat"] || 0} sans catégorie
          </p>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-zinc-800 -mx-5 px-5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelected(new Set()); }}
                className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "text-blue-400 border-blue-400"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {t.label}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t.key
                      ? "bg-blue-500/15 text-blue-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {counts[t.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + selection bar */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 space-y-3">
          <input
            type="text"
            placeholder="Rechercher une dépense..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
          />

          {/* Selection action bar */}
          {selected.size > 0 && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-300">
                  {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline"
                >
                  Désélectionner
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[11px] text-zinc-500 mr-1">
                  Appliquer :
                </span>
                {existingCategories.slice(0, 10).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => bulkApply(cat)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 hover:text-white transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense list */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {/* Select all toggle */}
          <div className="flex items-center gap-2 py-2 mb-1">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={selectAll}
              className="accent-blue-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-[11px] text-zinc-500">
              Tout sélectionner ({filtered.length})
            </span>
          </div>

          {(["RECURRING", "DIVERSE", "SAVINGS"] as ExpenseType[]).map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;

            const typeTotal = items.reduce((s, e) => s + e.amount, 0);

            return (
              <div key={type} className="mb-4">
                {/* Section header — only if multiple types visible */}
                {Object.keys(grouped).length > 1 && (
                  <div className="flex items-center justify-between py-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    <span>
                      {TYPE_ICONS[type]} {TYPE_LABELS[type]}
                    </span>
                    <span>{fmt.format(typeTotal)}</span>
                  </div>
                )}

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/60">
                  {items.map((expense) => {
                    const currentCat = categories[expense.id] ?? expense.category ?? "";
                    const isSelected = selected.has(expense.id);

                    return (
                      <div
                        key={expense.id}
                        className={`flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors ${
                          isSelected ? "bg-blue-500/5" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(expense.id)}
                          className="accent-blue-500 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                        />
                        <span className="flex-1 text-sm font-medium truncate">
                          {expense.label}
                        </span>
                        <span className="text-sm tabular-nums text-zinc-400 whitespace-nowrap">
                          {fmt.format(expense.amount)}
                        </span>
                        <input
                          type="text"
                          list={`cats-drawer-${expense.type}`}
                          placeholder="+ Catégorie"
                          value={currentCat}
                          onChange={(e) =>
                            setCategoryForExpense(expense.id, e.target.value)
                          }
                          className={`w-[130px] bg-zinc-950 border rounded-md px-2 py-1 text-xs outline-none transition-colors flex-shrink-0 ${
                            currentCat
                              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                              : "border-zinc-700/60 text-zinc-300 placeholder:text-zinc-600"
                          } focus:border-blue-500/50 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-600 text-sm">
              Aucune dépense trouvée
            </div>
          )}
        </div>

        {/* Datalists for each type */}
        {(["RECURRING", "DIVERSE", "SAVINGS"] as ExpenseType[]).map((type) => (
          <datalist key={type} id={`cats-drawer-${type}`}>
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        ))}

        {/* Save bar */}
        {changes.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-sm border-t border-zinc-800 px-5 py-3 flex items-center justify-center gap-3">
            <span className="text-sm text-zinc-400">
              <strong className="text-blue-400">{changes.length}</strong>{" "}
              catégorie{changes.length > 1 ? "s" : ""} modifiée
              {changes.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-6 py-2 transition-colors"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
