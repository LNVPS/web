FROM oven/bun:1 AS builder
ARG MODE=lnvps
WORKDIR /src

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bunx vite build --outDir dist/client --mode $MODE && \
    bunx vite build --ssr src/entry-server.tsx --outDir dist/server --mode $MODE && \
    bun run locale:compile

FROM oven/bun:1-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /src/dist ./dist
COPY --from=builder /src/server ./server

EXPOSE 3000
CMD ["bun", "server/prod.ts"]
