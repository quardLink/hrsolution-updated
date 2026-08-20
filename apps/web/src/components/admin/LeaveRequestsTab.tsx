import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="overflow-hidden py-0 gap-0">
      <LeaveRequestFilters filter={filter} onFilterChange={setFilter} onNew={() => setShowForm(true)} />

      <CardContent className="p-0">
        <LeaveRequestList requests={filtered} loading={loading} filter={filter} onUpdateStatus={updateStatus} />
      </CardContent>

      {showForm && (
        <NewLeaveRequestModal employees={employees} onClose={() => setShowForm(false)} onSubmit={submitRequest} />
      )}
    </Card>
  );
}
