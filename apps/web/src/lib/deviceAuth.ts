import { setAuthTokenGetter } from "@workspace/api-client";

const DEVICE_TOKEN_KEY = "kiosk_device_token";

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string): void {
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

// Attaches the paired kiosk's device token as a bearer token to every
// request made through the generated attendance API client — this is what
// requireDeviceToken on the server checks. Call once at app startup.
export function initDeviceAuth(): void {
  setAuthTokenGetter(() => getDeviceToken());
}

export function isDeviceNotPaired(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const data = (err as { data?: { code?: string } }).data;
  return data?.code === "DEVICE_NOT_PAIRED";
}
