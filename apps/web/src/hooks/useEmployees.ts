import { useEffect, useState } from "react";
import { useAdminApi } from "../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../lib/adminApi";

export interface Employee {
  id: string;
  name: string;
  pin: string;
  role: string;
  active: boolean;
  useCustomSchedule: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  monthlySalary: number;
}

export interface EmployeeRole {
  value: string;
  label: string;
}

export type EmployeeFormValues = Omit<Employee, "id"> & { id: string };

export function useEmployees() {
  const { password, baseUrl, onError } = useAdminApi();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [empRes, rolesRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/employees`, { headers: { "x-admin-password": password } }),
        fetch(`${baseUrl}/api/admin/roles`, { headers: { "x-admin-password": password } }),
      ]);
      if (!empRes.ok) {
        onError("Failed to load employees");
        return;
      }
      const empData = await empRes.json();
      setEmployees(empData.employees ?? []);
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles ?? []);
      }
    } catch {
      onError("Network error loading employees");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveEmployee(form: EmployeeFormValues, editing: Employee | null): Promise<boolean> {
    if (!form.name.trim() || !form.pin.trim()) {
      onError("Name and PIN are required");
      return false;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      onError("PIN must be exactly 4 digits");
      return false;
    }
    try {
      const path = editing ? `/api/admin/employees/${editing.id}` : `/api/admin/employees`;
      const body = editing ? { ...form, id: undefined } : form;
      await adminFetch(baseUrl, path, {
        password,
        method: editing ? "PATCH" : "POST",
        body,
        errorMessage: "Failed to save employee",
      });
      await load();
      return true;
    } catch (err) {
      onError(toErrorMessage(err));
      return false;
    }
  }

  async function deactivate(emp: Employee) {
    if (!confirm(`Deactivate ${emp.name}? They will no longer appear on the keypad. This is reversible.`)) return;
    try {
      await adminFetch(baseUrl, `/api/admin/employees/${emp.id}`, {
        password,
        method: "DELETE",
        errorMessage: "Failed to deactivate employee",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  async function reactivate(emp: Employee) {
    try {
      await adminFetch(baseUrl, `/api/admin/employees/${emp.id}`, {
        password,
        method: "PATCH",
        body: { active: true },
        errorMessage: "Failed to reactivate employee",
      });
      await load();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  return { employees, roles, loading, saveEmployee, deactivate, reactivate };
}
