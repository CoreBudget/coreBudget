# Self-hosting CoreBudget

A single Docker image bundles the built app and an embedded PostgreSQL server: one image, one
data volume, one command to get running.

## Setup

1. Build the image (or pull a published one, once available): `docker build -t corebudget .`
2. Create two volumes, one for the Postgres data directory and one for backups. Named volumes are
   simplest; host paths work too.
3. Run the container with both volumes mounted, the three required env vars set, and the port
   published:

   ```sh
   docker run -d \
     --name corebudget \
     -p 3000:3000 \
     -e APP_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
     -e APP_URL="https://budget.example.com" \
     -e SESSION_SECRET="$(openssl rand -base64 32)" \
     -v corebudget-db:/var/lib/postgresql/data \
     -v corebudget-backups:/backups \
     corebudget
   ```

   Or `docker compose up -d` using the `docker-compose.yml` at the repo root (reads
   `APP_ENCRYPTION_KEY`/`APP_URL`/`SESSION_SECRET` from your shell environment or a `.env` file
   next to it).

4. Visit `APP_URL`. The database is freshly initialized, so the app routes straight into
   First-Time Setup: Admin Account → Household → First Budget → First Account → Invite Household
   Members (optional) → Done.
5. From the Admin Dashboard, configure platform SMTP to enable invite/password-reset email, and
   confirm the backup schedule is enabled on the cadence you want.

`APP_ENCRYPTION_KEY` and `SESSION_SECRET` must stay **stable across restarts and upgrades**.
Losing `APP_ENCRYPTION_KEY` makes the stored SMTP credential and any existing encrypted backups
unrecoverable. Generate them once and keep them somewhere durable (a password manager, your
secrets store, etc.), not just in your shell history.

## Upgrades

Pull the new image tag and recreate the container against the **same** data volume and the
**same** `APP_ENCRYPTION_KEY`/`SESSION_SECRET`. Database migrations run automatically against the
existing database the next time the container starts, so there is no separate migration step to
remember.

## Using an external Postgres instead of the embedded one

Some operators already run one shared Postgres instance across their home-lab and don't want a
database embedded per app instance. Set `DATABASE_URL` yourself (e.g.
`postgresql://user:password@host:5432/corebudget`, database already created) and the container
skips starting its own embedded Postgres entirely, connecting to yours instead. In this mode the
`/var/lib/postgresql/data` volume mount is unused and can be omitted.

## Backups

Automatic backups (schedule/retention configured from the Admin Dashboard) are written encrypted
to `/backups` inside the container, so mount that volume somewhere durable. To restore one onto a
different instance, see `scripts/decrypt-backup.ts`'s usage notes (needs the **same**
`APP_ENCRYPTION_KEY` the backup was created with).
