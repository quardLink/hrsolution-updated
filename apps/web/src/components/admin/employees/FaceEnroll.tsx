import { useEffect, useRef, useState } from "react";
import { detectFaceDescriptor, openCamera, stopCamera } from "../../../lib/faceApi";

interface Props {
  // true if the employee already has a face on file (from the last save),
  // regardless of what's pending in this form session
  currentlyEnrolled: boolean;
  // a freshly captured descriptor pending save, or null if the admin
  // marked the enrollment for removal, or undefined if nothing changed
  pending: number[] | null | undefined;
  onCapture: (descriptor: number[]) => void;
  onClear: () => void;
}

// Admin-side: manual capture (a deliberate button press, not auto-polling
// like the kiosk) so whoever's enrolling can make sure the employee is
// framed and ready before the reference descriptor is taken — this is the
// "ground truth" every future check-in gets compared against.
export default function FaceEnroll({ currentlyEnrolled, pending, onCapture, onClear }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "denied" | "not_found" | "captured">("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        const stream = await openCamera();
        if (cancelled) {
          stopCamera(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [open]);

  async function capture() {
    if (!videoRef.current) return;
    setStatus("loading");
    const descriptor = await detectFaceDescriptor(videoRef.current);
    if (!descriptor) {
      setStatus("not_found");
      return;
    }
    onCapture(descriptor);
    stopCamera(streamRef.current);
    streamRef.current = null;
    setOpen(false);
  }

  const willBeEnrolled = pending === undefined ? currentlyEnrolled : pending !== null;

  return (
    <div className="border-t border-border pt-4">
      <label className="block text-sm font-medium text-foreground/90 mb-1">Face Verification</label>
      <p className="text-xs text-muted-foreground mb-3">
        Once enrolled, the kiosk requires this employee's face to match before accepting a PIN — stops a coworker
        from checking them in.
      </p>

      {!open ? (
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              willBeEnrolled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {willBeEnrolled ? "✓ Enrolled" : "Not enrolled"}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/70 text-foreground rounded-lg"
          >
            {willBeEnrolled ? "Re-enroll" : "Enroll Face"}
          </button>
          {willBeEnrolled && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="bg-background border border-border rounded-xl p-4 space-y-3">
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-border bg-muted">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          </div>
          <div className="text-center text-xs font-medium min-h-4">
            {status === "loading" && <span className="text-muted-foreground">Starting camera...</span>}
            {status === "ready" && <span className="text-muted-foreground">Center the employee's face, then capture</span>}
            {status === "not_found" && <span className="text-red-400">No face detected — try again</span>}
            {status === "denied" && <span className="text-red-400">Camera access denied</span>}
          </div>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={capture}
              disabled={status !== "ready" && status !== "not_found"}
              className="px-4 py-1.5 text-xs font-semibold bg-primary hover:opacity-90 text-primary-foreground rounded-lg disabled:opacity-50"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
