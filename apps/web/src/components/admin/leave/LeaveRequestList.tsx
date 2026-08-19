import type { LeaveRequest } from "../../../hooks/useLeaveRequests";

interface Props {
  requests: LeaveRequest[];
  loading: boolean;
  filter: "all" | "pending" | "approved" | "rejected";
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
}

function statusBadge(s: string) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-400",
    approved: "bg-emerald-500/15 text-emerald-400",
    rejected: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[s] ?? "bg-muted text-muted-foreground"}`}>
      {s}
    </span>
  );
}

function formatDate(s: string): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

function calcDays(r: LeaveRequest): number {
  if (!r.fromDate || !r.toDate) return 0;
  return Math.max(1, Math.round((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / 86400000) + 1);
}

export default function LeaveRequestList({ requests, loading, filter, onUpdateStatus }: Props) {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }
  if (requests.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No {filter !== "all" ? filter : ""} requests.</div>;
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-border">
        {requests.map((r) => (
          <div key={r.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">{r.employeeName}</div>
                <div className="text-xs text-muted-foreground capitalize">{r.type} leave</div>
              </div>
              {statusBadge(r.status)}
            </div>
            <div className="text-sm text-foreground/80">
              {formatDate(r.fromDate)} → {formatDate(r.toDate)}
              <span className="text-muted-foreground ml-2">({calcDays(r)} day{calcDays(r) > 1 ? "s" : ""})</span>
            </div>
            {r.reason && (
              <div className="text-xs text-muted-foreground mt-1 italic">"{r.reason}"</div>
            )}
            {r.status === "pending" ? (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onUpdateStatus(r.id, "approved")}
                  className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => onUpdateStatus(r.id, "rejected")}
                  className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2">
                Reviewed by {r.reviewedBy || "—"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground bg-muted/30 border-b border-border">
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">From</th>
              <th className="px-5 py-3 text-left">To</th>
              <th className="px-5 py-3 text-left">Days</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30">
                <td className="px-5 py-3 font-medium text-foreground">{r.employeeName}</td>
                <td className="px-5 py-3 capitalize text-foreground/80">{r.type}</td>
                <td className="px-5 py-3 text-foreground/80">{formatDate(r.fromDate)}</td>
                <td className="px-5 py-3 text-foreground/80">{formatDate(r.toDate)}</td>
                <td className="px-5 py-3 text-foreground/80">{calcDays(r)}</td>
                <td className="px-5 py-3 text-muted-foreground max-w-xs truncate" title={r.reason}>{r.reason || "—"}</td>
                <td className="px-5 py-3">{statusBadge(r.status)}</td>
                <td className="px-5 py-3 text-right space-x-1">
                  {r.status === "pending" ? (
                    <>
                      <button
                        onClick={() => onUpdateStatus(r.id, "approved")}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onUpdateStatus(r.id, "rejected")}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      by {r.reviewedBy || "—"}
                    </span>
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
