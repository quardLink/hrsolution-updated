# Employee Attendance & Payroll

A check-in/check-out kiosk, leave management, and payroll calculator for a
single company, backed by Google Sheets (no database to host or manage).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical breakdown —
folder layout, stack, and how the Google Sheets integration works.

## Layout

```
apps/
  api/          Express 5 API server
  web/          React + Vite frontend (employee kiosk + admin dashboard)
packages/
  api-client/   Generated React Query hooks
  api-schema/   Generated Zod schemas
  api-spec/     OpenAPI spec + codegen config
api/            Vercel serverless function entry (wraps apps/api's Express app)
```

## Local development

Requires Node 24+ and npm.

```
npm install
```

Create `apps/api/.env` with:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=<from your GCP service account JSON>
GOOGLE_PRIVATE_KEY=<from your GCP service account JSON, keep \n as literal characters>
GOOGLE_SHEET_ID=<the ID from your Google Sheet's URL>
PORT=4000
```

Then in two terminals:

```
npm run dev --workspace=apps/api    # API on :4000
npm run dev --workspace=apps/web    # frontend, proxies /api to :4000
```

Share the Google Sheet with the service account email (Editor access) —
without that, attendance/payroll data won't persist.

## Deploying

Deploys to Vercel as a single project — see [vercel.json](./vercel.json) and
[api/[...path].ts](./api/[...path].ts). Set the three `GOOGLE_*` env vars
above (plus optional `ADMIN_PASSWORD`) in Vercel's Project Settings →
Environment Variables.

For office-PC kiosk setup (Chrome kiosk mode, auto-start on boot), see
[OFFICE_SETUP_GUIDE.md](./OFFICE_SETUP_GUIDE.md).

## Commands

- `npm run typecheck` — typecheck across all packages
- `npm run build` — typecheck + build all packages
- `npm run codegen --workspace=packages/api-spec` — regenerate API hooks and
  Zod schemas from the OpenAPI spec after changing `packages/api-spec/openapi.yaml`
