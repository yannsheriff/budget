"use client";

import { IncomeData } from "@/types";
import MonthFields from "@/components/MonthFields";
import IncomeList from "@/components/IncomeList";

type Props = {
  open: boolean;
  onClose: () => void;
  monthId: string;
  salary: number;
  overdraft: number;
  incomes: IncomeData[];
  onUpdate: () => void;
};

export default function IncomeDrawer({ open, onClose, monthId, salary, overdraft, incomes, onUpdate }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">💰 Revenus</h2>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 text-xl leading-none p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
          <MonthFields
            monthId={monthId}
            salary={salary}
            overdraft={overdraft}
            onUpdate={onUpdate}
          />
          <IncomeList
            incomes={incomes}
            monthId={monthId}
            onUpdate={onUpdate}
          />
        </div>
      </div>
    </>
  );
}
