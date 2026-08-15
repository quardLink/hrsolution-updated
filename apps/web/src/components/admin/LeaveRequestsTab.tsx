import { useState } from "react";
import { useLeaveRequests } from "../../hooks/useLeaveRequests";
import LeaveRequestFilters from "./leave/LeaveRequestFilters";
import LeaveRequestList from "./leave/LeaveRequestList";
import NewLeaveRequestModal from "./leave/NewLeaveRequestModal";

type FilterValue = "all" | "pending" | "approved" | "rejected";

export default function LeaveRequestsTab() {
  const { requests, employees, loading, submitRequest, updateStatus } = useLeaveRequests();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("pending");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <LeaveRequestFilters filter={filter} onFilterChange={setFilter} onNew={() => setShowForm(true)} />

      <LeaveRequestList requests={filtered} loading={loading} filter={filter} onUpdateStatus={updateStatus} />

      {showForm && (
        <NewLeaveRequestModal employees={employees} onClose={() => setShowForm(false)} onSubmit={submitRequest} />
      )}
    </div>
  );
}
