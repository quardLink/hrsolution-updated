import { useEffect, useRef, useState } from "react";
import { detectFaceDescriptor, detectFaceLandmarks, loadFaceModels, openCamera, stopCamera } from "../../lib/faceApi";
import { createBlinkDetector } from "../../lib/liveness";

interface Props {
  employeeName: string | undefined;
  error?: string;
  onCaptured: (descriptor: number[]) => void;
  onBack: () => void;
}

type Status = "loading" | "scanning" | "liveness" | "found" | "denied" | "error";

// Kiosk-side: opens the camera and polls for a face automatically (no
// manual "capture" button — an employee shouldn't have to operate
// anything, just look at the tablet for a second). Once a face is
// matched, it also waits for a natural blink before finalizing — that
// stops a coworker from just holding up a photo of the enrolled employee
// to the camera. The descriptor never leaves this component as anything
// but numbers; no photo is stored or sent anywhere.
export default function FaceCapture({ employeeName, error, onCaptured, onBack }: Props) {
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
          pollForBlink(descriptor);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      pollTimer = setTimeout(pollForFace, 600);
    }

    async function pollForBlink(descriptor: number[]) {
      if (cancelled || !videoRef.current) return;
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
          setStatus("found");
          setTimeout(() => !cancelled && onCaptured(descriptor), 400);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      pollTimer = setTimeout(() => pollForBlink(descriptor), 200);
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
          ←
        </button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Look at the Camera</h2>
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
              <span className="text-4xl">✓</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm font-medium">
          {status === "loading" && <span className="text-muted-foreground">Starting camera...</span>}
          {status === "scanning" && <span className="text-primary animate-pulse">Scanning for your face...</span>}
          {status === "liveness" && <span className="text-primary animate-pulse">Blink to confirm it's you...</span>}
          {status === "found" && <span className="text-primary">Face verified</span>}
          {status === "denied" && (
            <span className="text-red-400">
              Camera access is blocked. Enable it in the browser settings for this kiosk, or ask your admin.
            </span>
          )}
          {status === "error" && <span className="text-red-400">Face check hit a snag.</span>}
        </div>

        {status === "error" && (
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="w-full py-2 text-sm font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-xl"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
