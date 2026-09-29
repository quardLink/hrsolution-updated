import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../contexts/AdminApiContext";

interface OtApprovalItem {
  employeeId: string;
  employeeName: string;
  date: string;
  otMinutes: number;
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
}

const statusStyles: Record<OtApprovalItem["status"], string> = {
  pending: "bg-amber-500/15 text-amber-600",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/15 text-destructive",
};

export default function OtApprovalsPanel({ year, month }: { year: number; month: number }) {
  const { t, dict } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [items, setItems] = useState<OtApprovalItem[]>([]);
  const [otApprovalRequired, setOtApprovalRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [decidingKey, setDecidingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/ot-approvals?year=${year}&month=${month}`, {
        credentials: "include",
      });
      if (!res.ok) {
        onError("Failed to load overtime approvals");
        return;
      }
      const data = await res.json();
      setOtApprovalRequired(Boolean(data.otApprovalRequired));
      setItems(data.items ?? []);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function decide(item: OtApprovalItem, status: "approved" | "rejected") {
    const key = `${item.employeeId}|${item.date}`;
    setDecidingKey(key);
    try {
      const res = await fetch(`${baseUrl}/api/admin/ot-approvals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: item.employeeId, date: item.date, status }),
      });
      if (!res.ok) {
        onError("Failed to save the decision");
        return;
      }
      await load();
    } catch {
      onError("Network error");
    } finally {
      setDecidingKey(null);
    }
  }

  if (!otApprovalRequired && !loading) return null;

  const visibleItems = showAll ? items : items.filter((i) => i.status === "pending");
  const statusLabel = (s: OtApprovalItem["status"]) =>
    s === "pending"
      ? dict.payroll.otApprovalsStatusPending
      : s === "approved"
        ? dict.payroll.otApprovalsStatusApproved
        : dict.payroll.otApprovalsStatusRejected;

  return (
    <Card className="overflow-hidden py-0 gap-0">
      <CardHeader className="py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{t("payroll.otApprovalsTitle")}</CardTitle>
            <CardDescription>{t("payroll.otApprovalsSubtitle")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? t("payroll.otApprovalsShowPendingOnly") : t("payroll.otApprovalsShowAll")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("common.loading")}</div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("payroll.otApprovalsNone")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="ps-5">{t("payroll.otApprovalsColEmployee")}</TableHead>
                <TableHead>{t("payroll.otApprovalsColDate")}</TableHead>
                <TableHead>{t("payroll.otApprovalsColOtHours")}</TableHead>
                <TableHead>{t("payroll.otApprovalsColStatus")}</TableHead>
                <TableHead>{t("payroll.otApprovalsColReviewedBy")}</TableHead>
                <TableHead className="pe-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => {
                const key = `${item.employeeId}|${item.date}`;
                return (
                  <TableRow key={key}>
                    <TableCell className="ps-5 font-medium">{item.employeeName}</TableCell>
                    <TableCell className="text-foreground/80">{item.date}</TableCell>
                    <TableCell className="text-foreground/80">{(item.otMinutes / 60).toFixed(1)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusStyles[item.status]}`}>
                        {statusLabel(item.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground/80">{item.reviewedBy ?? "—"}</TableCell>
                    <TableCell className="pe-5">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant={item.status === "approved" ? "secondary" : "outline"}
                          disabled={decidingKey === key}
                          onClick={() => decide(item, "approved")}
                        >
                          {t("payroll.otApprovalsApprove")}
                        </Button>
                        <Button
                          size="sm"
                          variant={item.status === "rejected" ? "secondary" : "outline"}
                          disabled={decidingKey === key}
                          onClick={() => decide(item, "rejected")}
                        >
                          {t("payroll.otApprovalsReject")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
