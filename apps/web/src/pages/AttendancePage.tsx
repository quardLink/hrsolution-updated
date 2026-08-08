import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListEmployees, useLogAttendance } from "@workspace/api-client";
import { playChime } from "../lib/chime";

type Step = "splash" | "action" | "employee" | "pin" | "result";
type Action = "checkin" | "checkout";

// Simplified: only two sessions — morning check-in and evening check-out
type Session = "morning" | "evening";

const SESSION_LABELS: Record<Session, string> = {
  morning: "Morning Check-In",
  evening: "Evening Check-Out",
};

function getSessionForAction(action: Action): Session {
  return action === "checkin" ? "morning" : "evening";
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// Reminder times (Saudi local time on the office computer)
// Only one reminder now — at 7:00 PM, to remind employees to check out before going home.
const REMINDER_TIMES = [
  { hour: 19, minute: 0, label: "Time to Check Out", message: "Don't forget to check out before leaving the office" },
];

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <div className="text-4xl font-bold tabular-nums text-white tracking-wider">
        {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-blue-200 text-sm mt-1">
        {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [step, setStep] = useState<Step>("splash");
  const [action, setAction] = useState<Action>("checkin");
  const [session, setSession] = useState<Session>("morning");
  const [timeOfDay, setTimeOfDay] = useState<string>(getTimeOfDay);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [result, setResult] = useState<{ message: string; status: string; employeeName: string; timestamp: string } | null>(null);
  const [reminder, setReminder] = useState<{ label: string; message: string } | null>(null);

  const { data: employees } = useListEmployees();
  const logAttendanceMutation = useLogAttendance();

  // Splash screen auto-advance
  useEffect(() => {
    const timer = setTimeout(() => setStep("action"), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-return to home after result is shown (7 seconds)
  useEffect(() => {
    if (step === "result") {
      const timer = setTimeout(() => handleReset(), 7000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step]);

  // Refresh time-of-day label every minute
  useEffect(() => {
    const id = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Check-out reminder alerts (sound + banner) at scheduled times
  useEffect(() => {
    const firedKeys = new Set<string>();
    const checkAndFire = () => {
      const now = new Date();
      const todayKey = now.toDateString();
      for (const r of REMINDER_TIMES) {
        const key = `${todayKey}_${r.hour}_${r.minute}`;
        if (firedKeys.has(key)) continue;
        if (now.getHours() === r.hour && now.getMinutes() === r.minute) {
          firedKeys.add(key);
          playChime();
          setReminder({ label: r.label, message: r.message });
          // Auto-dismiss banner after 60 seconds
          setTimeout(() => setReminder(null), 60 * 1000);
        }
      }
    };
    const id = setInterval(checkAndFire, 30 * 1000);
    checkAndFire();
    return () => clearInterval(id);
  }, []);

  function handleActionSelect(a: Action) {
    setAction(a);
    setSession(getSessionForAction(a));
    setStep("employee");
  }

  function handleEmployeeSelect(id: string) {
    setSelectedEmployeeId(id);
    setPin("");
    setPinError("");
    setStep("pin");
  }

  function handlePinDigit(digit: string) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      submitAttendance(newPin);
    }
  }

  function handlePinClear() {
    setPin("");
    setPinError("");
  }

  function handlePinBackspace() {
    setPin((p) => p.slice(0, -1));
    setPinError("");
  }

  async function submitAttendance(finalPin: string) {
    setPinError("");
    const currentSession = getSessionForAction(action);
    setSession(currentSession);
    try {
      const data = await logAttendanceMutation.mutateAsync({
        data: {
          employeeId: selectedEmployeeId,
          pin: finalPin,
          action,
          session: currentSession,
        },
      });
      setResult({
        message: data.message,
        status: data.status,
        employeeName: data.employeeName,
        timestamp: data.timestamp,
      });
      setStep("result");
    } catch (err: unknown) {
      let msg = "Something went wrong. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error) msg = response.data.error;
      }
      setPinError(msg);
      setPin("");
    }
  }

  function handleReset() {
    setTimeOfDay(getTimeOfDay());
    setStep("action");
    setSelectedEmployeeId("");
    setPin("");
    setPinError("");
    setResult(null);
  }

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
      {reminder && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 shadow-2xl flex items-center justify-between gap-4"
          style={{ animation: "slideDown 0.4s ease-out, pulseGlow 1.5s ease-in-out infinite alternate" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">🔔</span>
            <div>
              <div className="font-bold text-lg">{reminder.label}</div>
              <div className="text-sm opacity-95">{reminder.message}</div>
            </div>
          </div>
          <button
            onClick={() => { setReminder(null); playChime(); }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm border border-white/30"
          >
            Dismiss
          </button>
          <style>{`
            @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
            @keyframes pulseGlow { from { box-shadow: 0 4px 20px rgba(251,146,60,0.5); } to { box-shadow: 0 4px 40px rgba(251,146,60,0.9); } }
          `}</style>
        </div>
      )}

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
        {step === "action" && (
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">What would you like to do?</h2>
              <p className="text-blue-300 mt-1 text-sm">Check in when you arrive, check out when you leave</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleActionSelect("checkin")}
                className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-xl border border-white/10 hover:scale-105 transition-all duration-200 cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-3xl">
                    ☀️
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">Check In</div>
                    <div className="text-gray-500 text-sm mt-0.5">Mark your arrival in the morning</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleActionSelect("checkout")}
                className="group relative overflow-hidden bg-white rounded-2xl p-6 shadow-xl border border-white/10 hover:scale-105 transition-all duration-200 cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center text-3xl">
                    🌙
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">Check Out</div>
                    <div className="text-gray-500 text-sm mt-0.5">Mark your departure when leaving</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "employee" && (
          <div className="w-full max-w-sm space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("action")}
                className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Select Your Name</h2>
                <p className="text-blue-300 text-sm">{SESSION_LABELS[session]}</p>
              </div>
            </div>
            <div className="space-y-2">
              {employees?.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleEmployeeSelect(emp.id)}
                  className="w-full bg-white rounded-xl p-4 flex items-center gap-3 shadow-lg hover:scale-105 transition-all duration-150 cursor-pointer text-left border border-transparent hover:border-blue-200"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {emp.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{emp.name}</div>
                    <div className="text-gray-400 text-xs">{emp.id}</div>
                  </div>
                </button>
              ))}
              {!employees && (
                <div className="text-center text-blue-300 py-8">Loading employees...</div>
              )}
            </div>
          </div>
        )}

        {step === "pin" && (
          <div className="w-full max-w-xs space-y-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep("employee"); setPin(""); setPinError(""); }}
                className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                ←
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">Enter Your PIN</h2>
                <p className="text-blue-300 text-sm">
                  {employees?.find((e) => e.id === selectedEmployeeId)?.name}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex justify-center gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-150 ${
                      i < pin.length
                        ? "bg-blue-600 border-blue-600 text-white scale-105"
                        : "bg-gray-50 border-gray-200 text-gray-300"
                    }`}
                  >
                    {i < pin.length ? "•" : ""}
                  </div>
                ))}
              </div>

              {pinError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center font-medium">
                  {pinError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {["1","2","3","4","5","6","7","8","9"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handlePinDigit(d)}
                    disabled={logAttendanceMutation.isPending}
                    className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xl hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={handlePinClear}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all"
                >
                  CLR
                </button>
                <button
                  onClick={() => handlePinDigit("0")}
                  disabled={logAttendanceMutation.isPending}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xl hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all disabled:opacity-50"
                >
                  0
                </button>
                <button
                  onClick={handlePinBackspace}
                  className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-lg hover:bg-gray-100 active:scale-95 transition-all"
                >
                  ⌫
                </button>
              </div>

              {logAttendanceMutation.isPending && (
                <div className="text-center text-blue-600 text-sm font-medium animate-pulse">
                  Verifying...
                </div>
              )}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="w-full max-w-sm space-y-5">
            <div className="bg-white rounded-2xl p-8 shadow-xl text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mx-auto">
                ✅
              </div>

              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
                  {SESSION_LABELS[session]}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{result.employeeName}</h3>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-emerald-700 text-sm font-semibold">Attendance Recorded Successfully</p>
              </div>

              <div className="text-gray-400 text-xs">
                Logged at {result.timestamp}
              </div>

              <p className="text-gray-400 text-xs">Returning to home in a few seconds…</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 text-white font-semibold hover:bg-white/20 transition-colors"
            >
              Done — Return to Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
