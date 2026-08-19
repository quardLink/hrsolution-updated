import { useCallback, useEffect, useState } from "react";

export interface LogEntry {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
  status: string;
  message: string;
}

export interface Employee {
  id: string;
  name: string;
  role?: string;
  reportingMorning?: string;
  reportingAfternoon?: string;
}

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logoDataUrl: string | null;
}

export interface AdminUserInfo {
  id: string;
  email: string;
  name: string;
}

export function useAdminAuth(baseUrl: string) {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUserInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/logs`, { credentials: "include" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load logs");
        return;
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setEmployees(data.employees ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const fetchMe = useCallback(async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    setOrg(data.org);
    setAdminUser(data.adminUser);
    return true;
  }, [baseUrl]);

  useEffect(() => {
    (async () => {
      setCheckingSession(true);
      const ok = await fetchMe();
      setAuthed(ok);
      if (ok) await fetchLogs();
      setCheckingSession(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(email: string, password: string) {
    setLoginLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAuthError(data.error || "Login failed");
        return;
      }
      await fetchMe();
      setAuthed(true);
      await fetchLogs();
    } catch {
      setAuthError("Network error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    setAuthed(false);
    setOrg(null);
    setAdminUser(null);
    setLogs([]);
    setEmployees([]);
  }

  return {
    checkingSession,
    authed,
    authError,
    loginLoading,
    org,
    adminUser,
    logs,
    employees,
    loading,
    error,
    setError,
    fetchLogs,
    fetchMe,
    handleLogin,
    handleLogout,
  };
}
