import { and, eq, lt } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { verifyEmployee } from "./employees";
import { isValidDescriptor, isFaceMatch } from "./faceMatch";
import { getLastAttendanceLog, appendAttendanceRow } from "./attendanceLogs";
import { getOfficeSettings } from "./settings";
import { getOrgById } from "./orgs";
import { listGeofenceSites, isWithinAnySite } from "./geofence";

export interface RemoteCheckInRequestRow {
  id: string;
  employeeCode: string;
  employeeName: string;
  action: "checkin" | "checkout";
  status: "pending" | "approved" | "rejected" | "expired";
  submittedAt: Date;
  photoDataUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  withinGeofence: boolean | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

function toRow(row: typeof schema.remoteCheckInRequests.$inferSelect): RemoteCheckInRequestRow {
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    action: row.action as "checkin" | "checkout",
    status: row.status as RemoteCheckInRequestRow["status"],
    submittedAt: row.submittedAt,
    photoDataUrl: row.photoDataUrl,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    withinGeofence: row.withinGeofence,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
  };
}

function formatTimestamp(date: Date, timeZone: string): string {
  return date.toLocaleString("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export type SubmitResult =
  | { ok: true; status: "approved" | "pending"; action: "checkin" | "checkout" }
  | { ok: false; error: string };

// Same toggle logic as the kiosk/terminal: alternates off whatever this
// employee's last logged action was today, in the org's own timezone.
export async function determineNextAction(orgId: string, employeeCode: string, timeZone: string): Promise<"checkin" | "checkout"> {
  const now = new Date();
  const last = await getLastAttendanceLog(orgId, employeeCode);
  const sameLocalDay =
    last !== null && now.toLocaleDateString("en-CA", { timeZone }) === last.occurredAt.toLocaleDateString("en-CA", { timeZone });
  return sameLocalDay && last!.action === "checkin" ? "checkout" : "checkin";
}

// The employeeCode here always comes from the paired device's own record
// (req.pairedEmployeeCode), never from the request body — a phone can
// only ever submit for the one employee it was paired to.
export async function submitRemoteCheckIn(params: {
  orgId: string;
  deviceId: string;
  employeeCode: string;
  pin: string;
  faceDescriptor: unknown;
  photoDataUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}): Promise<SubmitResult> {
  const settings = await getOfficeSettings(params.orgId);
  if (settings.remoteCheckInMode === "disabled") {
    return { ok: false, error: "Remote check-in is not enabled for this company" };
  }

  const employee = await verifyEmployee(params.orgId, params.employeeCode, params.pin);
  if (!employee) return { ok: false, error: "Incorrect passkey. Please try again." };

  if (!employee.faceDescriptor) {
    return { ok: false, error: "Face verification isn't set up for this employee yet — ask your admin to enroll it first." };
  }
  if (!isValidDescriptor(params.faceDescriptor)) {
    return { ok: false, error: "Face capture failed. Please try again." };
  }
  if (!isFaceMatch(employee.faceDescriptor, params.faceDescriptor)) {
    return { ok: false, error: "Face didn't match. Please try again or ask your admin for help." };
  }

  const serverNow = new Date();
  const org = await getOrgById(params.orgId);
  const timeZone = org?.timezone ?? "Asia/Riyadh";
  const action = await determineNextAction(params.orgId, employee.id, timeZone);

  const sites = await listGeofenceSites(params.orgId);
  const withinGeofence = isWithinAnySite(sites, params.latitude, params.longitude);

  const canAutoApprove =
    settings.remoteCheckInMode === "auto_approve" && (!settings.remoteCheckInRequireGeofence || withinGeofence === true);

  const db = getDb();

  if (canAutoApprove) {
    await appendAttendanceRow({
      orgId: params.orgId,
      employeeName: employee.name,
      employeeId: employee.id,
      action,
      session: action === "checkin" ? "morning" : "evening",
      timestamp: formatTimestamp(serverNow, timeZone),
      status: "logged",
      message: action === "checkin" ? "Check-in recorded successfully." : "Check-out recorded successfully.",
      deviceId: params.deviceId,
      occurredAt: serverNow,
      authType: "mobile_approved",
    });

    await db.insert(schema.remoteCheckInRequests).values({
      orgId: params.orgId,
      employeeCode: employee.id,
      employeeName: employee.name,
      action,
      status: "approved",
      submittedAt: serverNow,
      deviceId: params.deviceId,
      photoDataUrl: null, // never retained — no HR review happens for an auto-approved punch
      latitude: params.latitude === null ? null : String(params.latitude),
      longitude: params.longitude === null ? null : String(params.longitude),
      withinGeofence,
      reviewedBy: "auto",
      reviewedAt: serverNow,
    });

    return { ok: true, status: "approved", action };
  }

  await db.insert(schema.remoteCheckInRequests).values({
    orgId: params.orgId,
    employeeCode: employee.id,
    employeeName: employee.name,
    action,
    status: "pending",
    submittedAt: serverNow,
    deviceId: params.deviceId,
    photoDataUrl: params.photoDataUrl,
    latitude: params.latitude === null ? null : String(params.latitude),
    longitude: params.longitude === null ? null : String(params.longitude),
    withinGeofence,
  });

  return { ok: true, status: "pending", action };
}

// Any pending request older than the configured expiry is flipped to
// "expired" (and its photo dropped) before the list is read — this app
// has no background job to sweep it proactively, so expiry is computed
// lazily on read instead.
async function expireStaleRequests(orgId: string): Promise<void> {
  const settings = await getOfficeSettings(orgId);
  const expiryHours = Number(settings.remoteCheckInExpiryHours) || 24;
  const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

  const db = getDb();
  await db
    .update(schema.remoteCheckInRequests)
    .set({ status: "expired", photoDataUrl: null })
    .where(
      and(
        eq(schema.remoteCheckInRequests.orgId, orgId),
        eq(schema.remoteCheckInRequests.status, "pending"),
        lt(schema.remoteCheckInRequests.submittedAt, cutoff),
      ),
    );
}

export async function listRemoteCheckInRequests(
  orgId: string,
  filter?: { status?: RemoteCheckInRequestRow["status"] },
): Promise<RemoteCheckInRequestRow[]> {
  await expireStaleRequests(orgId);
  const db = getDb();
  const rows = await db.query.remoteCheckInRequests.findMany({
    where: filter?.status
      ? and(eq(schema.remoteCheckInRequests.orgId, orgId), eq(schema.remoteCheckInRequests.status, filter.status))
      : eq(schema.remoteCheckInRequests.orgId, orgId),
    orderBy: (t, { desc }) => [desc(t.submittedAt)],
  });
  return rows.map(toRow);
}

export type DecideResult = { ok: true; row: RemoteCheckInRequestRow } | { ok: false; error: string };

export async function decideRemoteCheckInRequest(
  orgId: string,
  requestId: string,
  decision: { status: "approved" | "rejected"; reviewedBy: string; rejectionReason?: string },
): Promise<DecideResult> {
  await expireStaleRequests(orgId);
  const db = getDb();

  const existing = await db.query.remoteCheckInRequests.findFirst({
    where: and(eq(schema.remoteCheckInRequests.id, requestId), eq(schema.remoteCheckInRequests.orgId, orgId)),
  });
  if (!existing) return { ok: false, error: "Request not found" };
  if (existing.status !== "pending") return { ok: false, error: `This request is already ${existing.status}` };

  if (decision.status === "approved") {
    const org = await getOrgById(orgId);
    const timeZone = org?.timezone ?? "Asia/Riyadh";
    await appendAttendanceRow({
      orgId,
      employeeName: existing.employeeName,
      employeeId: existing.employeeCode,
      action: existing.action,
      session: existing.action === "checkin" ? "morning" : "evening",
      timestamp: formatTimestamp(existing.submittedAt, timeZone),
      status: "logged",
      message: existing.action === "checkin" ? "Check-in recorded successfully." : "Check-out recorded successfully.",
      deviceId: existing.deviceId ?? undefined,
      occurredAt: existing.submittedAt,
      authType: "mobile_approved",
    });
  }

  const [updated] = await db
    .update(schema.remoteCheckInRequests)
    .set({
      status: decision.status,
      photoDataUrl: null,
      reviewedBy: decision.reviewedBy,
      reviewedAt: new Date(),
      rejectionReason: decision.status === "rejected" ? decision.rejectionReason ?? "" : null,
    })
    .where(eq(schema.remoteCheckInRequests.id, requestId))
    .returning();

  return { ok: true, row: toRow(updated) };
}
