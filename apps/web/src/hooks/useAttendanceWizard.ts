import { useEffect, useState } from "react";
import { useListEmployees, useLogAttendance } from "@workspace/api-client";
import { isDeviceNotPaired } from "../lib/deviceAuth";

export type Step = "splash" | "action" | "employee" | "pin" | "result";
export type Action = "checkin" | "checkout";

// Simplified: only two sessions — morning check-in and evening check-out
export type Session = "morning" | "evening";

export const SESSION_LABELS: Record<Session, string> = {
  morning: "Morning Check-In",
  evening: "Evening Check-Out",
};

export interface EmployeeOption {
  id: string;
  name: string;
}

export interface AttendanceResult {
  message: string;
  status: string;
  employeeName: string;
  timestamp: string;
}

function getSessionForAction(action: Action): Session {
  return action === "checkin" ? "morning" : "evening";
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function useAttendanceWizard() {
  const [step, setStep] = useState<Step>("splash");
  const [action, setAction] = useState<Action>("checkin");
  const [session, setSession] = useState<Session>("morning");
  const [timeOfDay, setTimeOfDay] = useState<string>(getTimeOfDay);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [result, setResult] = useState<AttendanceResult | null>(null);

  const { data: employees, error: employeesError } = useListEmployees();
  const logAttendanceMutation = useLogAttendance();

  const devicePaired = !isDeviceNotPaired(employeesError);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Refresh time-of-day label every minute
  useEffect(() => {
    const id = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
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
      if (err && typeof err === "object") {
        const data = (err as { data?: { error?: string } }).data;
        if (data?.error) msg = data.error;
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

  return {
    step,
    setStep,
    action,
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
  };
}
