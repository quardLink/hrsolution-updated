import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { hashSecret, verifySecret } from "./crypto";

// Roles are per-org and admin-editable (see roles.ts) — not a fixed union.
export type EmployeeRole = string;

export interface Employee {
  id: string; // the human-facing "EMP001" style code
  name: string;
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

function toEmployee(row: typeof schema.employees.$inferSelect): Employee {
  return {
    id: row.code,
    name: row.name,
    role: row.role,
    active: row.active,
    useCustomSchedule: row.useCustomSchedule,
    morningStart: row.morningStart,
    morningEnd: row.morningEnd,
    afternoonStart: row.afternoonStart,
    afternoonEnd: row.afternoonEnd,
    monthlySalary: Number(row.monthlySalary),
  };
}

export async function getAllEmployees(orgId: string): Promise<Employee[]> {
  const db = getDb();
  const rows = await db.query.employees.findMany({ where: eq(schema.employees.orgId, orgId) });
  return rows.map(toEmployee);
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
  orgId: string,
  defaults: EffectiveSchedule,
): Promise<PublicEmployee[]> {
  const all = await getAllEmployees(orgId);
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
  orgId: string,
  employeeId: string,
  pin: string,
): Promise<Employee | null> {
  const db = getDb();
  const row = await db.query.employees.findFirst({
    where: and(eq(schema.employees.orgId, orgId), eq(schema.employees.code, employeeId)),
  });
  if (!row || !row.active) return null;
  if (!verifySecret(pin, row.pinHash)) return null;
  return toEmployee(row);
}

// ============================================================
// Admin CRUD
// ============================================================

export async function addEmployee(
  orgId: string,
  emp: Omit<Employee, "id"> & { id?: string; pin: string },
): Promise<Employee> {
  const db = getDb();
  const all = await db.query.employees.findMany({ where: eq(schema.employees.orgId, orgId) });

  let code = emp.id;
  if (!code) {
    const maxNum = all.reduce((max, e) => {
      const m = e.code.match(/^EMP(\d+)$/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    code = `EMP${String(maxNum + 1).padStart(3, "0")}`;
  }
  if (all.some((e) => e.code === code)) {
    throw new Error(`Employee with ID ${code} already exists`);
  }

  const [row] = await db
    .insert(schema.employees)
    .values({
      orgId,
      code,
      name: emp.name,
      pinHash: hashSecret(emp.pin),
      role: emp.role,
      active: emp.active,
      useCustomSchedule: emp.useCustomSchedule,
      morningStart: emp.morningStart,
      morningEnd: emp.morningEnd,
      afternoonStart: emp.afternoonStart,
      afternoonEnd: emp.afternoonEnd,
      monthlySalary: String(emp.monthlySalary ?? 0),
    })
    .returning();

  return toEmployee(row);
}

export async function updateEmployee(
  orgId: string,
  id: string,
  updates: Partial<Omit<Employee, "id">> & { pin?: string },
): Promise<Employee> {
  const db = getDb();
  const { pin, monthlySalary, ...rest } = updates;

  const values: Partial<typeof schema.employees.$inferInsert> = { ...rest };
  if (pin) values.pinHash = hashSecret(pin);
  if (monthlySalary !== undefined) values.monthlySalary = String(monthlySalary);

  const [updated] = await db
    .update(schema.employees)
    .set(values)
    .where(and(eq(schema.employees.orgId, orgId), eq(schema.employees.code, id)))
    .returning();

  if (!updated) throw new Error(`Employee ${id} not found`);
  return toEmployee(updated);
}

export async function deleteEmployee(orgId: string, id: string): Promise<void> {
  // Soft delete — set active=false to preserve attendance history integrity
  await updateEmployee(orgId, id, { active: false });
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
