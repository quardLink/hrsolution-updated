import { useEffect, useState } from "react";
import { useAdminApi } from "../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../lib/adminApi";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt: string;
  reviewedBy: string;
}

export interface ActiveEmployee {
  id: string;
  name: string;
  active: boolean;
}

export interface NewLeaveRequestInput {
  employeeId: string;
  fromDate: string;
  toDate: string;
  type: string;
  reason: string;
}

export function useLeaveRequests() {
  const { baseUrl, onError } = useAdminApi();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<ActiveEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [reqRes, empRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/leave-requests`, { credentials: "include" }),
        fetch(`${baseUrl}/api/admin/employees`, { credentials: "include" }),
      ]);
      if (!reqRes.ok || !empRes.ok) {
        onError("Failed to load leave requests");
        return;
      }
      const reqData = await reqRes.json();
      const empData = await empRes.json();
      setRequests(reqData.requests ?? []);
      setEmployees((empData.employees ?? []).filter((e: ActiveEmployee) => e.active));
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitRequest(input: NewLeaveRequestInput): Promise<boolean> {
    if (!input.employeeId || !input.fromDate || !input.toDate) {
      onError("Please fill in all required fields");
      return false;
    }
    if (input.toDate < input.fromDate) {
      onError("End date cannot be before start date");
      return false;
    }
    try {
      await adminFetch(baseUrl, "/api/admin/leave-requests", {
        method: "POST",
        body: input,
        errorMessage: "Failed to create leave request",
      });
      await load();
      return true;
    } catch (err) {
      onError(toErrorMessage(err));
      return false;
    }
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    try {
      await adminFetch(baseUrl, `/api/admin/leave-requests/${id}`, {
        method: "PATCH",
        body: { status, reviewedBy: "admin" },
        errorMessage: "Failed to update request",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  return { requests, employees, loading, submitRequest, updateStatus };
}
