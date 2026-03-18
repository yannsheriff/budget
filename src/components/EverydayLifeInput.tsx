"use client";

import { useState, useEffect } from "react";
import { formatEur } from "@/lib/formatters";
import { getWeeksInMonth } from "@/lib/weeks";
import { updateMonth } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Props = {
  monthId: string;
  year: number;
  month: number;
  weeklyBudget: number;
  onUpdate: () => void;
};

export default function EverydayLifeInput({ monthId, year, month, weeklyBudget, onUpdate }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(weeklyBudget.toString());
  const weeks = getWeeksInMonth(year, month);
  const numValue = parseFloat(value) || 0;
  const total = numValue * weeks;

  useEffect(() => {
    setValue(weeklyBudget.toString());
  }, [weeklyBudget]);

  async function handleBlur() {
    const newVal = parseFloat(value) || 0;
    if (newVal !== weeklyBudget) {
      try {
        await updateMonth(monthId, { weeklyEverydayBudget: newVal });
        onUpdate();
      } catch (err) {
        toast((err as Error).message || "Erreur de mise à jour", "error");
        setValue(weeklyBudget.toString());
      }
    }
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-3 cursor-pointer"
      >
        <h3 className="text-[15px] font-bold flex items-center gap-2">
          <span className="text-lg">🛒</span> Every day life
          <span className={`text-xs text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </h3>
        <span className="text-sm text-zinc-500 font-semibold tabular-nums">
          {formatEur(total)}
        </span>
      </button>

      {open && (
        <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <label className="text-sm text-zinc-500 whitespace-nowrap min-w-[100px]">
              Par semaine
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleBlur()}
              className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 text-right tabular-nums"
            />
            <span className="text-sm text-zinc-500">€</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-zinc-500 border-t border-zinc-700/50">
            {formatEur(numValue)}/sem × {weeks} semaines ={" "}
            <span className="text-zinc-200 font-bold text-[15px] ml-1">
              {formatEur(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
