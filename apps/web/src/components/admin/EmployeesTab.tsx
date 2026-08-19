import { useState } from "react";
import { useEmployees, type Employee } from "../../hooks/useEmployees";
import EmployeeList from "./employees/EmployeeList";
import EmployeeFormModal from "./employees/EmployeeFormModal";

export default function EmployeesTab() {
  const { employees, roles, loading, saveEmployee, deactivate, reactivate } = useEmployees();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setShowForm(true);
  }

  const visible = employees.filter((e) => {
    if (!showInactive && !e.active) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 lg:p-5 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-foreground">Employees</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">Add, edit, or deactivate employees and their PINs.</p>
          </div>
          <button
            onClick={openAdd}
            className="px-3 lg:px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium rounded-lg whitespace-nowrap"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded accent-primary"
            />
            Show inactive
          </label>
        </div>
      </div>

      <EmployeeList
        employees={visible}
        roles={roles}
        loading={loading}
        onEdit={openEdit}
        onDeactivate={deactivate}
        onReactivate={reactivate}
      />

      {showForm && (
        <EmployeeFormModal
          editing={editing}
          roles={roles}
          onClose={() => setShowForm(false)}
          onSave={saveEmployee}
        />
      )}
    </div>
  );
}
