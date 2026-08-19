import { useEffect, useState } from "react";
import { useAdminApi } from "../../../contexts/AdminApiContext";

export default function PublicLeaveLinkCard() {
  const { baseUrl } = useAdminApi();
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setOrgSlug(data.org?.slug ?? null))
      .catch(() => {});
  }, [baseUrl]);

  const link =
    orgSlug && typeof window !== "undefined"
      ? `${window.location.origin}${import.meta.env.BASE_URL}leave-request/${orgSlug}`
      : "";

  return (
    <div className="bg-card rounded-xl border border-border p-4 lg:p-6">
      <h3 className="text-base font-bold text-foreground mb-2">Public Leave Request Link</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Share this link with employees so they can submit leave requests from their phones.
        They'll be asked for their employee ID and PIN to verify identity.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          readOnly
          value={link}
          className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono text-foreground/80"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          disabled={!link}
          onClick={() => navigator.clipboard?.writeText(link)}
          className="px-4 py-2 bg-secondary border border-secondary-border hover:bg-muted text-secondary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
