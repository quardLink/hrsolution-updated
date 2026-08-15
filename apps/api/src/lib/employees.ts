import { ensureSheet, readSheet, appendSheetRow, updateSheetRow, isGoogleSheetsConfigured } from "./googleSheets";

export type EmployeeRole = "sales" | "purchase" | "shop_handler" | "manager" | "other";

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: EmployeeRole;
  active: boolean;
  useCustomSchedule: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  monthlySalary: number;
}

export interface PublicEmployee {
  id: string;
  name: string;
  role: string;
  reportingMorning: string;
  reportingAfternoon: string;
}

const SHEET_NAME = "Employees";
const HEADERS = [
  "ID",
  "Name",
  "PIN",
  "Role",
  "Active",
  "UseCustomSchedule",
  "MorningStart",
  "MorningEnd",
  "AfternoonStart",
  "AfternoonEnd",
  "MonthlySalary",
];
const NUM_COLS = HEADERS.length;

// Initial seed data — 7 PST employees
// NOTE: monthlySalary values below are PLACEHOLDERS (0) — set real salaries
// via the admin Employees tab before running payroll for the first time.
const SEED_EMPLOYEES: Employee[] = [
  { id: "EMP001", name: "Shaheen", pin: "4758", role: "purchase", active: true, useCustomSchedule: false, morningStart: "08:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
  { id: "EMP002", name: "Shihab", pin: "7574", role: "shop_handler", active: true, useCustomSchedule: true, morningStart: "09:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
  { id: "EMP003", name: "Willy", pin: "6376", role: "manager", active: true, useCustomSchedule: true, morningStart: "00:00", morningEnd: "23:59", afternoonStart: "00:00", afternoonEnd: "23:59", monthlySalary: 0 },
  { id: "EMP004", name: "Yaseen", pin: "4848", role: "sales", active: true, useCustomSchedule: false, morningStart: "08:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
  { id: "EMP005", name: "Jessa", pin: "1774", role: "shop_handler", active: true, useCustomSchedule: true, morningStart: "09:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
  { id: "EMP006", name: "Shakir", pin: "5838", role: "purchase", active: true, useCustomSchedule: false, morningStart: "08:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
  { id: "EMP007", name: "Shamseer", pin: "8589", role: "sales", active: true, useCustomSchedule: false, morningStart: "08:00", morningEnd: "13:30", afternoonStart: "16:00", afternoonEnd: "19:00", monthlySalary: 0 },
];

let cached: { data: Employee[]; ts: number } | null = null;
const CACHE_MS = 30 * 1000;

function rowToEmployee(r: string[]): Employee | null {
  if (!r[0] || !r[1]) return null;
  return {
    id: r[0],
    name: r[1],
    pin: r[2] ?? "",
    role: (r[3] ?? "other") as EmployeeRole,
    active: (r[4] ?? "TRUE").toUpperCase() !== "FALSE",
    useCustomSchedule: (r[5] ?? "FALSE").toUpperCase() === "TRUE",
    morningStart: r[6] ?? "08:00",
    morningEnd: r[7] ?? "13:30",
    afternoonStart: r[8] ?? "16:00",
    afternoonEnd: r[9] ?? "19:00",
    monthlySalary: Number(r[10] ?? 0) || 0,
  };
}

function employeeToRow(e: Employee): string[] {
  return [
    e.id,
    e.name,
    e.pin,
    e.role,
    e.active ? "TRUE" : "FALSE",
    e.useCustomSchedule ? "TRUE" : "FALSE",
    e.morningStart,
    e.morningEnd,
    e.afternoonStart,
    e.afternoonEnd,
    String(e.monthlySalary ?? 0),
  ];
}

async function loadAllEmployees(sheetId: string): Promise<Employee[]> {
  // No Google Sheets configured — serve the seed list directly rather than
  // failing outright, so the kiosk and admin employee list still work
  // locally before a Sheet is connected.
  if (!isGoogleSheetsConfigured()) return [...SEED_EMPLOYEES];

  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, NUM_COLS);

  // Seed if sheet is empty
  if (rows.length === 0) {
    for (const e of SEED_EMPLOYEES) {
      await appendSheetRow(sheetId, SHEET_NAME, NUM_COLS, employeeToRow(e));
    }
    return [...SEED_EMPLOYEES];
  }

  return rows.map(rowToEmployee).filter((e): e is Employee => e !== null);
}

export async function getAllEmployees(sheetId: string): Promise<Employee[]> {
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;
  const data = await loadAllEmployees(sheetId);
  cached = { data, ts: Date.now() };
  return data;
}

export function clearEmployeeCache(): void {
  cached = null;
}

// ============================================================
// Effective schedule (merges office defaults with employee overrides)
// ============================================================

export interface EffectiveSchedule {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
}

export function getEffectiveSchedule(
  emp: Employee,
  defaults: EffectiveSchedule,
): EffectiveSchedule {
  if (emp.useCustomSchedule) {
    return {
      morningStart: emp.morningStart,
      morningEnd: emp.morningEnd,
      afternoonStart: emp.afternoonStart,
      afternoonEnd: emp.afternoonEnd,
    };
  }
  return defaults;
}

// ============================================================
// Public API for kiosk (no PIN exposed)
// ============================================================

export async function getPublicEmployees(
  sheetId: string,
  defaults: EffectiveSchedule,
): Promise<PublicEmployee[]> {
  const all = await getAllEmployees(sheetId);
  return all
    .filter((e) => e.active)
    .map((e) => {
      const sched = getEffectiveSchedule(e, defaults);
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        reportingMorning: sched.morningStart,
        reportingAfternoon: sched.afternoonStart,
      };
    });
}

// ============================================================
// Verify employee PIN
// ============================================================

export async function verifyEmployee(
  sheetId: string,
  employeeId: string,
  pin: string,
): Promise<Employee | null> {
  const all = await getAllEmployees(sheetId);
  const e = all.find((x) => x.id === employeeId && x.active);
  if (!e || e.pin !== pin) return null;
  return e;
}

// ============================================================
// Admin CRUD
// ============================================================

export async function addEmployee(
  sheetId: string,
  emp: Omit<Employee, "id"> & { id?: string },
): Promise<Employee> {
  const all = await loadAllEmployees(sheetId);

  // Generate next ID if not provided
  let id = emp.id;
  if (!id) {
    const maxNum = all.reduce((max, e) => {
      const m = e.id.match(/^EMP(\d+)$/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    id = `EMP${String(maxNum + 1).padStart(3, "0")}`;
  }

  if (all.some((e) => e.id === id)) {
    throw new Error(`Employee with ID ${id} already exists`);
  }

  const newEmp: Employee = { ...emp, id };
  await appendSheetRow(sheetId, SHEET_NAME, NUM_COLS, employeeToRow(newEmp));
  clearEmployeeCache();
  return newEmp;
}

export async function updateEmployee(
  sheetId: string,
  id: string,
  updates: Partial<Omit<Employee, "id">>,
): Promise<Employee> {
  const all = await loadAllEmployees(sheetId);
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) throw new Error(`Employee ${id} not found`);

  const updated: Employee = { ...all[idx], ...updates };
  await updateSheetRow(sheetId, SHEET_NAME, idx + 2, NUM_COLS, employeeToRow(updated));
  clearEmployeeCache();
  return updated;
}

export async function deleteEmployee(sheetId: string, id: string): Promise<void> {
  // Soft delete — set active=false to preserve attendance history integrity
  await updateEmployee(sheetId, id, { active: false });
}

// ============================================================
// Status / message — kept for backwards compat
// ============================================================

export function getAttendanceStatus(
  _employee: Employee,
  action: "checkin" | "checkout",
  _session: "morning" | "afternoon_out" | "afternoon_in" | "evening",
  _now: Date,
): { status: string; message: string } {
  if (action === "checkin") {
    return { status: "logged", message: "Check-in recorded successfully." };
  }
  return { status: "logged", message: "Check-out recorded successfully." };
}
