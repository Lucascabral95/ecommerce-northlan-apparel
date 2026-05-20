FROM node:22-alpine AS base
WORKDIR /workspace

ARG WORKSPACE_NAME
ENV WORKSPACE_NAME=${WORKSPACE_NAME}
ENV NODE_ENV=production

COPY package.json package-lock.json* turbo.json tsconfig.base.json eslint.config.js prettier.config.js ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY services/base-service/package.json services/base-service/package.json

RUN npm install

COPY . .

RUN npm run build --workspace=@northlane/shared
RUN npm run build --workspace=${WORKSPACE_NAME}

CMD ["sh", "-c", "npm run start:prod --workspace=${WORKSPACE_NAME}"]
