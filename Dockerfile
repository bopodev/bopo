FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production \
    WEB_PORT=4010 \
    API_PORT=4020 \
    PORT=4020 \
    NEXT_PUBLIC_API_URL=http://localhost:4020 \
    BOPO_HOME=/var/lib/bopo \
    BOPO_DEPLOYMENT_MODE=authenticated_private \
    BOPO_ALLOWED_ORIGINS=http://localhost:4010 \
    BOPO_ALLOWED_HOSTNAMES=localhost,127.0.0.1 \
    BOPO_SCHEDULER_ROLE=auto

RUN mkdir -p /var/lib/bopo

VOLUME ["/var/lib/bopo"]

EXPOSE 4010 4020

CMD ["sh", "-lc", "pnpm --filter bopodev-api start & pnpm --filter bopodev-web start"]
