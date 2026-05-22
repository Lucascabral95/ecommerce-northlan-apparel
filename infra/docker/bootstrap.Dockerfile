# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION}

WORKDIR /workspace

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
    --workspace @northlane/shared \
    --workspace @northlane/auth-service \
    --workspace @northlane/user-service \
    --workspace @northlane/catalog-service \
    --workspace @northlane/inventory-service \
    --workspace @northlane/cart-service \
    --workspace @northlane/order-service \
    --workspace @northlane/payment-service \
    --workspace @northlane/notification-service

COPY packages/contracts packages/contracts
COPY packages/shared packages/shared
COPY services services
COPY scripts scripts

CMD ["node", "scripts/docker/bootstrap-platform.mjs"]
