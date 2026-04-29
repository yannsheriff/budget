"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonthData } from "@/types";
import { createMonth } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/months");
        const months: MonthData[] = await res.json();

        if (months.length > 0) {
          router.replace(`/month/${months[0].id}`);
        } else {
          const now = new Date();
          const result = await createMonth(now.getFullYear(), now.getMonth() + 1);

          if (result.id) {
            router.replace(`/month/${result.id}`);
          } else {
            setError("Impossible de créer le mois courant.");
            setLoading(false);
          }
        }
      } catch {
        setError("Erreur de connexion à la base de données. Vérifiez votre configuration Neon.");
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold mb-3">Configuration requise</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mb-6">{error}</p>
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 text-left">
            <p className="text-xs text-gray-500 dark:text-zinc-500 mb-2">
              Fichier <code className="text-blue-500 dark:text-blue-400">.env</code> :
            </p>
            <pre className="text-xs text-gray-500 dark:text-zinc-400 font-mono whitespace-pre-wrap">
{`DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."`}
            </pre>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-4">
            Puis lancez{" "}
            <code className="text-blue-500 dark:text-blue-400">npx prisma db push</code> pour créer les
            tables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="text-gray-400 dark:text-zinc-500">Chargement...</div>
    </div>
  );
}
