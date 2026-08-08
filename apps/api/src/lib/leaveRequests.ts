import { ensureSheet, readSheet, appendSheetRow, updateSheetRow } from "./googleSheets";

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

const SHEET_NAME = "LeaveRequests";
const HEADERS = [
  "ID",
  "EmployeeID",
  "EmployeeName",
  "FromDate",
  "ToDate",
  "Type",
  "Reason",
  "Status",
  "RequestedAt",
  "ReviewedAt",
  "ReviewedBy",
];
const NUM_COLS = HEADERS.length;

function rowToRequest(r: string[]): LeaveRequest | null {
  if (!r[0]) return null;
  return {
    id: r[0],
    employeeId: r[1] ?? "",
    employeeName: r[2] ?? "",
    fromDate: r[3] ?? "",
    toDate: r[4] ?? "",
    type: (r[5] ?? "other") as LeaveType,
    reason: r[6] ?? "",
    status: (r[7] ?? "pending") as LeaveStatus,
    requestedAt: r[8] ?? "",
    reviewedAt: r[9] ?? "",
    reviewedBy: r[10] ?? "",
  };
}

function requestToRow(req: LeaveRequest): string[] {
  return [
    req.id,
    req.employeeId,
    req.employeeName,
    req.fromDate,
    req.toDate,
    req.type,
    req.reason,
    req.status,
    req.requestedAt,
    req.reviewedAt,
    req.reviewedBy,
  ];
}

export async function getAllLeaveRequests(sheetId: string): Promise<LeaveRequest[]> {
  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, NUM_COLS);
  return rows.map(rowToRequest).filter((r): r is LeaveRequest => r !== null);
}

export async function addLeaveRequest(
  sheetId: string,
  req: Omit<LeaveRequest, "id" | "status" | "requestedAt" | "reviewedAt" | "reviewedBy">,
): Promise<LeaveRequest> {
  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const all = await getAllLeaveRequests(sheetId);

  const maxNum = all.reduce((max, r) => {
    const m = r.id.match(/^LR(\d+)$/);
    return m ? Math.max(max, parseInt(m[1])) : max;
  }, 0);
  const id = `LR${String(maxNum + 1).padStart(4, "0")}`;

  const newReq: LeaveRequest = {
    ...req,
    id,
    status: "pending",
    requestedAt: new Date().toISOString(),
    reviewedAt: "",
    reviewedBy: "",
  };

  await appendSheetRow(sheetId, SHEET_NAME, NUM_COLS, requestToRow(newReq));
  return newReq;
}

export async function updateLeaveRequest(
  sheetId: string,
  id: string,
  updates: Partial<LeaveRequest>,
): Promise<LeaveRequest> {
  await ensureSheet(sheetId, SHEET_NAME, HEADERS);
  const rows = await readSheet(sheetId, SHEET_NAME, NUM_COLS);
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx < 0) throw new Error(`Leave request ${id} not found`);

  const existing = rowToRequest(rows[idx])!;
  const updated: LeaveRequest = { ...existing, ...updates };
  await updateSheetRow(sheetId, SHEET_NAME, idx + 2, NUM_COLS, requestToRow(updated));
  return updated;
}
