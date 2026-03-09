"use client";

import { useState, useEffect } from "react";
import { updateMonth } from "@/lib/api";

type Props = {
  monthId: string;
  salary: number;
  overdraft: number;
  onUpdate: () => void;
};

export default function MonthFields({ monthId, salary, overdraft, onUpdate }: Props) {
  const [salaryVal, setSalaryVal] = useState(salary.toString());
  const [overdraftVal, setOverdraftVal] = useState(overdraft.toString());

  useEffect(() => {
    setSalaryVal(salary.toString());
    setOverdraftVal(overdraft.toString());
  }, [salary, overdraft]);

  async function handleSalaryBlur() {
    const newVal = parseFloat(salaryVal) || 0;
    if (newVal !== salary) {
      await updateMonth(monthId, { salary: newVal });
      onUpdate();
    }
  }

  async function handleOverdraftBlur() {
    const newVal = parseFloat(overdraftVal) || 0;
    if (newVal !== overdraft) {
      await updateMonth(monthId, { overdraft: newVal });
      onUpdate();
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold flex items-center gap-2">
          <span className="text-lg">💰</span> Revenus
        </h3>
      </div>

      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <label className="text-sm text-zinc-500 whitespace-nowrap min-w-[100px]">
            Salaire
          </label>
          <input
            type="number"
            value={salaryVal}
            onChange={(e) => setSalaryVal(e.target.value)}
            onBlur={handleSalaryBlur}
            onKeyDown={(e) => e.key === "Enter" && handleSalaryBlur()}
            className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 text-right tabular-nums"
          />
          <span className="text-sm text-zinc-500">€</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-700/50">
          <label className="text-sm text-zinc-500 whitespace-nowrap min-w-[100px]">
            Découvert
          </label>
          <input
            type="number"
            value={overdraftVal}
            onChange={(e) => setOverdraftVal(e.target.value)}
            onBlur={handleOverdraftBlur}
            onKeyDown={(e) => e.key === "Enter" && handleOverdraftBlur()}
            className="w-32 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 text-right tabular-nums"
          />
          <span className="text-sm text-zinc-500">€</span>
        </div>
      </div>
    </div>
  );
}
