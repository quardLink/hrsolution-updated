import { useCallback, useEffect, useState } from "react";
import { useAdminApi } from "../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../lib/adminApi";

export interface Role {
  value: string;
  label: string;
}

export function useRoles() {
  const { password, baseUrl, onError } = useAdminApi();
  const [roles, setRoles] = useState<Role[]>([]);

  const reload = useCallback(async () => {
    const res = await fetch(`${baseUrl}/api/admin/roles`, { headers: { "x-admin-password": password } });
    if (res.ok) {
      const data = await res.json();
      setRoles(data.roles ?? []);
    }
  }, [baseUrl, password]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addRole(value: string, label: string): Promise<boolean> {
    if (!value || !label) {
      onError("Role key and label are required");
      return false;
    }
    try {
      await adminFetch(baseUrl, "/api/admin/roles", {
        password,
        method: "POST",
        body: { value, label },
        errorMessage: "Failed to add role",
      });
      await reload();
      return true;
    } catch (err) {
      onError(toErrorMessage(err));
      return false;
    }
  }

  async function saveRoleEdit(oldValue: string, label: string): Promise<boolean> {
    if (!label) return false;
    try {
      await adminFetch(baseUrl, `/api/admin/roles/${encodeURIComponent(oldValue)}`, {
        password,
        method: "PATCH",
        body: { label },
        errorMessage: "Failed to update role",
      });
      await reload();
      return true;
    } catch (err) {
      onError(toErrorMessage(err));
      return false;
    }
  }

  async function removeRole(value: string): Promise<void> {
    if (!confirm(`Remove role "${value}"? Existing employees with this role will keep it but it won't appear in the dropdown.`)) return;
    try {
      await adminFetch(baseUrl, `/api/admin/roles/${encodeURIComponent(value)}`, {
        password,
        method: "DELETE",
        errorMessage: "Failed to delete role",
      });
      await reload();
    } catch (err) {
      onError(toErrorMessage(err));
    }
  }

  return { roles, reload, addRole, saveRoleEdit, removeRole };
}
