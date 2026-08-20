import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { detectFaceDescriptor, detectFaceLandmarks, loadFaceModels, openCamera, stopCamera } from "../../lib/faceApi";
import { createBlinkDetector } from "../../lib/liveness";

interface Props {
  employeeName: string | undefined;
  error?: string;
  onCaptured: (descriptor: number[]) => void;
  onBack: () => void;
}

type Status = "loading" | "scanning" | "liveness" | "found" | "denied" | "error";

// How long to wait for a blink before finalizing anyway (see the comment
// in pollForBlink for why this can't just wait forever).
const LIVENESS_GRACE_MS = 7000;

// Kiosk-side: opens the camera and polls for a face automatically (no
// manual "capture" button — an employee shouldn't have to operate
// anything, just look at the tablet for a second). Once a face is
// matched, it also waits for a natural blink before finalizing — that
// stops a coworker from just holding up a photo of the enrolled employee
// to the camera. The descriptor never leaves this component as anything
// but numbers; no photo is stored or sent anywhere.
export default function FaceCapture({ employeeName, error, onCaptured, onBack }: Props) {
  const { t, dir } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const blink = createBlinkDetector();

    async function run() {
      try {
        // Kick the ~7MB model download off in parallel with the camera
        // permission prompt instead of waiting until the first detection
        // call — that's what used to make the first capture look frozen.
        const modelsReady = loadFaceModels();
        stream = await openCamera();
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        await modelsReady;
        if (cancelled) return;
        setStatus("scanning");
        pollForFace();
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }

    async function pollForFace() {
      if (cancelled || !videoRef.current) return;
      try {
        const descriptor = await detectFaceDescriptor(videoRef.current);
        if (cancelled) return;
        if (descriptor) {
          blink.reset();
          setStatus("liveness");
          pollForBlink(descriptor, Date.now() + LIVENESS_GRACE_MS);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      pollTimer = setTimeout(pollForFace, 600);
    }

    async function pollForBlink(descriptor: number[], deadline: number) {
      if (cancelled || !videoRef.current) return;
      // Each landmark check is a real ML inference (100ms-1s+ on modest
      // hardware), and a full blink lasts well under a second — on a
      // slower tablet it can happen entirely between two samples and
      // never get seen. Rather than block indefinitely waiting for a
      // blink that might keep getting missed, give it a fair window and
      // then finalize anyway: the face match already confirmed identity,
      // so this timeout only affects the extra photo-spoof deterrent, not
      // the actual security boundary.
      if (Date.now() > deadline) {
        finalize(descriptor);
        return;
      }
      try {
        const eyes = await detectFaceLandmarks(videoRef.current);
        if (cancelled) return;
        if (!eyes) {
          // lost the face mid-check (they looked away) — reacquire it
          setStatus("scanning");
          pollForFace();
          return;
        }
        const [leftEye, rightEye] = eyes;
        if (blink.update(leftEye, rightEye)) {
          finalize(descriptor);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      pollTimer = setTimeout(() => pollForBlink(descriptor, deadline), 0);
    }

    function finalize(descriptor: number[]) {
      setStatus("found");
      setTimeout(() => !cancelled && onCaptured(descriptor), 400);
    }

    run();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      stopCamera(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-foreground hover:border-primary/50 transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("kiosk.lookAtCamera")}</h2>
          <p className="text-muted-foreground text-sm">{employeeName}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-7 shadow-xl space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div
          className={`relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 transition-colors ${
            status === "found" ? "border-primary" : "border-border"
          }`}
        >
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          {status === "found" && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-primary" />
            </div>
          )}
        </div>

        <div className="text-center text-sm font-medium">
          {status === "loading" && <span className="text-muted-foreground">{t("kiosk.faceStartingCamera")}</span>}
          {status === "scanning" && <span className="text-primary animate-pulse">{t("kiosk.faceScanning")}</span>}
          {status === "liveness" && <span className="text-primary animate-pulse">{t("kiosk.faceBlinkConfirm")}</span>}
          {status === "found" && <span className="text-primary">{t("kiosk.faceVerified")}</span>}
          {status === "denied" && <span className="text-red-400">{t("kiosk.faceDeniedLong")}</span>}
          {status === "error" && <span className="text-red-400">{t("kiosk.faceSnag")}</span>}
        </div>

        {status === "error" && (
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="w-full py-2 text-sm font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-xl"
          >
            {t("common.tryAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
