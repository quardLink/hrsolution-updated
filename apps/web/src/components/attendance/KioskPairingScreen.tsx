import { useState } from "react";
import PinPad from "./PinPad";
import { setDeviceToken } from "../../lib/deviceAuth";

interface Props {
  baseUrl: string;
  onPaired: () => void;
}

export default function KioskPairingScreen({ baseUrl, onPaired }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(finalCode: string) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${baseUrl}/api/devices/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: finalCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Pairing failed");
        setCode("");
        return;
      }
      setDeviceToken(data.token);
      onPaired();
    } catch {
      setError("Network error. Please try again.");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDigit(digit: string) {
    if (code.length >= 6) return;
    const next = code + digit;
    setCode(next);
    if (next.length === 6) submit(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <div className="w-full max-w-sm space-y-5 relative">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center text-3xl mb-4">
            📱
          </div>
          <h1 className="text-xl font-bold text-foreground">Pair This Kiosk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter the 6-digit code from Settings → Kiosk Devices in the admin dashboard.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-7 shadow-xl space-y-6">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-9 h-11 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all duration-150 ${
                  i < code.length
                    ? "bg-primary border-primary text-primary-foreground scale-105"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {i < code.length ? code[i] : ""}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <PinPad
            onDigit={handleDigit}
            onClear={() => setCode("")}
            onBackspace={() => setCode((c) => c.slice(0, -1))}
            digitsDisabled={submitting}
          />

          {submitting && (
            <div className="text-center text-primary text-sm font-medium animate-pulse">Pairing...</div>
          )}
        </div>
      </div>
    </div>
  );
}
