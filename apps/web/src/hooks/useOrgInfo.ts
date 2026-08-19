import { useEffect, useState } from "react";
import { getDeviceToken } from "../lib/deviceAuth";

export interface KioskOrgInfo {
  name: string;
  logoDataUrl: string | null;
}

// Separate from the generated api-client hooks since it's fine for this to
// fail silently pre-pairing (KioskPairingScreen doesn't need branding to
// function) — a plain fetch keeps that failure from surfacing as a
// react-query error state anywhere else.
export function useOrgInfo(baseUrl: string, devicePaired: boolean): KioskOrgInfo | null {
  const [org, setOrg] = useState<KioskOrgInfo | null>(null);

  useEffect(() => {
    if (!devicePaired) return;
    const token = getDeviceToken();
    if (!token) return;
    let cancelled = false;
    fetch(`${baseUrl}/api/attendance/org-info`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setOrg(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [baseUrl, devicePaired]);

  return org;
}
