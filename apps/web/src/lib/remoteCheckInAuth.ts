// Token storage for an employee's own paired phone (remote check-in) —
// deliberately a separate localStorage key from deviceAuth.ts's kiosk
// token, since the two are different pairings with different scopes (see
// requireEmployeeDeviceToken vs requireKioskDeviceToken on the server).
const REMOTE_DEVICE_TOKEN_KEY = "remote_checkin_device_token";

export function getRemoteDeviceToken(): string | null {
  return localStorage.getItem(REMOTE_DEVICE_TOKEN_KEY);
}

export function setRemoteDeviceToken(token: string): void {
  localStorage.setItem(REMOTE_DEVICE_TOKEN_KEY, token);
}

export function clearRemoteDeviceToken(): void {
  localStorage.removeItem(REMOTE_DEVICE_TOKEN_KEY);
}
