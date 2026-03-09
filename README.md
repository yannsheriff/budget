# Budget Forecast App

Prévision budgétaire mensuelle — app personnelle.

## Setup

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer la base de données

Créer un projet sur [Neon](https://neon.tech) et copier les URLs de connexion dans `.env` :

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/budget?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/budget?sslmode=require"
```

### 3. Créer les tables

```bash
npx prisma db push
```

### 4. Lancer

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Déploiement Vercel

1. Push le projet sur GitHub
2. Importer dans Vercel
3. Ajouter les variables d'environnement `DATABASE_URL` et `DIRECT_URL`
4. Déployer

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run db:push` | Sync schema vers Neon |
| `npm run db:studio` | Ouvrir Prisma Studio |
