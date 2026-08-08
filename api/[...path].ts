// Vercel serverless function entry point. The filename's catch-all segment
// (`[...path]`) makes Vercel route every `/api/*` request to this single
// function; Express then does its own internal routing via `app.use("/api",
// router)` in apps/api/src/app.ts, so no path-stripping/rewriting is needed
// here — just hand the whole app to Vercel's Node runtime.
export { default } from "../apps/api/src/app";
