# Expense Tracker MCP Server

A local MCP (Model Context Protocol) server that exposes the Expense Tracker API as
tools Claude Code can call directly — so you can say "add a $12 lunch expense under
Food" and have Claude actually create it.

It is a thin wrapper: all the real logic (validation, tax calculation, budgets,
duplicate detection) stays in the NestJS backend. This package just translates MCP
tool calls into HTTP requests against that backend.

## API synchronization

Each MCP server instance reads the backend's live OpenAPI document from
`/api/docs-json`. It registers a generic tool for every JSON request/response API
operation that is not already represented by a curated tool below. Adding a normally
documented backend endpoint therefore makes it available through MCP the next time a
server instance starts, without a matching hand-written MCP wrapper.

The server keeps the curated tools available if the OpenAPI document cannot be
reached. It logs that degraded state to stderr and does not cache a stale generated
tool list; restart it after the backend is reachable to restore the generated tools.

Some API operations are intentionally unavailable through MCP because they cannot be
represented as a JSON request/response tool:

| API capability                                   | Why it is excluded                                  |
| ------------------------------------------------ | --------------------------------------------------- |
| Attachment, bulk-upload, and import file uploads | They require multipart file bytes.                  |
| Full data export                                 | It returns a binary ZIP response.                   |
| OAuth authorize/exchange endpoints               | They are steps in a stateful browser redirect flow. |

## How auth works here

The backend normally requires a real Keycloak JWT on every request. This server
instead sends a fixed shared-secret header (`x-mcp-bypass-secret`) that the backend's
`KeycloakAuthGuard` recognizes and maps straight to your user account — no browser
login, no password prompt, no token refresh.

**This bypass is local-dev-only by design.** It is gated behind an env var
(`MCP_LOCAL_BYPASS_SECRET`) that must be set on the backend for it to do anything at
all — if that var is unset, the header is ignored and normal Keycloak auth applies.

**Never set `MCP_LOCAL_BYPASS_SECRET` on any backend that is reachable from the
internet or by anyone other than you.** Anyone who has that header value can read,
add, update, and delete your expenses with no further authentication.

## Prerequisites

1. Postgres + Keycloak running:
   ```bash
   podman compose -f ../compose.yml up -d postgres keycloak
   ```
2. The backend running with `MCP_LOCAL_BYPASS_SECRET` and `MCP_LOCAL_BYPASS_USER_EMAIL`
   set in `backend/.env`:
   ```bash
   cd ../backend && npm run start:dev
   ```
3. A user row must already exist for `MCP_LOCAL_BYPASS_USER_EMAIL` (either from a real
   login through the web app once, or inserted directly for a fresh local database).

## Setup

```bash
npm install
cp .env.example .env   # then fill in MCP_BYPASS_SECRET to match backend/.env
npm run build
```

## Registering with Claude Code

Configure a project-scoped `.mcp.json` to point at `mcp-server/dist/index.js`. Run
`npm run build` at least once, then Claude Code will use the current server the next
time it starts in this repo. To use it without building first, point the entry at
`npm run dev` (`tsx src/index.ts`) instead.

Verify it standalone before relying on Claude Code to talk to it:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Claude Desktop

