# Build context is the repo root (needed for npm workspaces to resolve
# @pr-pilot/types, @pr-pilot/db, etc). On Railway: root directory "/",
# Dockerfile path "infra/docker/api.Dockerfile".
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /repo

COPY . .

RUN npm install
RUN npm run db:generate
RUN npm run build:shared
RUN npm run build -w @pr-pilot/api

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
