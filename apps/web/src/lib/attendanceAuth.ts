import type { TranslationKey } from "./i18n";

// Shared between AttendanceSummaryView's inline sublines and the log
// trail dialog, so the two don't drift out of sync on labeling.
export const AUTH_LABEL_KEYS: Record<string, TranslationKey> = {
  fingerprint: "reports.authFingerprint",
  face: "reports.authFace",
  card: "reports.authCard",
  password: "reports.authPassword",
  pin: "reports.authPin",
  mobile_approved: "reports.authMobileApproved",
};

// The kiosk only ever verifies by PIN or face; a remote-checkin phone is
// its own source; everything else comes from a ZKTeco (or compatible)
// terminal.
export function sourceForAuthType(authType: string): "kiosk" | "terminal" | "remote" {
  if (authType === "mobile_approved") return "remote";
  return authType === "pin" || authType === "face" ? "kiosk" : "terminal";
}
