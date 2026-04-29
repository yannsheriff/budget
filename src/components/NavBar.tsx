"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default function NavBar() {
  const pathname = usePathname();
  const hidden = pathname === "/login";

  return (
    <div className={hidden ? "hidden" : ""}>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 h-14 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-bold text-blue-500 dark:text-blue-400 tracking-tight">
          Budget Forecast
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-1">
          <Link
            href="/"
            className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
          >
            Mois courant
          </Link>
          <Link
            href="/months"
            className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
          >
            Tous les mois
          </Link>
          <Link
            href="/installments"
            className="text-sm font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-md transition-colors"
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
