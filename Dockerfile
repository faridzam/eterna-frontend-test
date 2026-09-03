FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN test -n "$NEXT_PUBLIC_API_BASE_URL"
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && addgroup -S stockflow && adduser -S stockflow -G stockflow
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
USER stockflow
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://localhost:3000').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["npm", "run", "start", "--", "-p", "3000"]