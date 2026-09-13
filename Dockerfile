# CoreBudget: a single, all-in-one self-hosting image. The built Next.js app and an embedded
# PostgreSQL server in one container, supervised by s6-overlay.

FROM node:26-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build


FROM node:26-bookworm-slim AS runtime

ARG PG_MAJOR=18
ARG S6_OVERLAY_VERSION=3.2.0.2
ARG TARGETARCH

# PostgreSQL server and client tools (initdb, postgres, pg_isready, pg_dump, psql, all needed by
# the app itself or by the service scripts below), gosu (clean privilege drop for the s6
# services), and curl (used by the health check).
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg gosu xz-utils \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends "postgresql-${PG_MAJOR}" \
    && apt-get purge -y gnupg && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# s6-overlay v3, process supervisor for postgres/migrate/app (docker/s6-rc.d).
RUN set -eux; \
    case "$TARGETARCH" in \
      amd64) S6_ARCH=x86_64 ;; \
      arm64) S6_ARCH=aarch64 ;; \
      *) echo "unsupported arch: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/s6-noarch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz"; \
    curl -fsSL -o /tmp/s6-arch.tar.xz \
      "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz"; \
    tar -C / -Jxpf /tmp/s6-noarch.tar.xz; \
    tar -C / -Jxpf /tmp/s6-arch.tar.xz; \
    rm -f /tmp/s6-noarch.tar.xz /tmp/s6-arch.tar.xz; \
    apt-get purge -y xz-utils; \
    apt-get autoremove -y

RUN useradd --system --create-home --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=app:app /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=app:app /app/prisma7.config.ts ./prisma7.config.ts

# `prisma migrate deploy` at container boot needs the CLI itself, not just the generated client
# already bundled into the standalone output. It is installed fresh here, not copied from the
# builder's node_modules, so its own dependencies resolve correctly for this exact image.
COPY package.json package-lock.json ./
RUN PRISMA_VERSION=$(node -p "require('./package.json').devDependencies.prisma") \
    && npm install --no-save "prisma@${PRISMA_VERSION}"

COPY docker/s6-rc.d /etc/s6-overlay/s6-rc.d
COPY docker/healthcheck.sh /docker/healthcheck.sh
RUN chmod +x /docker/healthcheck.sh \
    /etc/s6-overlay/s6-rc.d/postgres/run \
    /etc/s6-overlay/s6-rc.d/postgres-ready/up \
    /etc/s6-overlay/s6-rc.d/migrate/up \
    /etc/s6-overlay/s6-rc.d/app/run \
    && mkdir -p /backups /var/lib/postgresql/data \
    && chown app:app /backups \
    && chown postgres:postgres /var/lib/postgresql/data

ENV PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    BACKUPS_PATH=/backups \
    PGDATA=/var/lib/postgresql/data

EXPOSE 3000
VOLUME ["/var/lib/postgresql/data", "/backups"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["/docker/healthcheck.sh"]

ENTRYPOINT ["/init"]
