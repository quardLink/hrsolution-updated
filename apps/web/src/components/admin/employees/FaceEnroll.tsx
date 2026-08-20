import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
import { detectFaceDescriptor, loadFaceModels, openCamera, stopCamera } from "../../../lib/faceApi";

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
type Status = "loading" | "ready" | "analyzing" | "denied" | "not_found" | "error";

export default function FaceEnroll({ currentlyEnrolled, pending, onCapture, onClear }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        // Start the model download alongside the camera permission prompt
        // rather than waiting until "Capture" is clicked — that gap is
        // what used to make the button look stuck for several seconds.
        const modelsReady = loadFaceModels();
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
        await modelsReady;
        if (cancelled) return;
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
    setStatus("analyzing");
    try {
      const descriptor = await detectFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setStatus("not_found");
        return;
      }
      onCapture(descriptor);
      stopCamera(streamRef.current);
      streamRef.current = null;
      setOpen(false);
    } catch {
      setStatus("error");
    }
  }

  const willBeEnrolled = pending === undefined ? currentlyEnrolled : pending !== null;

  return (
    <div className="border-t pt-4">
      <Label className="block text-sm font-medium mb-1">{t("employees.faceSectionTitle")}</Label>
      <p className="text-xs text-muted-foreground mb-3">{t("employees.faceSectionHint")}</p>

      {!open ? (
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              willBeEnrolled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {willBeEnrolled ? `✓ ${t("employees.faceEnrolled")}` : t("employees.faceNotEnrolled")}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {willBeEnrolled ? t("employees.faceReEnroll") : t("employees.faceEnroll")}
          </Button>
          {willBeEnrolled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-red-500 hover:text-red-500"
            >
              {t("common.remove")}
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-background border rounded-xl p-4 space-y-3">
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-2 bg-muted">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          </div>
          <div className="text-center text-xs font-medium min-h-4">
            {status === "loading" && <span className="text-muted-foreground">{t("employees.faceStartingCamera")}</span>}
            {status === "ready" && <span className="text-muted-foreground">{t("employees.faceReadyToCapture")}</span>}
            {status === "analyzing" && <span className="text-primary animate-pulse">{t("employees.faceAnalyzing")}</span>}
            {status === "not_found" && <span className="text-red-500">{t("employees.faceNotFound")}</span>}
            {status === "denied" && <span className="text-red-500">{t("employees.faceDenied")}</span>}
            {status === "error" && <span className="text-red-500">{t("employees.faceError")}</span>}
          </div>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={capture}
              disabled={status !== "ready" && status !== "not_found" && status !== "error"}
            >
              {status === "analyzing" ? t("employees.faceAnalyzing") : t("employees.faceCapture")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
