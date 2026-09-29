import { useEffect, useState } from "react";
import { CheckCheck, MapPin, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/contexts/LocaleContext";
import { useAdminApi } from "../../contexts/AdminApiContext";

interface RemoteRequest {
  id: string;
  employeeCode: string;
  employeeName: string;
  action: "checkin" | "checkout";
  status: "pending" | "approved" | "rejected" | "expired";
  submittedAt: string;
  photoDataUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  withinGeofence: boolean | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export default function RemoteRequestsTab() {
  const { t, locale } = useLocale();
  const { baseUrl, onError } = useAdminApi();
  const [requests, setRequests] = useState<RemoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/remote-requests`, { credentials: "include" });
      if (res.ok) setRequests((await res.json()).requests ?? []);
    } catch {
      onError(t("remoteRequests.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  async function decide(id: string, status: "approved" | "rejected", rejectionReason?: string) {
    setBusyId(id);
    try {
      const res = await fetch(`${baseUrl}/api/admin/remote-requests/${id}/decide`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!res.ok) {
        onError(t("remoteRequests.decideFailed"));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function reject(id: string) {
    const reason = prompt(t("remoteRequests.rejectPrompt")) ?? "";
    decide(id, "rejected", reason);
  }

  async function bulkApprove() {
    if (pending.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/remote-requests/bulk-approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pending.map((r) => r.id) }),
      });
      if (!res.ok) {
        onError(t("remoteRequests.decideFailed"));
        return;
      }
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  const statusBadge = (status: RemoteRequest["status"]) => {
    const styles: Record<RemoteRequest["status"], string> = {
      pending: "bg-amber-500/15 text-amber-600",
      approved: "bg-success/15 text-success",
      rejected: "bg-destructive/15 text-destructive",
      expired: "bg-muted text-muted-foreground",
    };
    const labels: Record<RemoteRequest["status"], string> = {
      pending: t("remoteRequests.statusPending"),
      approved: t("remoteRequests.statusApproved"),
      rejected: t("remoteRequests.statusRejected"),
      expired: t("remoteRequests.statusExpired"),
    };
    return <Badge variant="outline" className={`border-transparent ${styles[status]}`}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">{t("remoteRequests.title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("remoteRequests.subtitle")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? t("remoteRequests.showPendingOnly") : t("remoteRequests.showHistory")}
          </Button>
          {!showHistory && pending.length > 1 && (
            <Button size="sm" onClick={bulkApprove} disabled={bulkBusy}>
              <CheckCheck /> {t("remoteRequests.bulkApprove")} ({pending.length})
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{t("common.loading")}</div>
      ) : (showHistory ? history : pending).length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground text-sm">
            {showHistory ? t("remoteRequests.noHistory") : t("remoteRequests.noPending")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(showHistory ? history : pending).map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-2 py-3">
                <CardTitle className="text-sm">{r.employeeName}</CardTitle>
                {statusBadge(r.status)}
              </CardHeader>
              <CardContent className="space-y-3">
                {r.photoDataUrl ? (
                  <img src={r.photoDataUrl} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                ) : (
                  <div className="w-full aspect-square rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {t("remoteRequests.noPhoto")}
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    {r.action === "checkin" ? t("remoteRequests.actionCheckIn") : t("remoteRequests.actionCheckOut")}
                    {" · "}
                    {new Date(r.submittedAt).toLocaleString(dateLocale)}
                  </div>
                  {r.latitude !== null && r.longitude !== null ? (
                    <a
                      href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="w-3 h-3" /> {t("remoteRequests.viewOnMap")}
                      {r.withinGeofence === true && ` (${t("remoteRequests.insideSite")})`}
                      {r.withinGeofence === false && ` (${t("remoteRequests.outsideSite")})`}
                    </a>
                  ) : (
                    <div>{t("remoteRequests.noLocation")}</div>
                  )}
                  {r.status !== "pending" && r.reviewedBy && (
                    <div>
                      {t("remoteRequests.reviewedBy")} {r.reviewedBy}
                      {r.reviewedAt && ` · ${new Date(r.reviewedAt).toLocaleString(dateLocale)}`}
                    </div>
                  )}
                  {r.rejectionReason && <div className="text-destructive">{r.rejectionReason}</div>}
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" disabled={busyId === r.id} onClick={() => decide(r.id, "approved")}>
                      {t("remoteRequests.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive hover:text-destructive"
                      disabled={busyId === r.id}
                      onClick={() => reject(r.id)}
                    >
                      <X className="w-4 h-4" /> {t("remoteRequests.reject")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
