# StockFlow Web

## Setup and run

Start the backend first by following `eterna-backend-test/README.md`. Then, from a fresh machine with Node.js 24+ and npm:

```bash
cd eterna-frontend-test
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env.local`, and ensure the backend allows `http://localhost:3000` through `FRONTEND_ORIGIN` and `CORS_ORIGINS`. Open `http://localhost:3000`.

For a production Docker image, provide the public API URL when building because Next.js embeds it in the browser bundle:

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com -t stockflow-web .
```

Useful checks:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Cypress needs the backend, database, and frontend running. Use `npm run test:e2e:open` for the interactive runner.

## Demo login credentials

- Admin: `admin@stockflow.com` / `stockflow`
- Staff: `staff@stockflow.com` / `stockflow`

## Tech choices and why

- Next.js App Router provides routing, layouts, loading states, and a production build system.
- React 19 supports the interactive authenticated workspace with a small client surface.
- TypeScript keeps UI models and API adapter contracts explicit.
- Zod validates API responses at the browser boundary before data reaches components.
- A centralized `fetch` adapter keeps credentials, error handling, and response parsing consistent.
- HttpOnly cookie sessions avoid storing bearer tokens in browser JavaScript.
- Vitest and Testing Library provide fast component and adapter tests without a live API.
- Cypress covers the real browser cookie flow and the main product and invoice workflows.

## Trade-offs and known limitations

- The frontend depends on a separately running backend.
- There is no dedicated query cache or optimistic update layer.
- Cypress creates test data but cannot remove users because the API has no user-delete endpoint.
- There is no production deployment configuration, analytics, error monitoring, or visual regression suite.
- Overview page still empty, no data showed.

## What I would do with one more week

- Add richer invoice editing, reporting, filtering, and export workflows.
- Improve keyboard navigation, screen-reader semantics, and automated accessibility checks.
- Add query caching, better loading/error recovery, and more granular mutation feedback.
- Add visual regression tests and broaden Cypress coverage across roles and edge cases.
- Add deployment configuration, runtime configuration validation, and production monitoring.
- Add screen to explain stock movement log (currently there's no page or component that present stock movement data)

## AI Usage

GitHub Copilot assisted with implementation, test creation, debugging, and documentation. I reviewed and ran the resulting code and tests. Approximately 8 hours total using AI.
