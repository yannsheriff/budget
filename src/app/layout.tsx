import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import MobileNav from "@/components/MobileNav";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget Forecast",
  description: "Prévision budgétaire mensuelle",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.className} bg-[#0f1117] text-zinc-200 antialiased`}>
        {/* Top navigation */}
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

        {/* Content with nav offset */}
        <Providers>
          <div className="pt-14">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
