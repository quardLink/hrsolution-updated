import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Building2, Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";

type Step = "account" | "firm" | "hours";
const STEPS: Step[] = ["account", "firm", "hours"];

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
  const { t, locale, setLocale } = useLocale();
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

  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    setError("");
    if (step === "account") {
      if (!name.trim() || !email.trim() || password.length < 8) {
        setError(t("signup.fillAllFields"));
        return;
      }
      setStep("firm");
    } else if (step === "firm") {
      if (!orgName.trim()) {
        setError(t("signup.firmNameRequired"));
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
      setError(t("signup.logoReadError"));
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
        setError(signupData.error || t("signup.signupFailed"));
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
      setError(t("signup.networkError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 start-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <button
        onClick={() => setLocale(locale === "en" ? "ar" : "en")}
        className="absolute top-4 end-4 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg hover:text-foreground hover:border-primary/40 transition-colors inline-flex items-center gap-1.5"
      >
        <Languages className="w-3.5 h-3.5" /> {locale === "en" ? "العربية" : "English"}
      </button>
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-3 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
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

        <Card className="shadow-2xl">
          <CardContent className="p-8 space-y-6">
            {step === "account" && (
              <>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">{t("signup.accountTitle")}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{t("signup.accountSubtitle")}</p>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder={t("signup.yourName")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    type="email"
                    placeholder={t("signup.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <Input
                    type="password"
                    placeholder={t("signup.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            {step === "firm" && (
              <>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">{t("signup.firmTitle")}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{t("signup.firmSubtitle")}</p>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder={t("signup.firmName")}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="w-14 h-14 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
                      {logoDataUrl ? (
                        <img src={logoDataUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {logoDataUrl ? t("signup.changeLogo") : t("signup.uploadLogo")}
                    </span>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                </div>
              </>
            )}

            {step === "hours" && (
              <>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">{t("signup.hoursTitle")}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{t("signup.hoursSubtitle")}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-normal">{t("signup.start")}</Label>
                    <Input
                      type="time"
                      value={hours.start}
                      onChange={(e) => setHours({ ...hours, start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-normal">{t("signup.end")}</Label>
                    <Input
                      type="time"
                      value={hours.end}
                      onChange={(e) => setHours({ ...hours, end: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <div className="flex gap-2">
              {step !== "account" && (
                <Button type="button" variant="ghost" onClick={goBack}>
                  {t("signup.back")}
                </Button>
              )}
              {step !== "hours" ? (
                <Button type="button" onClick={goNext} className="flex-1" size="lg">
                  {t("signup.continue")}
                </Button>
              ) : (
                <Button type="button" onClick={finish} disabled={submitting} className="flex-1" size="lg">
                  {submitting ? t("signup.creating") : t("signup.finishSignIn")}
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {t("signup.haveAccount")}{" "}
              <Link href="/admin" className="text-foreground hover:text-primary font-medium">
                {t("signup.signIn")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
