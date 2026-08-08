import { ensureSheet, readSheet, updateSheetRow, appendSheetRow, getSheetsClient } from "./googleSheets";

export interface OfficeSettings {
  defaultMorningStart: string;
  defaultMorningEnd: string;
  defaultAfternoonStart: string;
  defaultAfternoonEnd: string;
  lunchBreakEnd: string;
  companyName: string;
  lateThresholdMinutes: string;
  adminPasswordHash: string;
  weeklyOffDay: string; // e.g. "Friday" — used by payroll to apply full-day OT
}

const SHEET_NAME = "Settings";
const HEADERS = ["Key", "Value"];

const DEFAULTS: OfficeSettings = {
  defaultMorningStart: "08:00",
  defaultMorningEnd: "13:30",
  defaultAfternoonStart: "16:00",
  defaultAfternoonEnd: "19:00",
  lunchBreakEnd: "13:30",
  companyName: "Petro Safe Tech",
  lateThresholdMinutes: "15",
  adminPasswordHash: "",
  weeklyOffDay: "Friday",
};

// Keys that we always want to seed into the sheet on first run.
// adminPasswordHash is special — only stored if explicitly set.
const SEEDABLE_KEYS: (keyof OfficeSettings)[] = [
  "defaultMorningStart",
  "defaultMorningEnd",
  "defaultAfternoonStart",
  "defaultAfternoonEnd",
  "lunchBreakEnd",
  "companyName",
  "lateThresholdMinutes",
  "weeklyOffDay",
];

let cached: { data: OfficeSettings; ts: number } | null = null;
const CACHE_MS = 30 * 1000;

export async function getOfficeSettings(sheetId: string): Promise<OfficeSettings> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;

  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, 2);

  const map = new Map<string, string>();
  rows.forEach((r) => {
    if (r[0]) map.set(r[0], r[1] ?? "");
  });

  const result: OfficeSettings = { ...DEFAULTS };
  (Object.keys(DEFAULTS) as (keyof OfficeSettings)[]).forEach((k) => {
    if (map.has(k)) {
      result[k] = map.get(k) || DEFAULTS[k];
    }
  });

  // Seed missing seedable keys (skip adminPasswordHash to avoid empty placeholder)
  for (const k of SEEDABLE_KEYS) {
    if (!map.has(k)) {
      await appendSheetRow(sheetId, SHEET_NAME, 2, [k, DEFAULTS[k]]);
    }
  }

  cached = { data: result, ts: Date.now() };
  return result;
}

export async function updateOfficeSettings(
  sheetId: string,
  updates: Partial<OfficeSettings>,
): Promise<OfficeSettings> {
  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, 2);

  const sheets = getSheetsClient();

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    const idx = rows.findIndex((r) => r[0] === key);
    if (idx >= 0) {
      // Existing row → update in place (data starts at row 2)
      await updateSheetRow(sheetId, SHEET_NAME, idx + 2, 2, [key, value]);
    } else {
      await appendSheetRow(sheetId, SHEET_NAME, 2, [key, value]);
    }
  }
  // Suppress unused warning
  void sheets;

  cached = null;
  return getOfficeSettings(sheetId);
}

export function clearSettingsCache(): void {
  cached = null;
}
