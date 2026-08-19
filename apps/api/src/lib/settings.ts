import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface OfficeSettings {
  defaultMorningStart: string;
  defaultMorningEnd: string;
  defaultAfternoonStart: string;
  defaultAfternoonEnd: string;
  lunchBreakEnd: string;
  lateThresholdMinutes: string;
  weeklyOffDay: string; // e.g. "Friday" — informational only; payroll treats every day identically
  // Payroll-specific — a single company-wide shift with a floating break,
  // kept separate from the default* fields above (those still drive the
  // kiosk's late-arrival messages, a different concern).
  payrollShiftStart: string;
  payrollShiftEnd: string;
  payrollBreakMinutes: string;
}

function toSettings(row: typeof schema.orgSettings.$inferSelect): OfficeSettings {
  return {
    defaultMorningStart: row.defaultMorningStart,
    defaultMorningEnd: row.defaultMorningEnd,
    defaultAfternoonStart: row.defaultAfternoonStart,
    defaultAfternoonEnd: row.defaultAfternoonEnd,
    lunchBreakEnd: row.lunchBreakEnd,
    lateThresholdMinutes: row.lateThresholdMinutes,
    weeklyOffDay: row.weeklyOffDay,
    payrollShiftStart: row.payrollShiftStart,
    payrollShiftEnd: row.payrollShiftEnd,
    payrollBreakMinutes: row.payrollBreakMinutes,
  };
}

export async function getOfficeSettings(orgId: string): Promise<OfficeSettings> {
  const db = getDb();
  const row = await db.query.orgSettings.findFirst({ where: eq(schema.orgSettings.orgId, orgId) });
  if (!row) {
    // Every org gets a settings row on signup — this only happens for an
    // org created outside that path (e.g. the migration script).
    const [created] = await db.insert(schema.orgSettings).values({ orgId }).returning();
    return toSettings(created);
  }
  return toSettings(row);
}

export async function updateOfficeSettings(
  orgId: string,
  updates: Partial<OfficeSettings>,
): Promise<OfficeSettings> {
  const db = getDb();
  await getOfficeSettings(orgId); // ensure a row exists
  const [updated] = await db
    .update(schema.orgSettings)
    .set(updates)
    .where(eq(schema.orgSettings.orgId, orgId))
    .returning();
  return toSettings(updated);
}
