import { useEffect, useState } from "react";

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

const STORAGE_KEY = "pst_admin_password";

export function useAdminAuth(baseUrl: string) {
  const [password, setPassword] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [authed, setAuthed] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Logs are fetched from a Google-Sheets-backed endpoint, which can fail
  // for reasons unrelated to the password (e.g. Sheets not configured yet).
  // Auth is verified separately via /api/admin/login so a Sheets outage
  // doesn't masquerade as "wrong password" and block the whole session.
  async function fetchLogs(pwd: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/logs`, {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setAuthError("Invalid password");
        setAuthed(false);
        localStorage.removeItem(STORAGE_KEY);
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
  }

  async function verifyAndLogin(pwd: string) {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) {
        setAuthError(res.status === 401 ? "Invalid password" : "Login failed");
        setAuthed(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setAuthed(true);
      localStorage.setItem(STORAGE_KEY, pwd);
      await fetchLogs(pwd);
    } catch {
      setAuthError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) verifyAndLogin(password);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    verifyAndLogin(password);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setPassword("");
    setAuthed(false);
    setLogs([]);
  }

  function changePassword(newPwd: string) {
    setPassword(newPwd);
    localStorage.setItem(STORAGE_KEY, newPwd);
  }

  return {
    password,
    setPassword,
    authed,
    authError,
    logs,
    employees,
    loading,
    error,
    setError,
    fetchLogs,
    handleLogin,
    handleLogout,
    changePassword,
  };
}
