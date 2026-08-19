import { Link } from "wouter";
import Clock from "../components/attendance/Clock";
import ReminderBanner from "../components/attendance/ReminderBanner";
import ActionStep from "../components/attendance/ActionStep";
import EmployeeStep from "../components/attendance/EmployeeStep";
import PinStep from "../components/attendance/PinStep";
import ResultStep from "../components/attendance/ResultStep";
import StepProgress from "../components/attendance/StepProgress";
import KioskPairingScreen from "../components/attendance/KioskPairingScreen";
import { SESSION_LABELS, useAttendanceWizard } from "../hooks/useAttendanceWizard";
import { useCheckOutReminder } from "../hooks/useCheckOutReminder";
import { useOrgInfo } from "../hooks/useOrgInfo";

function KioskGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-100 h-100 rounded-full bg-violet-600/10 blur-[100px]" />
    </div>
  );
}

export default function AttendancePage() {
  const {
    step,
    setStep,
    session,
    timeOfDay,
    selectedEmployeeId,
    pin,
    pinError,
    result,
    employees,
    devicePaired,
    logAttendanceMutation,
    handleActionSelect,
    handleEmployeeSelect,
    handlePinDigit,
    handlePinClear,
    handlePinBackspace,
    handleReset,
  } = useAttendanceWizard();

  const { reminder, dismiss } = useCheckOutReminder();
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const org = useOrgInfo(baseUrl, devicePaired);

  if (step !== "splash" && !devicePaired) {
    return <KioskPairingScreen baseUrl={baseUrl} onPaired={() => window.location.reload()} />;
  }

  if (step === "splash") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        <KioskGlow />
        <Link
          href="/admin"
          className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:text-foreground hover:border-primary/40 transition-colors"
        >
          🔐 Admin
        </Link>
        <div
          className="flex flex-col items-center gap-8 relative"
          style={{ animation: "fadeIn 1s ease-out forwards" }}
        >
          <div className="relative">
            <div className="w-40 h-40 rounded-2xl bg-white border border-border flex items-center justify-center shadow-2xl p-3">
              {org?.logoDataUrl ? (
                <img src={org.logoDataUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-5xl">🏢</span>
              )}
            </div>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-lg">✓</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">{org?.name || "Attendance Kiosk"}</h1>
            <p className="text-muted-foreground mt-2 text-lg">Employee Attendance System</p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary"
                style={{ animation: `pulse 1.5s ${i * 0.3}s ease-in-out infinite` }}
              />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes fadeIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <KioskGlow />
      {reminder && <ReminderBanner reminder={reminder} onDismiss={dismiss} />}

      <header className="px-6 lg:px-10 pt-5 pb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 relative">
        <div className="flex items-center gap-3">
          {org?.logoDataUrl && (
            <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center p-1 flex-shrink-0">
              <img src={org.logoDataUrl} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight leading-none whitespace-nowrap">
              {org?.name || "Attendance Kiosk"}
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              {step === "action" ? timeOfDay : SESSION_LABELS[session]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <Clock />
          <Link
            href="/admin"
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:text-foreground hover:border-primary/40 transition-colors"
          >
            🔐 Admin
          </Link>
        </div>
      </header>

      <div className="px-6 lg:px-10 pb-2 flex justify-center relative">
        <StepProgress step={step} />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 relative">
        {step === "action" && <ActionStep onSelect={handleActionSelect} />}

        {step === "employee" && (
          <EmployeeStep
            sessionLabel={SESSION_LABELS[session]}
            employees={employees}
            onBack={() => setStep("action")}
            onSelect={handleEmployeeSelect}
          />
        )}

        {step === "pin" && (
          <PinStep
            employeeName={employees?.find((e) => e.id === selectedEmployeeId)?.name}
            pin={pin}
            pinError={pinError}
            isSubmitting={logAttendanceMutation.isPending}
            onBack={() => {
              setStep("employee");
              handlePinClear();
            }}
            onDigit={handlePinDigit}
            onClear={handlePinClear}
            onBackspace={handlePinBackspace}
          />
        )}

        {step === "result" && result && (
          <ResultStep
            sessionLabel={SESSION_LABELS[session]}
            employeeName={result.employeeName}
            timestamp={result.timestamp}
            onDone={handleReset}
          />
        )}
      </main>
    </div>
  );
}
