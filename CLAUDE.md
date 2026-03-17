# Budget Forecast App

Application de prévision budgétaire mensuelle personnelle, remplaçant un historique de fichiers Excel.

## Stack technique

- **Framework** : Next.js 14+ (App Router), TypeScript
- **ORM** : Prisma 5+ avec PostgreSQL (Neon serverless)
- **Styling** : Tailwind CSS, dark mode uniquement
- **Auth** : JWT via `jose` (Edge Runtime compatible), middleware Next.js, cookie httpOnly 90 jours
- **Déploiement** : Vercel (build: `prisma generate && next build`)
- **Dépendances notables** : `xlsx` (SheetJS) pour l'import Excel, `jose` pour JWT

## Structure du projet

```
src/
├── app/
│   ├── layout.tsx              # Nav globale (desktop + MobileNav)
│   ├── page.tsx                # Redirige vers le mois courant
│   ├── months/page.tsx         # Liste des mois + ImportExcel
│   ├── month/[id]/page.tsx     # Vue principale d'un mois
│   ├── installments/page.tsx   # Échéanciers en cours
│   ├── login/
│   │   ├── page.tsx            # Page login (dark, lock icon)
│   │   └── layout.tsx          # Layout vide (pas de nav)
│   └── api/
│       ├── auth/login/route.ts          # POST login → JWT cookie
│       ├── months/route.ts              # GET liste, POST créer
│       ├── months/[id]/route.ts         # GET, PATCH, DELETE
│       ├── months/find-or-create/route.ts
│       ├── expenses/route.ts            # POST créer
│       ├── expenses/[id]/route.ts       # PATCH, DELETE
│       ├── expenses/categories/route.ts # PATCH batch update catégories
│       ├── incomes/route.ts             # POST
│       ├── incomes/[id]/route.ts        # PATCH, DELETE
│       ├── installments/route.ts        # GET, POST
│       ├── installments/[id]/route.ts   # GET, DELETE
│       ├── categories/route.ts          # GET catégories existantes
│       └── import/route.ts              # POST FormData Excel → créé un mois complet
├── components/
│   ├── CategoryDrawer.tsx      # Drawer latéral d'édition des catégories (bulk edit)
│   ├── ConfirmBanner.tsx       # Bandeau confirmation des récurrentes reportées
│   ├── ExpenseList.tsx         # Liste de dépenses filtrée par type (RECURRING/DIVERSE/SAVINGS)
│   ├── EverydayLifeInput.tsx   # Input budget hebdo every day life
│   ├── ImportExcel.tsx         # Drag & drop import de fichier Excel
│   ├── IncomeList.tsx          # CRUD revenus additionnels
│   ├── InstallmentForm.tsx     # Formulaire création échelonné
│   ├── MobileNav.tsx           # Menu hamburger mobile
│   ├── MonthFields.tsx         # Édition salaire + découvert
│   ├── MonthNav.tsx            # Navigation mois précédent/suivant
│   ├── MonthSummary.tsx        # Récapitulatif budget (sidebar desktop, inline mobile)
│   ├── Providers.tsx           # Client wrapper pour ToastProvider
│   ├── SearchSelect.tsx        # Input recherche + liste navigable clavier (flèches + Enter), générique via renderItem
│   └── Toast.tsx               # Système de notifications toast (Context)
├── lib/
│   ├── api.ts                  # Helpers fetch client (request, post, patch, del)
│   ├── auth.ts                 # JWT : createToken, verifyToken, checkPassword
│   ├── budget-calc.ts          # Calculs récapitulatif (budgetReel, reste, status)
│   ├── db.ts                   # Singleton Prisma client
│   ├── excel-parser.ts         # Parse fichier Excel budget → ParsedMonth
│   ├── formatters.ts           # Sérialisation Decimal → number
│   └── weeks.ts                # Nombre de semaines (lundis) dans un mois
├── middleware.ts               # Auth : protège toutes les routes sauf /login
└── types/index.ts              # Types partagés (MonthData, ExpenseData, etc.)
```

## Modèle de données (Prisma)

4 modèles principaux : `Month`, `Expense`, `Income`, `Installment`.

- **Month** : year, month (unique ensemble), salary, overdraft, weeklyEverydayBudget, isConfirmed
- **Expense** : type (RECURRING/DIVERSE/SAVINGS), label, amount, frequency (MONTHLY/WEEKLY), category?, isConfirmed, isRemainder, installmentId?
- **Income** : label, amount
- **Installment** : label, totalAmount, nbMonths, startYear, startMonth

Relations : Month hasMany Expense/Income. Installment hasMany Expense. Cascade delete sur Month→Expense/Income. SetNull sur Installment→Expense.

## Features implémentées

### Lots 0-3 (MVP → Catégories)
- CRUD complet mois/dépenses/revenus
- Report automatique des récurrentes vers mois suivant + bandeau de confirmation
- Paiements échelonnés (création + génération auto dans les mois futurs)
- Catégories sur dépenses (champ libre avec suggestions datalist)
- Regroupement visuel par catégorie dans ExpenseList
- Navigation entre mois + page historique `/months`
- Récapitulatif budget avec indicateur santé (vert/orange/rouge)
- Budget "every day life" hebdomadaire × nb de semaines du mois

### Lot 4 (Polish)
- Responsive mobile (MobileNav hamburger, boutons touch-friendly)
- Système de toasts (success/error/info)
- Gestion d'erreurs centralisée (api.ts throw + try/catch dans chaque composant)
- Auth par mot de passe (JWT 90 jours, middleware Edge Runtime)

### Post-lots
- **Import Excel** : drag & drop de fichiers `.xlsx` historiques (format "Mois Année.xlsx"), parse automatique des colonnes (récurrentes, every day life, divers, épargne, revenus, découvert), détection des échelonnés (pattern "label X/Y"), création atomique en transaction Prisma
- **Category Drawer** : drawer latéral sur la page mois pour catégoriser les dépenses en bulk (checkboxes + chips de catégories + input inline), accessible via bouton "Catégoriser" dans le header du mois ou lien post-import, API batch `PATCH /api/expenses/categories`

## Variables d'environnement

```
DATABASE_URL=postgresql://...      # Neon connection pooling
DIRECT_URL=postgresql://...        # Neon direct (migrations)
APP_PASSWORD=...                   # Mot de passe unique pour l'auth
JWT_SECRET=...                     # Secret pour signer les JWT
```

## Conventions de code

- Dark mode uniquement (bg-zinc-950, text-zinc-200, etc.)
- Composants client avec `"use client"` directive
- Toutes les mutations passent par `/api/` routes
- `useToast()` pour le feedback utilisateur après chaque action
- `try/catch` systématique dans les handlers de composants
- Boutons d'action : `sm:opacity-0 sm:group-hover:opacity-100` (toujours visibles sur mobile)
- Montants formatés avec `Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })`
- Datalist IDs uniques par type pour éviter les conflits : `category-suggestions-${type}`
- Séparateurs de lignes avec `divide-y divide-zinc-800` (pas de border-b individuel)

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production (prisma generate + next build)
npx prisma studio    # Interface visuelle de la DB
npx prisma migrate dev  # Appliquer les migrations en dev
```
