"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Mois courant" },
    { href: "/months", label: "Tous les mois" },
    { href: "/installments", label: "Échéanciers" },
  ];

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
        aria-label="Menu"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-14 right-0 left-0 bg-zinc-900 border-b border-zinc-800 z-50 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-5 py-3 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-blue-400 bg-blue-500/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
