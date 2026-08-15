import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import LeaveRequestForm from "../components/leave/LeaveRequestForm";
import LeaveRequestSuccess, { type LeaveRequestSuccessData } from "../components/leave/LeaveRequestSuccess";

interface PublicEmployee {
  id: string;
  name: string;
}

export default function LeavePage() {
  const baseUrl = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ""), []);

  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<LeaveRequestSuccessData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/leave/employees`);
        if (!res.ok) throw new Error("Failed to load employees");
        const data = await res.json();
        if (!cancelled) setEmployees(data.employees ?? []);
      } catch {
        if (!cancelled) setLoadError("Could not load employee list. Please refresh.");
      } finally {
        if (!cancelled) setLoadingEmps(false);
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-6 sm:py-12">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to attendance
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-5 sm:px-6 py-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl">
                🏖️
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">Leave Request</h1>
                <p className="text-xs text-blue-100 mt-0.5">Petro Safe Tech · Saudi Arabia</p>
              </div>
            </div>
          </div>

          {success ? (
            <LeaveRequestSuccess success={success} onReset={() => setSuccess(null)} />
          ) : (
            <LeaveRequestForm
              baseUrl={baseUrl}
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
