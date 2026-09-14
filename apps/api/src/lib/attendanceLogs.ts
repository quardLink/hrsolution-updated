import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface AttendanceLogRow {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
  status: string;
  message: string;
}

export async function appendAttendanceRow(params: {
  orgId: string;
  employeeName: string;
  employeeId: string;
  action: string;
  session: string;
  timestamp: string;
  status: string;
  message: string;
  deviceId?: string;
  biometricDeviceId?: string;
  sourceRawTimestamp?: string;
  occurredAt?: Date;
}): Promise<void> {
  const db = getDb();
  await db.insert(schema.attendanceLogs).values({
    orgId: params.orgId,
    employeeCode: params.employeeId,
    employeeName: params.employeeName,
    action: params.action,
    session: params.session,
    timestamp: params.timestamp,
    status: params.status,
    message: params.message,
    deviceId: params.deviceId,
    biometricDeviceId: params.biometricDeviceId,
    sourceRawTimestamp: params.sourceRawTimestamp,
    occurredAt: params.occurredAt ?? new Date(),
  });
}

// Most recent event for this employee regardless of source (kiosk or
// terminal) — used to toggle a bare fingerprint punch between checkin and
// checkout, since the terminal itself doesn't tell us which one it is.
export async function getLastAttendanceLog(
  orgId: string,
  employeeCode: string,
): Promise<{ action: string; occurredAt: Date } | null> {
  const db = getDb();
  const rows = await db.query.attendanceLogs.findMany({
    where: and(eq(schema.attendanceLogs.orgId, orgId), eq(schema.attendanceLogs.employeeCode, employeeCode)),
    orderBy: (t, { desc }) => [desc(t.occurredAt)],
    limit: 1,
  });
  return rows[0] ? { action: rows[0].action, occurredAt: rows[0].occurredAt } : null;
}

// A terminal retries a push until it gets an "OK" back, so the same batch
// of punches can arrive more than once — this is the guard against
// double-inserting the same physical punch. Keyed on the device's own raw
// timestamp string (not a time window): a retry resends that string
// byte-for-byte, while two genuinely different scans seconds apart (e.g.
// checkin immediately followed by a checkout, common during testing)
// always carry different raw strings, so this can't confuse the two the
// way a recency window did.
export async function attendancePunchExists(
  orgId: string,
  employeeCode: string,
  biometricDeviceId: string,
  sourceRawTimestamp: string,
): Promise<boolean> {
  const db = getDb();
  const row = await db.query.attendanceLogs.findFirst({
    where: and(
      eq(schema.attendanceLogs.orgId, orgId),
      eq(schema.attendanceLogs.employeeCode, employeeCode),
      eq(schema.attendanceLogs.biometricDeviceId, biometricDeviceId),
      eq(schema.attendanceLogs.sourceRawTimestamp, sourceRawTimestamp),
    ),
  });
  return !!row;
}

export async function getAttendanceLogs(orgId: string): Promise<AttendanceLogRow[]> {
  const db = getDb();
  const rows = await db.query.attendanceLogs.findMany({ where: eq(schema.attendanceLogs.orgId, orgId) });
  return rows.map((r) => ({
    timestamp: r.timestamp,
    employeeName: r.employeeName,
    employeeId: r.employeeCode,
    session: r.session,
    action: r.action,
    status: r.status,
    message: r.message,
  }));
}
