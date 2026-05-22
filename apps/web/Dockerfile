# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine
ARG NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:4000/api/v1

FROM node:${NODE_VERSION} AS builder

WORKDIR /workspace

ARG NEXT_PUBLIC_API_GATEWAY_URL

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY apps/web/package.json apps/web/package.json
COPY services/auth-service/package.json services/auth-service/package.json
COPY services/user-service/package.json services/user-service/package.json
COPY services/catalog-service/package.json services/catalog-service/package.json
COPY services/inventory-service/package.json services/inventory-service/package.json
COPY services/cart-service/package.json services/cart-service/package.json
COPY services/order-service/package.json services/order-service/package.json
COPY services/payment-service/package.json services/payment-service/package.json
COPY services/notification-service/package.json services/notification-service/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked npm install --global npm@11.6.1 \
  && npm ci --no-audit --fund=false --include-workspace-root \
    --workspace @northlane/contracts \
    --workspace @northlane/web

COPY packages/contracts packages/contracts

RUN npm run build --workspace @northlane/contracts

COPY apps/web apps/web

ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}

RUN npm run build --workspace @northlane/web

FROM node:${NODE_VERSION} AS runner

WORKDIR /workspace

ARG NEXT_PUBLIC_API_GATEWAY_URL

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_GATEWAY_URL=${NEXT_PUBLIC_API_GATEWAY_URL}
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static

CMD ["node", "apps/web/server.js"]
