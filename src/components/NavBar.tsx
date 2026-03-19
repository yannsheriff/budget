"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function NavBar() {
  const pathname = usePathname();
  const hidden = pathname === "/login";

  return (
    <div className={hidden ? "hidden" : ""}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 h-14 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-bold text-blue-400 tracking-tight">
          Budget Forecast
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-1">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
          >
            Mois courant
          </Link>
          <Link
            href="/months"
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
          >
            Tous les mois
          </Link>
          <Link
            href="/installments"
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
          >
            Échéanciers
          </Link>
        </div>

        {/* Mobile nav toggle */}
        <MobileNav />
      </nav>
      <div className="h-14" />
    </div>
  );
}
