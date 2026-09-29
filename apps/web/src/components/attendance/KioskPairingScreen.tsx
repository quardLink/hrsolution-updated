import { useState } from "react";
import { Smartphone } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import PoweredBy from "@/components/PoweredBy";
import GlassBackdrop from "@/components/GlassBackdrop";
import PinPad from "./PinPad";
import { setDeviceToken } from "../../lib/deviceAuth";

interface Props {
  baseUrl: string;
  onPaired: () => void;
  // Both default to the kiosk's own behavior/copy — a sibling page (e.g.
  // remote check-in) passes its own token storage and title/subtitle
  // instead, since a personal phone's token must live under a different
  // localStorage key than a shared kiosk's (see remoteCheckInAuth.ts).
  onToken?: (token: string) => void;
  title?: string;
  subtitle?: string;
}

export default function KioskPairingScreen({ baseUrl, onPaired, onToken, title, subtitle }: Props) {
  const { t } = useLocale();
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
        setError(data.error || t("kiosk.pairFailed"));
        setCode("");
        return;
      }
      (onToken ?? setDeviceToken)(data.token);
      onPaired();
    } catch {
      setError(t("kiosk.pairNetworkError"));
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
      <GlassBackdrop />
      <div className="w-full max-w-sm space-y-5 relative z-10">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 dark:bg-primary/20 glass border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
            <Smartphone className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title ?? t("kiosk.pairTitle")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle ?? t("kiosk.pairSubtitle")}</p>
        </div>

        <div className="bg-card/80 dark:bg-card/45 glass border border-black/5 dark:border-white/10 rounded-2xl p-7 shadow-panel space-y-6">
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-9 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-150 ${
                  i < code.length
                    ? "bg-primary text-primary-foreground scale-105 shadow-lg shadow-primary/30"
                    : "bg-white/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-muted-foreground"
                }`}
              >
                {i < code.length ? code[i] : ""}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-destructive text-sm text-center font-medium">
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
            <div className="text-center text-primary text-sm font-medium animate-pulse">{t("kiosk.pairing")}</div>
          )}
        </div>
      </div>
      <PoweredBy />
    </div>
  );
}
