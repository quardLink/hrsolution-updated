import { useEffect, useRef, useState } from "react";
import { detectFaceDescriptor, openCamera, stopCamera } from "../../lib/faceApi";

interface Props {
  employeeName: string | undefined;
  error?: string;
  onCaptured: (descriptor: number[]) => void;
  onBack: () => void;
}

// Kiosk-side: opens the camera and polls for a face automatically (no
// manual "capture" button — an employee shouldn't have to operate
// anything, just look at the tablet for a second). The descriptor never
// leaves this component as anything but numbers; no photo is stored or
// sent anywhere.
export default function FaceCapture({ employeeName, error, onCaptured, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "found" | "denied" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function run() {
      try {
        stream = await openCamera();
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");
        poll();
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }

    async function poll() {
      if (cancelled || !videoRef.current) return;
      try {
        const descriptor = await detectFaceDescriptor(videoRef.current);
        if (cancelled) return;
        if (descriptor) {
          setStatus("found");
          setTimeout(() => !cancelled && onCaptured(descriptor), 400);
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      pollTimer = setTimeout(poll, 600);
    }

    run();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      stopCamera(stream);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {status === "found" && <span className="text-primary">Face verified</span>}
          {status === "denied" && (
            <span className="text-red-400">
              Camera access is blocked. Enable it in the browser settings for this kiosk, or ask your admin.
            </span>
          )}
          {status === "error" && (
            <span className="text-red-400">Face check failed to start. Try again in a moment.</span>
          )}
        </div>
      </div>
    </div>
  );
}
