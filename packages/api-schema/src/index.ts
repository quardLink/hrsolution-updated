// generated/types re-exports plain TS interfaces that duplicate the zod
// schema names above (e.g. an `interface LogAttendanceBody` alongside the
// `const LogAttendanceBody = zod.object(...)` here) — wildcard-exporting
// both is ambiguous under `export *`, and nothing in this repo actually
// imports the raw interfaces (only the zod values, for .safeParse), so
// only the zod module is re-exported.
export * from "./generated/api";
