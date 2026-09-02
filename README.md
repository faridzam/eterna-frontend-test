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

Frontend tests mock `fetch` at the centralized API adapter boundary. They never make live API requests and verify credential inclusion, form validation, pending submit handling, and logout UI behavior.

## AI Usage

GitHub Copilot assisted with implementation, tests, and documentation.
