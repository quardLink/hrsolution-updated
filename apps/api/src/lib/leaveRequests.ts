import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export type LeaveType = "annual" | "sick" | "unpaid" | "emergency" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  requestedAt: string;
  reviewedAt: string;
  reviewedBy: string;
}

function toLeaveRequest(row: typeof schema.leaveRequests.$inferSelect): LeaveRequest {
  return {
    id: row.id,
    employeeId: row.employeeCode,
    employeeName: row.employeeName,
    fromDate: row.fromDate,
    toDate: row.toDate,
    type: row.type as LeaveType,
    reason: row.reason,
    status: row.status as LeaveStatus,
    requestedAt: row.requestedAt,
    reviewedAt: row.reviewedAt,
    reviewedBy: row.reviewedBy,
  };
}

export async function getAllLeaveRequests(orgId: string): Promise<LeaveRequest[]> {
  const db = getDb();
  const rows = await db.query.leaveRequests.findMany({ where: eq(schema.leaveRequests.orgId, orgId) });
  return rows.map(toLeaveRequest);
}

export async function addLeaveRequest(
  orgId: string,
  req: Omit<LeaveRequest, "id" | "status" | "requestedAt" | "reviewedAt" | "reviewedBy">,
): Promise<LeaveRequest> {
  const db = getDb();
  const [row] = await db
    .insert(schema.leaveRequests)
    .values({
      orgId,
      employeeCode: req.employeeId,
      employeeName: req.employeeName,
      fromDate: req.fromDate,
      toDate: req.toDate,
      type: req.type,
      reason: req.reason,
      requestedAt: new Date().toISOString(),
    })
    .returning();
  return toLeaveRequest(row);
}

export async function updateLeaveRequest(
  orgId: string,
  id: string,
  updates: Partial<LeaveRequest>,
): Promise<LeaveRequest> {
  const db = getDb();
  const { employeeId, ...rest } = updates;
  const values: Partial<typeof schema.leaveRequests.$inferInsert> = { ...rest };
  if (employeeId !== undefined) values.employeeCode = employeeId;

  const [updated] = await db
    .update(schema.leaveRequests)
    .set(values)
    .where(and(eq(schema.leaveRequests.orgId, orgId), eq(schema.leaveRequests.id, id)))
    .returning();

  if (!updated) throw new Error(`Leave request ${id} not found`);
  return toLeaveRequest(updated);
}
