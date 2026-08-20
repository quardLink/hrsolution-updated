import { useState, type ReactNode } from "react";
import { playChime } from "../lib/chime";
import EmployeesTab from "../components/admin/EmployeesTab";
import SettingsTab from "../components/admin/SettingsTab";
import LeaveRequestsTab from "../components/admin/LeaveRequestsTab";
import PayrollTab from "../components/admin/PayrollTab";
import AdminShell, { type AdminView } from "../components/admin/AdminShell";
import TodayTab from "../components/admin/TodayTab";
import AdminLoginScreen from "../components/admin/AdminLoginScreen";
import ReportFilters from "../components/admin/reports/ReportFilters";
import RankingsView from "../components/admin/reports/RankingsView";
import AttendanceSummaryView from "../components/admin/reports/AttendanceSummaryView";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { useAttendanceAnalytics } from "../hooks/useAttendanceAnalytics";
import { exportAttendanceReportPdf } from "../lib/pdf/attendanceReport";
import { AdminApiProvider } from "../contexts/AdminApiContext";
import { LocaleProvider, useLocale } from "../contexts/LocaleContext";

export default function AdminPage() {
  const [view, setView] = useState<AdminView>("today");
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const {
    checkingSession,
    authed,
    authError,
    loginLoading,
    org,
    logs,
    employees,
    loading,
    error,
    setError,
    fetchLogs,
    handleLogin,
    handleLogout,
  } = useAdminAuth(baseUrl);

  const {
    filterEmployee,
    setFilterEmployee,
    filterFromDate,
    setFilterFromDate,
    filterToDate,
    setFilterToDate,
    summary,
    totalDaysInPeriod,
    rankings,
    stats,
  } = useAttendanceAnalytics(logs, employees);

  if (checkingSession) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!authed) {
    return <AdminLoginScreen authError={authError} loading={loginLoading} onSubmit={handleLogin} />;
  }

  const isReportView = view === "rankings" || view === "summary";

  return (
    <LocaleProvider>
      <AdminApiProvider value={{ baseUrl, onError: setError }}>
        <AdminShell
          view={view}
          onViewChange={setView}
          onLogout={handleLogout}
          onRefresh={fetchLogs}
          onTestSound={() => playChime()}
          loading={loading}
          orgName={org?.name}
          logoDataUrl={org?.logoDataUrl}
        >
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-red-400 rounded-xl p-3 lg:p-4 text-sm">
              {error}
            </div>
          )}

          {view === "today" && <TodayTab logs={logs} employees={employees} />}

          {isReportView && (
            <ReportSection view={view}>
              <ReportFilters
                stats={stats}
                filterFromDate={filterFromDate}
                onFilterFromDateChange={setFilterFromDate}
                filterToDate={filterToDate}
                onFilterToDateChange={setFilterToDate}
                filterEmployee={filterEmployee}
                onFilterEmployeeChange={setFilterEmployee}
                employees={employees}
                onExportPdf={() =>
                  exportAttendanceReportPdf({ stats, rankings, summary, filterFromDate, filterToDate })
                }
              />

              {view === "rankings" && (
                <RankingsView rankings={rankings} totalDaysInPeriod={totalDaysInPeriod} />
              )}

              {view === "summary" && <AttendanceSummaryView summary={summary} loading={loading} />}
            </ReportSection>
          )}

          {view === "employees" && <EmployeesTab />}

          {view === "leave" && <LeaveRequestsTab />}

          {view === "payroll" && <PayrollTab />}

          {view === "settings" && <SettingsTab />}
        </AdminShell>
      </AdminApiProvider>
    </LocaleProvider>
  );
}

function ReportSection({ view, children }: { view: AdminView; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="space-y-5 lg:space-y-6">
      <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">
        {view === "rankings" ? t("nav.rankings") : t("nav.records")}
      </h1>
      {children}
    </div>
  );
}
