"use client";

import { useState, useRef } from "react";
import { useToast } from "@/components/Toast";

type ImportSummary = {
  year: number;
  month: number;
  salary: number;
  overdraft: number;
  recurringCount: number;
  diverseCount: number;
  installmentCount: number;
  savingsTotal: number;
  everydayLifeTotal: number;
  incomesCount: number;
};

type Props = {
  onImported: () => void;
};

const MONTH_NAMES = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function ImportExcel({ onImported }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportSummary | null>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast("Format non supporté. Utilisez un fichier .xlsx", "error");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setResult(data.summary);
      toast(`${MONTH_NAMES[data.summary.month]} ${data.summary.year} importé !`);
      onImported();
    } catch (err) {
      toast((err as Error).message || "Erreur lors de l'import", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="mb-8">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/30"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Import en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">📂</span>
            <p className="text-sm text-zinc-400">
              <span className="text-blue-400 font-medium">Cliquez</span> ou glissez un fichier Excel pour importer un mois
            </p>
            <p className="text-xs text-zinc-600">
              Format attendu : &quot;Mois Année.xlsx&quot; (ex: Mars 2026.xlsx)
            </p>
          </div>
        )}
      </div>

      {/* Import result summary */}
      {result && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-emerald-400 mb-2">
            {MONTH_NAMES[result.month]} {result.year} importé avec succès
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-400">
            <span>Salaire : {result.salary} €</span>
            {result.overdraft > 0 && <span>Découvert : {result.overdraft} €</span>}
            <span>{result.recurringCount} charges récurrentes</span>
            {result.everydayLifeTotal > 0 && <span>Every day life : {result.everydayLifeTotal} €</span>}
            {result.diverseCount > 0 && <span>{result.diverseCount} dépenses diverses</span>}
            {result.installmentCount > 0 && <span>{result.installmentCount} échelonné(s)</span>}
            {result.savingsTotal > 0 && <span>Épargne : {result.savingsTotal} €</span>}
            {result.incomesCount > 0 && <span>{result.incomesCount} autre(s) revenu(s)</span>}
          </div>
        </div>
      )}
    </div>
  );
}
