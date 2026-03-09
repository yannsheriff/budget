"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 400);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Subtle blue glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          height: 400,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2 max-w-[460px] w-full">
        {/* Lock icon */}
        <div className="relative w-[140px] h-[140px] mb-3">
          {/* Shackle */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-[56px] border-[8px] border-zinc-600 border-b-0 rounded-t-[30px]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 -2px 8px rgba(0,0,0,0.3)",
            }}
          />
          {/* Body */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100px] h-[80px] rounded-[18px] border border-white/[0.06]"
            style={{
              background: "linear-gradient(145deg, #2a2d35, #1c1e26)",
              boxShadow:
                "0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Keyhole */}
            <div className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[22px] h-[22px] bg-[#0f1117] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
              <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[8px] h-[16px] bg-[#0f1117] rounded-b shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[32px] font-bold text-center leading-tight tracking-tight text-zinc-200">
          Entrez le mot de passe
          <br />
          pour accéder à{" "}
          <span className="text-blue-400">Budget Forecast</span>
        </h1>

        <p className="text-sm text-zinc-500 mb-7">
          Application protégée — accès personnel uniquement
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`flex items-center w-full max-w-[380px] bg-zinc-800/60 border rounded-full px-6 pr-1.5 py-1.5 transition-all ${
            error
              ? "border-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
              : "border-zinc-700/60 focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          } ${shake ? "animate-shake" : ""}`}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Mot de passe"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-zinc-200 placeholder:text-zinc-600 py-2"
            autoFocus
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-200 text-zinc-900 rounded-full px-7 py-2.5 text-sm font-semibold hover:bg-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Entrer"
            )}
          </button>
        </form>

        {/* Error message */}
        <p
          className={`text-red-400 text-[13px] mt-3 h-5 transition-opacity ${
            error ? "opacity-100" : "opacity-0"
          }`}
        >
          Mot de passe incorrect
        </p>
      </div>

      {/* Footer */}
      <p className="fixed bottom-8 text-[12px] text-zinc-700">
        Budget Forecast v1 — Données chiffrées
      </p>
    </div>
  );
}
