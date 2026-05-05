# virtualpc — single-image runtime for the orchestrator app.
# Multi-stage: install deps + build TypeScript in `builder`,
# copy only the runtime surface into the final image so the
# image stays under ~400 MB instead of carrying tsc + dev deps.

FROM node:22-alpine AS builder
WORKDIR /app

# Install full deps (incl. dev) for the tsc build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p ./tsconfig.json

# Drop dev deps from node_modules so the runtime layer is lean
RUN npm prune --omit=dev


FROM node:22-alpine AS runtime
WORKDIR /app

# curl needed for HEALTHCHECK; tini for proper PID-1 signal handling
RUN apk add --no-cache curl tini

ENV NODE_ENV=production \
    PORT=3100 \
    EMBED_URL=http://host.docker.internal:1234/v1 \
    LITELLM_URL=http://host.docker.internal:4000 \
    NEO4J_URI=bolt://neo4j:7687

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY public ./public
COPY data ./data
COPY scripts ./scripts

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3100/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
