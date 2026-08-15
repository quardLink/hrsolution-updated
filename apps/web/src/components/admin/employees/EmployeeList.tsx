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
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }
  if (employees.length === 0) {
    return <div className="text-center py-12 text-gray-500">No employees found.</div>;
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {employees.map((emp) => (
          <div key={emp.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  emp.active ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-300"
                }`}>
                  {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                  <div className="text-xs text-gray-500">
                    {emp.id} · {roleLabel(emp.role)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Check-in by {emp.useCustomSchedule ? emp.morningStart : "office default"}
                  </div>
                </div>
              </div>
              {!emp.active && (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs flex-shrink-0">
                  Inactive
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3 pl-13">
              <button
                onClick={() => onEdit(emp)}
                className="flex-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium"
              >
                Edit
              </button>
              {emp.active ? (
                <button
                  onClick={() => onDeactivate(emp)}
                  className="flex-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => onReactivate(emp)}
                  className="flex-1 px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium"
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
            <tr className="text-xs uppercase text-gray-500 bg-gray-50 border-b border-gray-200">
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
              <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      emp.active ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-300"
                    }`}>
                      {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-700">{roleLabel(emp.role)}</td>
                <td className="px-5 py-3 font-mono">••••</td>
                <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                  {emp.useCustomSchedule ? (
                    <span className="text-amber-700">{emp.morningStart} <span className="text-gray-400">(custom)</span></span>
                  ) : (
                    <span className="text-gray-500">Office default</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {emp.active ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">Active</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right space-x-1">
                  <button
                    onClick={() => onEdit(emp)}
                    className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                  >
                    Edit
                  </button>
                  {emp.active ? (
                    <button
                      onClick={() => onDeactivate(emp)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => onReactivate(emp)}
                      className="px-2.5 py-1 text-green-600 hover:bg-green-50 rounded text-xs font-medium"
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
