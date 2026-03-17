"use client";

/**
 * SearchSelect — Composant réutilisable de recherche avec sélection clavier.
 *
 * Affiche un input de recherche + une liste de résultats navigable au clavier.
 *
 * ## Usage
 *
 * ```tsx
 * <SearchSelect
 *   items={expenses}
 *   filterFn={(item, query) =>
 *     item.label.toLowerCase().includes(query.toLowerCase())
 *   }
 *   renderItem={(item, highlighted) => (
 *     <div className={highlighted ? "bg-zinc-800" : ""}>
 *       {item.label}
 *     </div>
 *   )}
 *   onSelect={(item) => handleLink(item)}
 *   keyFn={(item) => item.id}
 *   placeholder="Rechercher..."
 *   maxResults={10}
 *   emptyMessage="Aucun résultat"
 *   autoFocus
 * />
 * ```
 *
 * ## Props
 * - `items` — Liste complète des éléments à filtrer
 * - `filterFn` — Fonction de filtrage (item, query) => boolean
 * - `renderItem` — Rendu de chaque item, reçoit (item, highlighted)
 * - `onSelect` — Callback quand un item est sélectionné (clic ou Enter)
 * - `keyFn` — Extrait une clé unique pour chaque item
 * - `placeholder` — Placeholder de l'input (optionnel)
 * - `maxResults` — Nombre max de résultats affichés (défaut: 10)
 * - `emptyMessage` — Message quand aucun résultat (défaut: "Aucun résultat")
 * - `autoFocus` — Focus auto sur l'input (défaut: false)
 *
 * ## Clavier
 * - Flèche bas/haut : naviguer dans la liste
 * - Enter : valider l'item sélectionné
 * - La sélection se reset quand la recherche change
 */

import { useState, useEffect, useRef, ReactNode } from "react";

type SearchSelectProps<T> = {
  items: T[];
  filterFn: (item: T, query: string) => boolean;
  renderItem: (item: T, highlighted: boolean) => ReactNode;
  onSelect: (item: T) => void;
  keyFn: (item: T) => string;
  placeholder?: string;
  maxResults?: number;
  emptyMessage?: string;
  autoFocus?: boolean;
};

export default function SearchSelect<T>({
  items,
  filterFn,
  renderItem,
  onSelect,
  keyFn,
  placeholder = "Rechercher...",
  maxResults = 10,
  emptyMessage = "Aucun résultat",
  autoFocus = false,
}: SearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query ? items.filter((item) => filterFn(item, query)) : items;
  const visible = filtered.slice(0, maxResults);

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const children = listRef.current.children;
    if (children[highlightIndex]) {
      (children[highlightIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visible.length > 0 && highlightIndex < visible.length) {
        onSelect(visible[highlightIndex]);
      }
    }
  }

  return (
    <>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 mb-2"
        autoFocus={autoFocus}
      />
      <div
        ref={listRef}
        className="max-h-40 overflow-y-auto border border-zinc-800 rounded-md divide-y divide-zinc-800/50"
      >
        {visible.map((item, i) => (
          <div
            key={keyFn(item)}
            onClick={() => onSelect(item)}
            className="cursor-pointer transition-colors"
          >
            {renderItem(item, i === highlightIndex)}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-xs text-zinc-600">{emptyMessage}</div>
        )}
      </div>
    </>
  );
}
