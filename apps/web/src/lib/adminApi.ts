// Small shared helper for the admin tabs' hand-rolled fetch calls. Every tab
// was independently building the URL, sending the session cookie, checking
// res.ok, and parsing an optional {error} body — this collapses that
// boilerplate to one call while preserving each call site's original
// fallback error message.
export class AdminApiError extends Error {}

export interface AdminFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  errorMessage?: string;
}

export async function adminFetch<T>(baseUrl: string, path: string, opts: AdminFetchOptions = {}): Promise<T> {
  const { method = "GET", body, errorMessage = "Request failed" } = opts;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new AdminApiError(data.error || errorMessage);
  }
  return res.json();
}

export function toErrorMessage(err: unknown): string {
  return err instanceof AdminApiError ? err.message : "Network error";
}
