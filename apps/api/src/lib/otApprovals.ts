import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface OtApproval {
  employeeCode: string;
  date: string;
  otMinutes: number;
  status: "approved" | "rejected";
  reviewedBy: string;
  reviewedAt: Date;
}

function toApproval(row: typeof schema.otApprovals.$inferSelect): OtApproval {
  return {
    employeeCode: row.employeeCode,
    date: row.date,
    otMinutes: Number(row.otMinutes),
    status: row.status as "approved" | "rejected",
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
  };
}

// All decisions in a date range (inclusive, "YYYY-MM-DD" strings) — used
// both to build the pending-approvals list (cross-referenced against every
// day that actually had OT) and to feed calculateMonthlyPayroll the set of
// approved dates per employee.
export async function getOtApprovalsInRange(orgId: string, fromDate: string, toDate: string): Promise<OtApproval[]> {
  const db = getDb();
  const rows = await db.query.otApprovals.findMany({
    where: and(eq(schema.otApprovals.orgId, orgId), gte(schema.otApprovals.date, fromDate), lte(schema.otApprovals.date, toDate)),
  });
  return rows.map(toApproval);
}

export async function setOtApproval(params: {
  orgId: string;
  employeeCode: string;
  date: string;
  otMinutes: number;
  status: "approved" | "rejected";
  reviewedBy: string;
}): Promise<OtApproval> {
  const db = getDb();
  const [row] = await db
    .insert(schema.otApprovals)
    .values({
      orgId: params.orgId,
      employeeCode: params.employeeCode,
      date: params.date,
      otMinutes: String(params.otMinutes),
      status: params.status,
      reviewedBy: params.reviewedBy,
      reviewedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.otApprovals.orgId, schema.otApprovals.employeeCode, schema.otApprovals.date],
      set: {
        otMinutes: String(params.otMinutes),
        status: params.status,
        reviewedBy: params.reviewedBy,
        reviewedAt: new Date(),
      },
    })
    .returning();
  return toApproval(row);
}
