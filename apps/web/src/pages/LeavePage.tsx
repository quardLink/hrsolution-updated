import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Palmtree, Languages } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import LeaveRequestForm from "../components/leave/LeaveRequestForm";
import LeaveRequestSuccess, { type LeaveRequestSuccessData } from "../components/leave/LeaveRequestSuccess";

interface PublicEmployee {
  id: string;
  name: string;
}

export default function LeavePage() {
  const { t, dir, locale, setLocale } = useLocale();
  const baseUrl = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ""), []);
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [orgName, setOrgName] = useState<string>("");
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LeaveRequestSuccessData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leave/employees?org=${encodeURIComponent(orgSlug)}`);
        if (!res.ok) throw new Error("Failed to load employees");
        const data = await res.json();
        if (!cancelled) {
          setEmployees(data.employees ?? []);
          setOrgName(data.orgName ?? "");
        }
      } catch {
        if (!cancelled) setLoadError(t("leavePublic.couldNotLoad"));
      } finally {
        if (!cancelled) setLoadingEmps(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, orgSlug]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} /> {t("leavePublic.backToAttendance")}
          </Link>
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="px-2.5 py-1 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:text-foreground hover:border-primary/40 transition-colors inline-flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5" /> {locale === "en" ? "العربية" : "English"}
          </button>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Palmtree className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{t("leavePublic.title")}</h1>
                {orgName && <p className="text-xs text-white/80 mt-0.5">{orgName}</p>}
              </div>
            </div>
          </div>

          {success ? (
            <LeaveRequestSuccess success={success} onReset={() => setSuccess(null)} />
          ) : (
            <LeaveRequestForm
              baseUrl={baseUrl}
              orgSlug={orgSlug}
              employees={employees}
              loadingEmps={loadingEmps}
              loadError={loadError}
              onSuccess={setSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
