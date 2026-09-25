# syntax=docker/dockerfile:1.7
FROM oven/bun:1.4.2-alpine AS build
WORKDIR /app

COPY package.json bun.lock tsconfig.json biome.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/platform-contracts/package.json packages/platform-contracts/package.json
COPY packages/http-application/package.json packages/http-application/package.json
COPY packages/database/package.json packages/database/package.json
RUN bun install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages
COPY tests ./tests
RUN bun run check

FROM oven/bun:1.4.2-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=bun:bun /app/dist ./dist
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e 'const r=await fetch("http://127.0.0.1:"+(process.env.PORT||3000)+"/health");process.exit(r.ok?0:1)'
CMD ["bun", "dist/server.js"]
