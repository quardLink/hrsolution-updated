import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { formatDate, formatTime, getDateKey, parseTimestamp } from "../../../lib/attendance";
import { AUTH_LABEL_KEYS, sourceForAuthType } from "../../../lib/attendanceAuth";
import type { LogEntry } from "../../../hooks/useAdminAuth";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  employeeName: string;
  logs: LogEntry[];
}

// Every raw punch for one employee, independent of whatever date range
// Records itself is currently filtered to — this is meant to help trace a
// specific day's data (e.g. verify the Bug 1/2 timestamp fixes), so it
// deliberately isn't tied to the outer page's filters.
export default function LogTrailDialog({ open, onOpenChange, employeeId, employeeName, logs }: Props) {
  const { t, locale } = useLocale();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  const rows = useMemo(() => {
    if (!employeeId) return [];
    return logs
      .filter((l) => l.employeeId === employeeId)
      .map((l) => ({ ...l, dateObj: parseTimestamp(l.timestamp) }))
      .filter((l): l is typeof l & { dateObj: Date } => {
        if (!l.dateObj) return false;
        const key = getDateKey(l.dateObj);
        if (fromDate && key < fromDate) return false;
        if (toDate && key > toDate) return false;
        return true;
      })
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [logs, employeeId, fromDate, toDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{employeeName}</DialogTitle>
          <DialogDescription>{t("reports.logTrailSubtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 items-end shrink-0">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("reports.fromDate")}</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("reports.toDate")}</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">{t("reports.logTrailNone")}</div>
        ) : (
          <div className="space-y-1.5 overflow-y-auto -mx-1 px-1">
            {rows.map((l, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {l.dateObj.toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {formatTime(l.dateObj)}
                    {" · "}
                    <span className={l.action === "checkin" ? "text-emerald-500" : "text-blue-500"}>
                      {l.action === "checkin" ? t("reports.logTrailCheckIn") : t("reports.logTrailCheckOut")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(AUTH_LABEL_KEYS[l.authType] ?? "reports.authPin")}
                    {l.deviceName ? ` · ${l.deviceName}` : ""}
                    {" · "}
                    {(() => {
                      const source = sourceForAuthType(l.authType);
                      if (source === "kiosk") return t("reports.sourceKiosk");
                      if (source === "remote") return t("reports.sourceRemote");
                      return t("reports.sourceTerminal");
                    })()}
                  </div>
                </div>
                {l.syncedLate && (
                  <Badge variant="outline" className="border-transparent bg-amber-500/10 text-amber-500 shrink-0 whitespace-nowrap">
                    {t("reports.syncedLate")}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
