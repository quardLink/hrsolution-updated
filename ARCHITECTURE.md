# Architecture

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

```
apps/
  api/          Express 5 API server
  web/          React + Vite frontend (employee kiosk + admin dashboard)
packages/
  api-client/   Generated React Query hooks (consumed by apps/web)
  api-schema/   Generated Zod schemas (consumed by apps/api)
  api-spec/     OpenAPI spec + Orval codegen config for the two packages above
scripts/        One-off workspace tooling
```

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Datastore**: Google Sheets (via a service account — see below), no database
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Deployment**: Vercel — `apps/web` builds to static assets, `apps/api`'s
  Express app is served as a serverless function via root `api/index.ts` and
  `vercel.json`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api run dev` — run the API server locally
- `pnpm --filter @workspace/web run dev` — run the frontend locally

## Employee Attendance App (`apps/web`)
- React + Vite frontend at `/`
- API server at `/api`
- Full attendance flow: Splash → Check In/Out → Select Employee → PIN → Status

## Employee Configuration
Employees, office settings, and leave requests are stored in **Google Sheets** (tabs: `Employees`, `Settings`, `LeaveRequests`, `AttendanceLogs`). They are managed via the admin UI at `/admin` (default password `admin123`, override via `ADMIN_PASSWORD` env var).

The first time the app runs, missing sheets/tabs are auto-created and the `Employees` tab is seeded with the original 7 employees if empty.

Per-employee schedule overrides: each employee can either inherit office defaults (set in the Settings tab) or set custom morning/afternoon hours. Backend logic lives in `apps/api/src/lib/{employees,settings,leaveRequests}.ts`. Admin CRUD endpoints are in `apps/api/src/routes/admin.ts`.

## Admin Dashboard (`/admin`)
- **Rankings / Summary / Raw Logs**: attendance analytics with PDF export
- **Employees**: add/edit/deactivate employees, manage PINs, set per-employee schedules, monthly salary
- **Leave**: create and approve/reject employee leave requests
- **Payroll**: run monthly payroll off attendance + leave records
- **Settings**: edit default office hours
- Sound alerts (chime + banner) at 1:30 PM and 7:00 PM

## Google Sheets Integration
The app writes attendance logs to Google Sheets using a **Service Account** (not an OAuth connector — a service account is portable across hosting platforms and doesn't depend on any one platform's connector ecosystem).

Required environment variables (set as environment variables in your deployment platform, e.g. Vercel → Project Settings → Environment Variables):
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — service account email from JSON key file
- `GOOGLE_PRIVATE_KEY` — private key from JSON key file (with `\n` for newlines)
- `GOOGLE_SHEET_ID` — the ID from the Google Sheet URL

**Important**: The Google Sheet must be shared with the service account email (Editor access).
If these env vars are not set, the app still works — it just logs attendance locally only (no Google Sheets).

The Google Sheets code is in `apps/api/src/lib/googleSheets.ts`.
