# StockFlow Web

Next.js App Router client for StockFlow's cookie-backed session API.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_BASE_URL` to the exact backend origin. The backend must configure this frontend origin in both `FRONTEND_ORIGIN` and `CORS_ORIGINS`.

The browser never reads or persists the session cookie. Every API request includes `credentials: "include"`; login receives a `HttpOnly`, `SameSite=Lax` cookie from the backend. In production, serve both applications over HTTPS so the backend can mark the cookie `Secure`.

## Commands

```bash
npm run lint
npm run test
npm run build
npm run start
```

The authenticated workspace includes product create, edit, search, pagination, and soft-delete flows. Frontend tests mock `fetch` at the centralized API adapter boundary and validate product response schemas.

## Cypress end-to-end tests

Cypress requires the frontend, backend, and PostgreSQL services to be running.
From `eterna-backend-test`, start PostgreSQL and apply the migrations (the
Compose setup also starts the API):

```bash
docker compose up --build
docker compose run --rm migrate npm run db:seed
```

In another terminal, start the frontend from `eterna-frontend-test`:

```bash
npm install
cp .env.example .env.local
npm run dev
```

The frontend `.env.local` must set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`.
The backend must allow `http://localhost:3000` through both `FRONTEND_ORIGIN`
and `CORS_ORIGINS`. Run Cypress headlessly or open its interactive runner with:

```bash
npm run test:e2e
npm run test:e2e:open
```

The suite registers unique users and creates uniquely named products for
mutating scenarios, so it does not depend on seeded stock. Sessions use the
real HttpOnly cookie flow and are cached with `cy.session`. Test-created data
is isolated by user and run-specific names; the current API has no user-delete
endpoint, so those records remain in the local test database. Stock assertions
use authenticated `cy.request` calls because the list UI does not expose the
exact persisted quantity.

## Continuous integration and merge protection

The repository workflow at `.github/workflows/ci.yml` runs `frontend-ci` on
every branch push and on pull requests targeting `main`. It uses Node.js 24 and
runs the frontend checks:

```bash
npm ci
npm run lint
npm test
npm run build
```

CI sets `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:8000` and uses no
secrets, so pull requests from forks can run. The workflow does not contain
production credentials or committed `.env` files.

GitHub Actions reports the `frontend-ci` result; it does not prevent merging by
itself. To enforce it, open **Settings -> Rules -> Rulesets** (or **Settings ->
Branches**), create a rule for the `main` branch, require pull requests before
merging, require status checks to pass before merging, select `frontend-ci`, and
optionally require the branch to be up to date. Save the rule. In the backend
repository, apply the same settings and select `backend-ci`. Because these are
separate repositories, each repository protects its own CI check.

## Routes

The App Router lives exclusively in `src/app`. Public routes are grouped under `(public)` and authenticated routes under `(authenticated)`, so the URLs remain `/login`, `/register`, `/`, `/products`, `/invoices`, and `/invoices/[id]`. The authenticated layout verifies the cookie-backed session before rendering protected content.

## AI Usage

GitHub Copilot assisted with implementation, tests, and documentation.
