// Converts a "wall clock" date/time as read in a given IANA timezone into
// the correct UTC instant, with no date library. Needed because a
// fingerprint terminal reports punches as a plain "YYYY-MM-DD HH:mm:ss"
// string in its own local time (whatever the org's timezone is) — treating
// that string as if it were already UTC (what `new Date(str)` would do)
// would be off by the timezone's offset.
//
// Standard double-conversion trick: format the naive-UTC guess back into
// the target timezone, measure how far the guess drifted, and subtract.
export function zonedTimeToUtc(dateTimeStr: string, timeZone: string): Date | null {
  const m = dateTimeStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);

  const naiveUtcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  const guess = new Date(naiveUtcMs);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  const offsetMs = asIfUtc - naiveUtcMs;
  return new Date(naiveUtcMs - offsetMs);
}
