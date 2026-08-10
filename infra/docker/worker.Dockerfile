# Build context is the repo root (needed for npm workspaces to resolve
# @pr-pilot/types, @pr-pilot/db, etc). On Railway: root directory "/",
# Dockerfile path "infra/docker/worker.Dockerfile".
FROM node:20-alpine

WORKDIR /repo

COPY . .

RUN npm install
RUN npm run db:generate
RUN npm run build:shared
RUN npm run build -w @pr-pilot/worker

ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/main.js"]
