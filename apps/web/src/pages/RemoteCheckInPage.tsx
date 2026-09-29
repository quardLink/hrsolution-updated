import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, MapPin, ShieldCheck, Smartphone } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import PoweredBy from "@/components/PoweredBy";
import KioskPairingScreen from "@/components/attendance/KioskPairingScreen";
import FaceCapture from "@/components/attendance/FaceCapture";
import PinStep from "@/components/attendance/PinStep";
import { getRemoteDeviceToken, setRemoteDeviceToken, clearRemoteDeviceToken } from "@/lib/remoteCheckInAuth";

const CONSENT_KEY = "remote_checkin_consent_ack";

type Step =
  | "loading"
  | "pairing"
  | "disabled"
  | "not_enrolled"
  | "consent"
  | "ready"
  | "face"
  | "pin"
  | "submitting"
  | "result";

interface Status {
  employeeName: string;
  faceEnrolled: boolean;
  remoteCheckInMode: "disabled" | "requires_approval" | "auto_approve";
  nextAction: "checkin" | "checkout";
}

export default function RemoteCheckInPage() {
  const { t, dir } = useLocale();
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState<Status | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ status: "approved" | "pending"; action: "checkin" | "checkout" } | null>(null);

  async function loadStatus() {
    const token = getRemoteDeviceToken();
    if (!token) {
      setStep("pairing");
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/remote/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        clearRemoteDeviceToken();
        setStep("pairing");
        return;
      }
      if (!res.ok) {
        setStep("pairing");
        return;
      }
      const data: Status = await res.json();
      setStatus(data);
      if (data.remoteCheckInMode === "disabled") {
        setStep("disabled");
      } else if (!data.faceEnrolled) {
        setStep("not_enrolled");
      } else if (localStorage.getItem(CONSENT_KEY) !== "1") {
        setStep("consent");
      } else {
        setStep("ready");
      }
    } catch {
      setStep("pairing");
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setLocationDenied(true), // best-effort — denied/unavailable just submits without it
      { timeout: 8000, maximumAge: 60000 },
    );
  }

  function startPunch() {
    setError("");
    setLocationDenied(false);
    requestLocation(); // kicked off in parallel with face capture, not blocking it
    setStep("face");
  }

  function handleFaceCaptured(descriptor: number[], photo?: string) {
    setFaceDescriptor(descriptor);
    setPhotoDataUrl(photo);
    setStep("pin");
  }

  async function submit(finalPin: string) {
    setStep("submitting");
    const token = getRemoteDeviceToken();
    try {
      const res = await fetch(`${baseUrl}/api/remote/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pin: finalPin,
          faceDescriptor,
          photoDataUrl,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t("remote.submitFailed"));
        setPin("");
        setStep("pin");
        return;
      }
      setResult({ status: data.status, action: data.action });
      setStep("result");
    } catch {
      setError(t("remote.networkError"));
      setPin("");
      setStep("pin");
    }
  }

  function handleDigit(digit: string) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) submit(next);
  }

  function done() {
    setPin("");
    setFaceDescriptor(null);
    setPhotoDataUrl(undefined);
    setCoords(null);
    setLocationDenied(false);
    setResult(null);
    loadStatus();
  }

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />

      {step === "loading" && <div className="text-muted-foreground text-sm">{t("common.loading")}</div>}

      {step === "pairing" && (
        <KioskPairingScreen
          baseUrl={baseUrl}
          onToken={(token) => setRemoteDeviceToken(token)}
          onPaired={loadStatus}
          title={t("remote.pairTitle")}
          subtitle={t("remote.pairSubtitle")}
        />
      )}

      {step === "disabled" && (
        <InfoCard icon={Smartphone} title={t("remote.disabledTitle")} body={t("remote.disabledBody")} />
      )}

      {step === "not_enrolled" && (
        <InfoCard icon={ShieldCheck} title={t("remote.notEnrolledTitle")} body={t("remote.notEnrolledBody")} />
      )}

      {step === "consent" && (
        <div className="w-full max-w-sm space-y-5 relative">
          <div className="bg-card border border-border rounded-2xl p-7 shadow-panel space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">{t("remote.consentTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("remote.consentBody")}</p>
            <button
              onClick={() => {
                localStorage.setItem(CONSENT_KEY, "1");
                setStep("ready");
              }}
              className="w-full py-3 text-sm font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-xl"
            >
              {t("remote.consentAgree")}
            </button>
          </div>
        </div>
      )}

      {step === "ready" && status && (
        <div className="w-full max-w-sm space-y-5 relative text-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-panel space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
              <Clock3 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">{status.employeeName}</p>
              <h1 className="text-xl font-bold text-foreground mt-1">
                {status.nextAction === "checkin" ? t("remote.readyCheckIn") : t("remote.readyCheckOut")}
              </h1>
            </div>
            <button
              onClick={startPunch}
              className="w-full py-4 text-base font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-xl"
            >
              {status.nextAction === "checkin" ? t("kiosk.checkIn") : t("kiosk.checkOut")}
            </button>
          </div>
        </div>
      )}

      {step === "face" && (
        <FaceCapture
          employeeName={status?.employeeName}
          error={error}
          capturePhoto
          onCaptured={handleFaceCaptured}
          onBack={() => setStep("ready")}
        />
      )}

      {step === "pin" && (
        <PinStep
          employeeName={status?.employeeName}
          pin={pin}
          pinError={error}
          isSubmitting={false}
          onBack={() => setStep("face")}
          onDigit={handleDigit}
          onClear={() => setPin("")}
          onBackspace={() => setPin((p) => p.slice(0, -1))}
        />
      )}

      {step === "submitting" && <div className="text-primary text-sm font-medium animate-pulse">{t("kiosk.verifying")}</div>}

      {step === "result" && result && (
        <div className="w-full max-w-sm space-y-5 relative">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-panel text-center space-y-5">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                result.status === "approved" ? "bg-emerald-500/15" : "bg-amber-500/15"
              }`}
            >
              {result.status === "approved" ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              ) : (
                <Clock3 className="w-10 h-10 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
                {result.action === "checkin" ? t("kiosk.sessionMorning") : t("kiosk.sessionEvening")}
              </p>
              <h3 className="text-xl font-bold text-foreground mt-1">
                {result.status === "approved" ? t("remote.resultApproved") : t("remote.resultPending")}
              </h3>
            </div>
            {result.status === "pending" && (
              <p className="text-muted-foreground text-xs">{t("remote.resultPendingHint")}</p>
            )}
          </div>
          <button
            onClick={done}
            className="w-full bg-card border border-border rounded-2xl py-4 text-foreground font-semibold hover:border-primary/50 transition-colors"
          >
            {t("kiosk.doneReturn")}
          </button>
        </div>
      )}

      {(step === "face" || step === "pin") && locationDenied && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t("remote.locationOptionalHint")}
          </span>
        </div>
      )}

      <PoweredBy />
    </div>
  );
}

function InfoCard({ icon: Icon, title, body }: { icon: typeof Smartphone; title: string; body: string }) {
  return (
    <div className="w-full max-w-sm space-y-5 relative text-center">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-panel space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
    </div>
  );
}
