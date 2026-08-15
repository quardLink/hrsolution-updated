import { Link } from "wouter";
import Clock from "../components/attendance/Clock";
import ReminderBanner from "../components/attendance/ReminderBanner";
import ActionStep from "../components/attendance/ActionStep";
import EmployeeStep from "../components/attendance/EmployeeStep";
import PinStep from "../components/attendance/PinStep";
import ResultStep from "../components/attendance/ResultStep";
import { SESSION_LABELS, useAttendanceWizard } from "../hooks/useAttendanceWizard";
import { useCheckOutReminder } from "../hooks/useCheckOutReminder";

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
    logAttendanceMutation,
    handleActionSelect,
    handleEmployeeSelect,
    handlePinDigit,
    handlePinClear,
    handlePinBackspace,
    handleReset,
  } = useAttendanceWizard();

  const { reminder, dismiss } = useCheckOutReminder();

  if (step === "splash") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] relative">
        <Link
          href="/admin"
          className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium text-blue-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
        >
          🔐 Admin
        </Link>
        <div
          className="flex flex-col items-center gap-8"
          style={{ animation: "fadeIn 1s ease-out forwards" }}
        >
          <div className="relative">
            <div className="w-40 h-40 rounded-2xl bg-white backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl p-3">
              <img src="/logo.jpg" alt="PST Logo" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">✓</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">Petro Safe Tech</h1>
            <p className="text-blue-300 mt-2 text-lg">Employee Attendance System</p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-blue-400"
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] flex flex-col relative">
      <Link
        href="/admin"
        className="absolute top-4 right-4 px-3 py-1.5 text-xs font-medium text-blue-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors z-40"
      >
        🔐 Admin
      </Link>
      {reminder && <ReminderBanner reminder={reminder} onDismiss={dismiss} />}

      <header className="pt-6 pb-4 px-6 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1">
            <img src="/logo.jpg" alt="PST Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Petro Safe Tech</h1>
        </div>
        <Clock />
        <div className="px-4 py-1.5 bg-white/10 border border-white/20 rounded-full">
          <span className="text-blue-200 text-sm font-medium">
            {step === "action" ? timeOfDay : SESSION_LABELS[session]}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
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
