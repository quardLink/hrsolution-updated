import type { Employee, EmployeeRole } from "../../../hooks/useEmployees";

interface Props {
  employees: Employee[];
  roles: EmployeeRole[];
  loading: boolean;
  onEdit: (emp: Employee) => void;
  onDeactivate: (emp: Employee) => void;
  onReactivate: (emp: Employee) => void;
}

export default function EmployeeList({ employees, roles, loading, onEdit, onDeactivate, onReactivate }: Props) {
  function roleLabel(value: string): string {
    return roles.find((r) => r.value === value)?.label ?? value.replace(/_/g, " ");
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }
  if (employees.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No employees found.</div>;
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-border">
        {employees.map((emp) => (
          <div key={emp.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  emp.active ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-muted"
                }`}>
                  {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground truncate">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {emp.id} · {roleLabel(emp.role)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Check-in by {emp.useCustomSchedule ? emp.morningStart : "office default"}
                  </div>
                </div>
              </div>
              {!emp.active && (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs flex-shrink-0">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3 pl-13">
              <button
                onClick={() => onEdit(emp)}
                className="flex-1 px-3 py-1.5 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-sm font-medium"
              >
                Edit
              </button>
              {emp.active ? (
                <button
                  onClick={() => onDeactivate(emp)}
                  className="flex-1 px-3 py-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-sm font-medium"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => onReactivate(emp)}
                  className="flex-1 px-3 py-1.5 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-sm font-medium"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground bg-muted/30 border-b border-border">
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Role</th>
              <th className="px-5 py-3 text-left">PIN</th>
              <th className="px-5 py-3 text-left">Check-In Time</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border/60 hover:bg-muted/30">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      emp.active ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-muted"
                    }`}>
                      {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-foreground/80">{roleLabel(emp.role)}</td>
                <td className="px-5 py-3 font-mono text-muted-foreground">••••</td>
                <td className="px-5 py-3 text-foreground/80 font-mono text-xs">
                  {emp.useCustomSchedule ? (
                    <span className="text-amber-400">{emp.morningStart} <span className="text-muted-foreground">(custom)</span></span>
                  ) : (
                    <span className="text-muted-foreground">Office default</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {emp.active ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs">Active</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right space-x-1">
                  <button
                    onClick={() => onEdit(emp)}
                    className="px-2.5 py-1 text-indigo-300 hover:bg-indigo-500/10 rounded text-xs font-medium"
                  >
                    Edit
                  </button>
                  {emp.active ? (
                    <button
                      onClick={() => onDeactivate(emp)}
                      className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 rounded text-xs font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivate(emp)}
                      className="px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/10 rounded text-xs font-medium"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
