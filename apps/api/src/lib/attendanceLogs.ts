import { eq } from "drizzle-orm";
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
  });
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
