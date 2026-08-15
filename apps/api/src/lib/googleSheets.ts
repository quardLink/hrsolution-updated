import { google, sheets_v4 } from "googleapis";
import { logger } from "./logger";

type SheetsClient = sheets_v4.Sheets;

// Reused across calls (and across requests, for the life of the process) so
// the underlying google-auth-library JWT client can cache and reuse its
// OAuth access token instead of re-signing a JWT and round-tripping to
// Google's token endpoint on every single Sheets call. Building a fresh
// GoogleAuth/JWT per call was the main cause of slow admin page loads —
// each Sheets read fanned out into several of these round trips.
let authClient: InstanceType<typeof google.auth.GoogleAuth> | null = null;
let sheetsClient: SheetsClient | null = null;

function getAuthClient() {
  if (authClient) return authClient;

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    throw new Error(
      "Google Sheets credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.",
    );
  }

  let privateKey = rawKey.replace(/\\n/g, "\n").trim();
  if (!privateKey.includes("-----BEGIN")) {
    privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
  }

  authClient = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return authClient;
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID,
  );
}

export function getSheetsClient(): SheetsClient {
  if (sheetsClient) return sheetsClient;
  const auth = getAuthClient();
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function getFirstSheetName(sheets: SheetsClient, sheetId: string): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const firstSheet = meta.data.sheets?.[0];
  const title = firstSheet?.properties?.title;
  if (!title) throw new Error("Could not determine sheet name");
  return title;
}

async function listSheetTitles(sheets: SheetsClient, sheetId: string): Promise<string[]> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  return (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => !!t);
}

// Sheets already confirmed to exist (with headers) this process — skips the
// two verification round trips (list tabs + read header row) on every
// subsequent read once a sheet has been ensured once. Tab/header structure
// only changes via this app's own admin actions below, so it's safe to
// treat "ensured" as durable for the life of the process.
const ensuredSheets = new Set<string>();

export async function ensureSheet(
  sheetId: string,
  sheetName: string,
  headers: string[],
): Promise<void> {
  const cacheKey = `${sheetId}:${sheetName}`;
  if (ensuredSheets.has(cacheKey)) return;

  const sheets = getSheetsClient();
  const titles = await listSheetTitles(sheets, sheetId);

  if (!titles.includes(sheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          { addSheet: { properties: { title: sheetName } } },
        ],
      },
    });
    logger.info({ sheetName }, "Created new sheet tab");
  }

  const headerCol = String.fromCharCode(64 + headers.length);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:${headerCol}1`,
  });
  const firstRow = res.data.values?.[0] ?? [];
  if (firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:${headerCol}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
    logger.info({ sheetName }, "Sheet headers initialized");
  }

  ensuredSheets.add(cacheKey);
}

export async function readSheet(
  sheetId: string,
  sheetName: string,
  numCols: number,
): Promise<string[][]> {
  const sheets = getSheetsClient();
  const lastCol = String.fromCharCode(64 + numCols);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2:${lastCol}`,
  });
  return (res.data.values ?? []) as string[][];
}

export async function appendSheetRow(
  sheetId: string,
  sheetName: string,
  numCols: number,
  row: (string | number | boolean)[],
): Promise<void> {
  const sheets = getSheetsClient();
  const lastCol = String.fromCharCode(64 + numCols);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:${lastCol}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row.map((v) => String(v))] },
  });
}

export async function updateSheetRow(
  sheetId: string,
  sheetName: string,
  rowIndex: number, // 1-indexed (matching the data row in spreadsheet — header is row 1, first data row is row 2)
  numCols: number,
  row: (string | number | boolean)[],
): Promise<void> {
  const sheets = getSheetsClient();
  const lastCol = String.fromCharCode(64 + numCols);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row.map((v) => String(v))] },
  });
}

// ============================================================
// Attendance log functions (existing — first sheet)
// ============================================================

export async function appendAttendanceRow(params: {
  sheetId: string;
  employeeName: string;
  employeeId: string;
  action: string;
  session: string;
  timestamp: string;
  status: string;
  message: string;
}): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = await getFirstSheetName(sheets, params.sheetId);

  const row = [
    params.timestamp,
    params.employeeName,
    params.employeeId,
    params.session,
    params.action,
    params.status,
    params.message,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: params.sheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  logger.info(
    { employeeId: params.employeeId, action: params.action },
    "Attendance logged to Google Sheets",
  );
}

export interface AttendanceLogRow {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
  status: string;
  message: string;
}

export async function getAttendanceLogs(sheetId: string): Promise<AttendanceLogRow[]> {
  const sheets = getSheetsClient();
  const sheetName = await getFirstSheetName(sheets, sheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A2:G`,
  });

  const rows = res.data.values ?? [];
  return rows
    .filter((r) => r.length >= 5)
    .map((r) => ({
      timestamp: r[0] ?? "",
      employeeName: r[1] ?? "",
      employeeId: r[2] ?? "",
      session: r[3] ?? "",
      action: r[4] ?? "",
      status: r[5] ?? "",
      message: r[6] ?? "",
    }));
}

export async function ensureSheetHeaders(sheetId: string): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = await getFirstSheetName(sheets, sheetId);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A1:G1`,
  });

  const firstRow = res.data.values?.[0];
  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:G1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["Timestamp", "Employee Name", "Employee ID", "Session", "Action", "Status", "Message"],
        ],
      },
    });
    logger.info({ sheetName }, "Sheet headers created");
  }
}
