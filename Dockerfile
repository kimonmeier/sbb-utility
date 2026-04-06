# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable

# Install dependencies first for better layer caching.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./

ENV DATABASE_URL=/data/database.db

# Build the SvelteKit app (adapter-node).
COPY . .
RUN yarn build

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=true

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Default SQLite path inside container. Override via environment if needed.
ENV DATABASE_URL=/data/database.db

COPY --from=build /app/package.json ./
COPY --from=build /app/yarn.lock ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000

CMD ["node", "build"]
