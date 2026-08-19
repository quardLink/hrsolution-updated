import { createContext, useContext, type ReactNode } from "react";

interface AdminApiValue {
  baseUrl: string;
  onError: (message: string) => void;
}

const AdminApiContext = createContext<AdminApiValue | null>(null);

export function AdminApiProvider({ value, children }: { value: AdminApiValue; children: ReactNode }) {
  return <AdminApiContext.Provider value={value}>{children}</AdminApiContext.Provider>;
}

export function useAdminApi(): AdminApiValue {
  const ctx = useContext(AdminApiContext);
  if (!ctx) throw new Error("useAdminApi must be used within AdminApiProvider");
  return ctx;
}
