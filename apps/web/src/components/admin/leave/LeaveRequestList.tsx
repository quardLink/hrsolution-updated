import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import type { LeaveRequest } from "../../../hooks/useLeaveRequests";

interface Props {
  requests: LeaveRequest[];
  loading: boolean;
  filter: "all" | "pending" | "approved" | "rejected";
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
}

function calcDays(r: LeaveRequest): number {
  if (!r.fromDate || !r.toDate) return 0;
  return Math.max(1, Math.round((new Date(r.toDate).getTime() - new Date(r.fromDate).getTime()) / 86400000) + 1);
}

export default function LeaveRequestList({ requests, loading, filter, onUpdateStatus }: Props) {
  const { t, dict, locale } = useLocale();
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  function formatDate(s: string): string {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return s;
    }
  }

  const statusLabel: Record<string, string> = {
    pending: t("leave.filterPending"),
    approved: t("leave.filterApproved"),
    rejected: t("leave.filterRejected"),
  };
  const statusTone: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500",
    approved: "bg-emerald-500/10 text-emerald-500",
    rejected: "bg-red-500/10 text-red-500",
  };

  function statusBadge(s: string) {
    return (
      <Badge variant="outline" className={`border-transparent ${statusTone[s] ?? "bg-muted text-muted-foreground"}`}>
        {statusLabel[s] ?? s}
      </Badge>
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t("common.loading")}</div>;
  }
  if (requests.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">{dict.leave.noneOfFilter(filter)}</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="ps-5">{t("leave.colEmployee")}</TableHead>
          <TableHead>{t("leave.colType")}</TableHead>
          <TableHead>{t("leave.colFrom")}</TableHead>
          <TableHead>{t("leave.colTo")}</TableHead>
          <TableHead>{t("leave.colDays")}</TableHead>
          <TableHead>{t("leave.colReason")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead className="pe-5 text-end">{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="ps-5 font-medium">{r.employeeName}</TableCell>
            <TableCell className="capitalize text-foreground/80">{r.type}</TableCell>
            <TableCell className="text-foreground/80">{formatDate(r.fromDate)}</TableCell>
            <TableCell className="text-foreground/80">{formatDate(r.toDate)}</TableCell>
            <TableCell className="text-foreground/80">{calcDays(r)}</TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate" title={r.reason}>{r.reason || "—"}</TableCell>
            <TableCell>{statusBadge(r.status)}</TableCell>
            <TableCell className="pe-5 text-end">
              {r.status === "pending" ? (
                <div className="flex justify-end gap-1">
                  <Button size="sm" onClick={() => onUpdateStatus(r.id, "approved")} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white">
                    {t("leave.approve")}
                  </Button>
                  <Button size="sm" onClick={() => onUpdateStatus(r.id, "rejected")} className="bg-red-600 hover:bg-red-500 border-red-600 text-white">
                    {t("leave.reject")}
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t("leave.by")} {r.reviewedBy || "—"}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
