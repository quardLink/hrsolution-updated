import { useState } from "react";
import { Link, useLocation } from "wouter";

type Step = "account" | "firm" | "hours";
const STEPS: { id: Step; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "firm", label: "Firm" },
  { id: "hours", label: "Hours" },
];

const fieldClass =
  "w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

function downscaleImage(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SignupPage() {
  const [, navigate] = useLocation();
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [step, setStep] = useState<Step>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [hours, setHours] = useState({ start: "08:00", end: "18:00" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    setError("");
    if (step === "account") {
      if (!name.trim() || !email.trim() || password.length < 8) {
        setError("Please fill in all fields — password needs at least 8 characters.");
        return;
      }
      setStep("firm");
    } else if (step === "firm") {
      if (!orgName.trim()) {
        setError("Firm name is required.");
        return;
      }
      setStep("hours");
    }
  }

  function goBack() {
    setError("");
    if (step === "firm") setStep("account");
    else if (step === "hours") setStep("firm");
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogoDataUrl(await downscaleImage(file));
    } catch {
      setError("Couldn't read that image — try a different file.");
    }
  }

  async function finish() {
    setSubmitting(true);
    setError("");
    try {
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, orgName, logoDataUrl }),
      });
      const signupData = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        setError(signupData.error || "Signup failed");
        setSubmitting(false);
        return;
      }

      await fetch(`${baseUrl}/api/admin/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultMorningStart: hours.start,
          payrollShiftStart: hours.start,
          payrollShiftEnd: hours.end,
        }),
      }).catch(() => {});

      navigate("/admin");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i <= stepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < stepIndex ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-6">
          {step === "account" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
                <p className="text-muted-foreground text-sm mt-1">Step 1 of 3 — you'll add your firm next</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                  autoFocus
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {step === "firm" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Tell us about your firm</h1>
                <p className="text-muted-foreground text-sm mt-1">Step 2 of 3 — this shows up on the kiosk and dashboard</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Firm name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className={fieldClass}
                  autoFocus
                />
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="w-14 h-14 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoDataUrl ? (
                      <img src={logoDataUrl} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">🏢</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {logoDataUrl ? "Change logo" : "Upload a logo (optional)"}
                  </span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
            </>
          )}

          {step === "hours" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Set your work hours</h1>
                <p className="text-muted-foreground text-sm mt-1">Step 3 of 3 — you can change this later in Settings</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start</label>
                  <input
                    type="time"
                    value={hours.start}
                    onChange={(e) => setHours({ ...hours, start: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">End</label>
                  <input
                    type="time"
                    value={hours.end}
                    onChange={(e) => setHours({ ...hours, end: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <div className="flex gap-2">
            {step !== "account" && (
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-3 text-foreground/80 hover:bg-muted rounded-xl text-sm font-medium"
              >
                Back
              </button>
            )}
            {step !== "hours" ? (
              <button
                type="button"
                onClick={goNext}
                className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={submitting}
                className="flex-1 bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Finish & Sign In"}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/admin" className="text-foreground hover:text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
