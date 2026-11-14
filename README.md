# Library Management System

NestJS + Prisma + PostgreSQL backend for a library catalog, with JWT authentication and role-based authorization.

## Setup

```bash
cd api
npm install
cp .env.example .env      # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run start:dev         # http://localhost:3000
```

`.env` needs:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
JWT_SECRET="a-long-random-string"
JWT_EXPIRES_IN="1d"
```

The seed creates 4 genres, 16 books and two demo accounts (password `Password123!`):
`librarian@library.test` (LIBRARIAN) and `patron@library.test` (PATRON).

## API

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public. Creates a PATRON and returns a JWT |
| POST | `/auth/login` | Public, rate limited (5 per minute). Returns a JWT |
| GET | `/users/profile` | Any logged-in user |
| GET | `/genres`, `/genres/:id` | Public |
| POST, PATCH, DELETE | `/genres`, `/genres/:id` | LIBRARIAN |
| GET | `/books?genreId=&search=&page=&limit=` | Public |
| GET | `/books/:id` | Public |
| POST, PATCH, DELETE | `/books`, `/books/:id` | LIBRARIAN |

`GET /books` filters by `genreId`, searches title and author (case-insensitive), and paginates with `page` (default 1) and `limit` (default 10, max 100). It returns `{ data, meta: { total, page, limit, totalPages } }`.

Send the token as `Authorization: Bearer <token>`. A Postman collection with a request for every endpoint is in `docs/postman_collection.json`.

## Auth design

- Passwords are hashed with bcrypt before saving and are never returned by the API.
- `JwtStrategy` verifies tokens with `JWT_SECRET`; `JwtAuthGuard` extends `AuthGuard('jwt')`.
- `@Roles(Role.LIBRARIAN)` plus `RolesGuard` checks `req.user.role` against the required roles. A missing or invalid token gives 401, and the wrong role gives 403.
- Registration always creates a PATRON, and `ValidationPipe({ whitelist: true })` strips any `role` field from the request body, so nobody can self-promote to LIBRARIAN.

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
