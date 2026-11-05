# Library Management System

NestJS + Prisma + PostgreSQL data layer for a library book catalog.

## Setup

```bash
cd api
npm install
cp .env.example .env      # paste your hosted PostgreSQL URL into .env
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

## Schema Decisions

**Why Book references Genre instead of embedding it**

Book stores a `genreId` foreign key with a `@relation` to the Genre table
rather than copying the genre name into each book row.

- **Single source of truth:** renaming a genre is one update, not one per book.
- **Consistency:** the foreign key prevents assigning a genre that doesn't exist.
- **Easy querying:** listing or counting books per genre is a simple indexed join.
- **Extensible:** a genre can later gain its own fields (description, slug) without touching Book rows.

**Stretch: Prisma vs. a document database**

In a document DB I would have been tempted to embed the genre or reviews
inside each book document. In Prisma, I model them as separate tables with
relations and let the database enforce integrity.
