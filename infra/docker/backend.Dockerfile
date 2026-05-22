# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS workspace

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

FROM workspace AS builder

RUN --mount=type=cache,target=/root/.npm,sharing=locked npm install --global npm@11.6.1 \
  && npm ci --no-audit --fund=false --include-workspace-root \
    --workspace @northlane/contracts \
    --workspace @northlane/shared \
    --workspace @northlane/api-gateway \
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

RUN npm run build --workspace @northlane/contracts \
  && npm run build --workspace @northlane/shared

COPY apps/api-gateway apps/api-gateway
COPY services services
COPY scripts scripts

RUN npm run build --workspace @northlane/api-gateway \
  && npm run build --workspace @northlane/auth-service \
  && npm run build --workspace @northlane/user-service \
  && npm run build --workspace @northlane/catalog-service \
  && npm run build --workspace @northlane/inventory-service \
  && npm run build --workspace @northlane/cart-service \
  && npm run build --workspace @northlane/order-service \
  && npm run build --workspace @northlane/payment-service \
  && npm run build --workspace @northlane/notification-service

FROM workspace AS production-dependencies

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=1

RUN --mount=type=cache,target=/root/.npm,sharing=locked npm install --global npm@11.6.1 \
  && npm ci --omit=dev --no-audit --fund=false --include-workspace-root \
    --workspace @northlane/contracts \
    --workspace @northlane/shared \
    --workspace @northlane/api-gateway \
    --workspace @northlane/auth-service \
    --workspace @northlane/user-service \
    --workspace @northlane/catalog-service \
    --workspace @northlane/inventory-service \
    --workspace @northlane/cart-service \
    --workspace @northlane/order-service \
    --workspace @northlane/payment-service \
    --workspace @northlane/notification-service

FROM node:${NODE_VERSION} AS runner

WORKDIR /workspace

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=builder /workspace/apps/api-gateway/dist ./apps/api-gateway/dist
COPY --from=builder /workspace/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /workspace/services/user-service/dist ./services/user-service/dist
COPY --from=builder /workspace/services/catalog-service/dist ./services/catalog-service/dist
COPY --from=builder /workspace/services/inventory-service/dist ./services/inventory-service/dist
COPY --from=builder /workspace/services/cart-service/dist ./services/cart-service/dist
COPY --from=builder /workspace/services/order-service/dist ./services/order-service/dist
COPY --from=builder /workspace/services/payment-service/dist ./services/payment-service/dist
COPY --from=builder /workspace/services/notification-service/dist ./services/notification-service/dist

CMD ["node", "apps/api-gateway/dist/main.js"]
