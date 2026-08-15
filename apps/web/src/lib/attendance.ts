export interface HHmm {
  h: number;
  m: number;
}

export function parseTimestamp(ts: string): Date | null {
  const cleaned = ts.replace(",", "").trim();
  const m = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ]+(\d{1,2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (!m) return null;
  const month = parseInt(m[1]) - 1;
  const day = parseInt(m[2]);
  const year = parseInt(m[3]);
  let hour = parseInt(m[4]);
  const min = parseInt(m[5]);
  const sec = parseInt(m[6]);
  const ampm = m[7]?.toUpperCase();
  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  return new Date(year, month, day, hour, min, sec);
}

export function getDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function parseHHmm(s: string): HHmm | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { h: parseInt(m[1]), m: parseInt(m[2]) };
}

export function minutesLate(checkIn: Date, expected: string): number {
  const t = parseHHmm(expected);
  if (!t) return 0;
  const expectedMin = t.h * 60 + t.m;
  const actualMin = checkIn.getHours() * 60 + checkIn.getMinutes();
  return Math.max(0, actualMin - expectedMin);
}

export function scoreFromMinutesLate(min: number): number {
  if (min <= 5) return 100;
  if (min <= 15) return 90;
  if (min <= 30) return 75;
  if (min <= 60) return 50;
  if (min <= 120) return 25;
  return 10;
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}