Claude Desktop installs local MCP servers as packaged `.mcpb` extensions rather than
by hand-editing a config file (see [Anthropic's guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)).

A ready-to-install `expense-tracker.mcpb` is built from [`manifest.json`](manifest.json).
To install it:

1. Open Claude Desktop → **Settings → Extensions → Advanced settings**.
2. Under **Extension Developer**, click **Install Extension…** and pick
   `mcp-server/expense-tracker.mcpb`.
3. When prompted for settings, fill in:
   - **Expense Tracker API URL** — `http://localhost:3000/api/v1` (default is fine).
   - **MCP Bypass Secret** — the same value as `MCP_LOCAL_BYPASS_SECRET` in
     `backend/.env`. Claude Desktop stores this in the OS credential manager
     (Credential Manager on Windows), not as plain text.

Postgres, Keycloak, and the backend still need to be running locally, same as for
Claude Code — this only changes how the client launches the MCP server.

To rebuild the `.mcpb` after changing the server (e.g. adding a tool):

```bash
npm run build
mcpb pack . expense-tracker.mcpb
```

Note: `mcpb pack` bundles whatever is in `node_modules` at pack time, including any
devDependencies present. For a smaller package, install into a separate directory
with `npm install --omit=dev` first and pack that instead — this repo's own build
was produced that way.

## Remote access via Streamable HTTP + Cloudflare Tunnel (optional)

The stdio/.mcpb path above is unaffected by this — it's a second, independent
way to reach the same OpenAPI-synchronized tool surface remotely, gated by Cloudflare
Access.

The `/mcp` endpoint uses the MCP v2 handler: it serves the 2026-07-28 protocol
revision and stateless legacy MCP traffic from the same route. The Express host
binds only to `127.0.0.1`, which is compatible with the native Cloudflare tunnel.
It validates `Host` and `Origin` headers; set comma-separated
`MCP_HTTP_ALLOWED_HOSTS` or `MCP_HTTP_ALLOWED_ORIGINS` only when adding another
trusted hostname or client origin.

### Run the HTTP server locally

Run this directly on the host when developing locally. The Compose service provides
the same HTTP entry point when the stack is run in containers.

```bash
cd ../backend && npm run start:dev   # backend, in its own terminal
cd mcp-server
npm run build
npm run start:http
```

Verify locally before touching Cloudflare at all:

```bash
curl http://localhost:3400/health
# expect: ok

curl -s -X POST http://localhost:3400/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_categories","arguments":{}}}'
# expect a JSON-RPC result listing categories, and a corresponding
# {"event":"tool_call","tool":"list_categories",...} line on this process's stderr
```

### One-time Cloudflare dashboard setup

`cloudflared` runs as a native connector on this machine (the same tunnel
already set up for the sibling `home-index` project) rather than as a
container. Everything below is manual, one-time setup in the Cloudflare
dashboard — no new tunnel is created.

1. **Add a public hostname to the existing tunnel**: Zero Trust dashboard →
   **Networks → Tunnels** → open the tunnel already used for `home-index` →
   **Public Hostname** / **Routes** tab → **Add a public hostname** →
   Subdomain `mcp-expense-tracker`, Domain `ishaaniconsulting.ca` → Service
   Type `HTTP`, URL `localhost:3400` (the native connector reaches it over
   `localhost` since both run on this machine).
2. **Gate it with Access**: **Access → Applications → Add an application →
   Self-hosted** → domain `mcp-expense-tracker.ishaaniconsulting.ca` → add a
   policy: Action `Allow`, rule `Emails` → your own email address only (this
   must match `MCP_LOCAL_BYPASS_USER_EMAIL` in `backend/.env` — the Access
   login and the backend's bypass-mapped account need to be the same person).
3. **Enable Managed OAuth**: on that same application, **Edit → Advanced
   settings tab → turn on Managed OAuth → Save**. A plain Access login wall
   only works for browsers (HTML login page + cookie) — MCP clients (like
   the Claude Android app) can't complete that. Managed OAuth makes the app
   a proper OAuth provider for MCP instead.
4. **Allow claude.ai to register as a client**: still under that
   application's Advanced settings, find **Dynamic Client Registration** (a
   separate sub-toggle from Managed OAuth itself) and turn it on. Under
   **Allowed redirect URIs**, add:
   ```
   https://claude.ai/api/mcp/auth_callback
   https://claude.com/api/mcp/auth_callback
   ```
   Without this, Cloudflare has no way to trust claude.ai's OAuth callback
   and refuses to register it, surfacing as "Couldn't register with
   <app-name>'s sign-in service" when adding the connector — this exact
   error was already hit and solved during `home-index`'s setup; it applies
   identically here. Leave "Allow localhost/loopback clients" off — that's
   only for CLI tools, not claude.ai web/desktop/Android. Save.
5. In Claude, add `https://mcp-expense-tracker.ishaaniconsulting.ca/mcp` as
   a custom remote MCP connector (Settings → Connectors → Add custom
   connector). This triggers the Access OAuth login once; it then syncs to
   every device signed into that Claude account, including Android — no
   separate per-device login.

**Never add a second public hostname that points directly at
`localhost:3000` (the backend).** Access on the `mcp-expense-tracker`
hostname only protects requests that go through it — it does nothing for
the backend if it's separately exposed on its own hostname, because the
backend's `x-mcp-bypass-secret` check has no way to know, and doesn't care,
which hostname a request arrived through. The backend must stay reachable
only from `localhost` and from `mcp-server`'s own process on this machine.

The backend and MCP HTTP server must both be running whenever the tunnel is in use;
the native connector does not start either process for you.

## Tools

### Curated tools

| Tool                 | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `add_expense`        | Add an expense by category name — no ID lookup needed              |
| `list_expenses`      | Search/list expenses (use this to find an id before update/remove) |
| `get_expense`        | Get full details for one expense by id                             |
| `update_expense`     | Update one or more fields of an existing expense                   |
| `remove_expense`     | Delete an expense by id                                            |
| `get_expense_totals` | Total spent for a period/category, plus budget if set              |
| `list_categories`    | List category names, for disambiguating a spoken category          |

### Generated tools

All other suitable backend operations are named from their OpenAPI `operationId` and
registered automatically. They use the API's documented request fields and return the
raw API response. The excluded capability classes are listed in [API synchronization](#api-synchronization).

## Development

```bash
npm run dev    # run directly with tsx, no build step
npm test       # vitest
npm run lint   # tsc --noEmit
```
