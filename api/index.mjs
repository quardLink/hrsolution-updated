// Vercel serverless function entry point. vercel.json's rewrites forward
// every `/api/*` request here (as "/api/index") while preserving the
// original path on the request object; Express then does its own internal
// routing via `app.use("/api", router)` in apps/api/src/app.ts, so no
// path-stripping is needed here — just hand the whole app to Vercel's Node
// runtime.
//
// Deliberately NOT using the `[...path]` catch-all filename convention:
// Vercel's dynamic-segment routing for that convention was only matching
// single-segment /api/* paths in practice (e.g. /api/healthz worked but
// /api/attendance/employees 404'd at the platform routing layer, never
// reaching this function) — an explicit rewrite is the proven-working
// mechanism instead (the same one used for the SPA fallback below).
//
// This is a plain .mjs file (not .ts) importing the esbuild-bundled output
// (built by apps/api's `build` script), not the raw TypeScript source:
// Vercel's Function builder type-checks any TS file it processes under
// strict Node ESM resolution rules, which the source doesn't conform to
// (no explicit .js extensions, CJS/ESM interop, etc). Using a plain JS
// entry that imports an already-bundled module sidesteps that entirely —
// no TypeScript compilation happens for this function at all.
export { default } from "../apps/api/dist/app.mjs";
