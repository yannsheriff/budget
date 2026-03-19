"use client";

import { useRouter } from "next/navigation";
import { getMonthLabel } from "@/lib/weeks";
import NextMonthButton from "@/components/NextMonthButton";

type Props = {
  year: number;
  month: number;
};

export default function MonthNav({ year, month }: Props) {
  const router = useRouter();
  const label = getMonthLabel(year, month);

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  async function navigateTo(y: number, m: number) {
    const res = await fetch("/api/months/find-or-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: y, month: m }),
    });
    const data = await res.json();
    if (data.id) router.push(`/month/${data.id}`);
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={() => navigateTo(prev.year, prev.month)}
        className="w-9 h-9 bg-zinc-800/60 border border-zinc-700/50 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40 transition-colors text-base"
      >
        ←
      </button>
      <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
      <NextMonthButton year={year} month={month} />
    </div>
  );
}
