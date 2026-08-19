// Vercel serverless function entry point. The filename's catch-all segment
// (`[...path]`) makes Vercel route every `/api/*` request to this single
// function; Express then does its own internal routing via `app.use("/api",
// router)` in apps/api/src/app.ts, so no path-stripping/rewriting is needed
// here — just hand the whole app to Vercel's Node runtime.
//
// This is a plain .mjs file (not .ts) importing the esbuild-bundled output
// (built by apps/api's `build` script), not the raw TypeScript source:
// Vercel's Function builder type-checks any TS file it processes under
// strict Node ESM resolution rules, which the source doesn't conform to
// (no explicit .js extensions, CJS/ESM interop, etc). Using a plain JS
// entry that imports an already-bundled module sidesteps that entirely —
// no TypeScript compilation happens for this function at all.
export { default } from "../apps/api/dist/app.mjs";
