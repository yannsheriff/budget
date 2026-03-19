"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMonthLabel } from "@/lib/weeks";
import { useToast } from "@/components/Toast";

type Props = {
  year: number;
  month: number;
};

const CREATE_DAY = 24;

const btnBase =
  "w-9 h-9 bg-zinc-800/60 border border-zinc-700/50 rounded-lg flex items-center justify-center transition-colors text-base";

export default function NextMonthButton({ year, month }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [nextExists, setNextExists] = useState<boolean | null>(null);

  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((months: { year: number; month: number }[]) => {
        setNextExists(months.some((m) => m.year === next.year && m.month === next.month));
      })
      .catch(() => setNextExists(false));
  }, [next.year, next.month]);

  async function goNext() {
    const res = await fetch("/api/months/find-or-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: next.year, month: next.month }),
    });
    const data = await res.json();
    if (data.id) router.push(`/month/${data.id}`);
  }

  const today = new Date();
  const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
  const canCreate =
    isPastMonth || (today.getDate() >= CREATE_DAY && today.getFullYear() === year && today.getMonth() + 1 === month);

  if (nextExists === null) return <div className="w-9 h-9" />;

  if (nextExists) {
    return (
      <button onClick={goNext} className={`${btnBase} text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40`}>
        →
      </button>
    );
  }

  if (canCreate) {
    return (
      <button
        onClick={goNext}
        className={`${btnBase} text-emerald-400 hover:text-emerald-300 hover:bg-zinc-700/40`}
        title={`Créer ${getMonthLabel(next.year, next.month)}`}
      >
        +
      </button>
    );
  }

  return (
    <button
      onClick={() => toast("Disponible à partir du 24", "info")}
      className={`${btnBase} text-zinc-600 cursor-not-allowed`}
      title={`Disponible à partir du 24`}
    >
      +
    </button>
  );
}
