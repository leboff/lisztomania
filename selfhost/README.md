# Self-hosted Supabase for Lisztomania

A trimmed version of the official [Supabase Docker stack](https://github.com/supabase/supabase/tree/master/docker)
(based on commit `eaad809`), deployed on Dokploy as its own Compose service. It replaces the hosted project
`xmkuaekwxhgyxgdnozen`, which kept auto-pausing.

| Service | Image | Why |
|---|---|---|
| `db` | `supabase/postgres:17.6.1.136` | Postgres with the Supabase roles, `auth` schema and extensions |
| `auth` | `supabase/gotrue:v2.197.0` | Email/password and Google sign-in; the backend also checks the login tokens it issues |
| `rest` | `postgrest/postgrest:v14.17` | `/rest/v1`, used by `supabase-py` table and RPC calls |
| `realtime` | `supabase/realtime:v2.134.10` | `useTripChecklist` (database changes) and `useTripPresence` |
| `api-gw` | `envoyproxy/envoy:v1.39.1` | The Supabase API gateway: routes `/auth/v1`, `/rest/v1` and `/realtime/v1`, and checks API keys |

Studio, storage, edge functions, the connection pooler and analytics are left out because the app doesn't use them.

- **Public URL:** `https://lisztomania-supabase.leboff.co`. Cloudflare Tunnel `*.leboff.co` → Dokploy Traefik → `api-gw:8000`.
- **Secrets** live in the Dokploy compose env, with the master copy at `~/.config/lisztomania-supabase.env` on the Hermes box.
  `ANON_KEY` and `SERVICE_ROLE_KEY` are HS256 JWTs signed with `JWT_SECRET`, using the same format as the official `utils/generate-keys.sh`.
- **Data** lives in the named volumes `db-data` and `db-config`. Redeploying keeps them; deleting the compose with `deleteVolumes:true` destroys them.

## Restore (one-time migration)

Use the `roles.sql`, `schema.sql` and `data.sql` files from `supabase db dump`, following
<https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>:

```sh
psql --single-transaction -v ON_ERROR_STOP=1 \
  -f roles.sql -f schema.sql \
  -c 'SET session_replication_role = replica' \
  -f data.sql
```

Run it inside the `db` container as `supabase_admin`. Then recreate the `on_auth_user_created` trigger,
because schema dumps skip triggers in the `auth` schema, and add `public.checklist_items` to the `supabase_realtime` publication.
