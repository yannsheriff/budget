"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "budget-auth-token";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  // On mount, try to restore session from localStorage token
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setRefreshing(false);
      return;
    }

    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: saved }),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("expired");
      })
      .then((data) => {
        localStorage.setItem(TOKEN_KEY, data.token);
        router.replace("/");
        router.refresh();
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setRefreshing(false);
      });
  }, [router]);

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
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.token);
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

  if (refreshing) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f1117] flex flex-col items-center justify-center relative overflow-hidden px-4">
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
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[60px] h-[56px] border-[8px] border-gray-300 dark:border-zinc-600 border-b-0 rounded-t-[30px]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.08), 0 -2px 8px rgba(0,0,0,0.3)",
            }}
          />
          {/* Body */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100px] h-[80px] rounded-[18px] border border-gray-200 dark:border-white/[0.06]"
            style={{
              background: "linear-gradient(145deg, #d1d5db, #e5e7eb)",
            }}
          >
            {/* Keyhole */}
            <div className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[22px] h-[22px] bg-gray-400 dark:bg-[#0f1117] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
              <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[8px] h-[16px] bg-gray-400 dark:bg-[#0f1117] rounded-b shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] sm:text-[32px] font-bold text-center leading-tight tracking-tight text-gray-900 dark:text-zinc-200">
          Entrez le mot de passe
          <br />
          pour accéder à{" "}
          <span className="text-blue-500 dark:text-blue-400">Budget Forecast</span>
        </h1>

        <p className="text-sm text-gray-500 dark:text-zinc-500 mb-7">
          Application protégée — accès personnel uniquement
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`flex items-center w-full max-w-[380px] bg-gray-100 dark:bg-zinc-800/60 border rounded-full px-6 pr-1.5 py-1.5 transition-all ${
            error
              ? "border-red-400 dark:border-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
              : "border-gray-300 dark:border-zinc-700/60 focus-within:border-blue-400 dark:focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
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
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-gray-900 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 py-2"
            autoFocus
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-full px-7 py-2.5 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white dark:border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Entrer"
            )}
          </button>
        </form>

        {/* Error message */}
        <p
          className={`text-red-500 dark:text-red-400 text-[13px] mt-3 h-5 transition-opacity ${
            error ? "opacity-100" : "opacity-0"
          }`}
        >
          Mot de passe incorrect
        </p>
      </div>

      {/* Footer */}
      <p className="fixed bottom-8 text-[12px] text-gray-400 dark:text-zinc-700">
        Budget Forecast v1 — Données chiffrées
      </p>
    </div>
  );
}
