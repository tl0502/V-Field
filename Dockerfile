FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=80 \
    TRUST_CLOUDRUN_IDENTITY=1

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/miniprogram/package.json apps/miniprogram/
COPY apps/testminiprogram/package.json apps/testminiprogram/
COPY apps/admin-platform/package.json apps/admin-platform/
COPY apps/admin-domain/package.json apps/admin-domain/
COPY packages/admin-shell/package.json packages/admin-shell/
COPY packages/session-core/package.json packages/session-core/
COPY packages/content-core/package.json packages/content-core/

RUN npm ci --omit=dev --workspace=@vquan/api

COPY apps/api/src apps/api/src
COPY apps/api/migrations apps/api/migrations
COPY packages/content-core/src packages/content-core/src

EXPOSE 80

CMD ["node", "apps/api/src/server.js"]
