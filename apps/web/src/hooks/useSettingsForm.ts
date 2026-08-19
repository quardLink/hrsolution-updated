import { useEffect, useState } from "react";
import { useAdminApi } from "../contexts/AdminApiContext";

export interface OfficeSettings {
  defaultMorningStart: string;
  defaultMorningEnd: string;
  defaultAfternoonStart: string;
  defaultAfternoonEnd: string;
  lunchBreakEnd: string;
  companyName: string;
  lateThresholdMinutes: string;
}

// Shared by the General and Working Hours settings panels — both just edit
// different subsets of the same draft/save-bar flow. companyName actually
// lives on the org record (/api/auth/org), not the settings table, but is
// folded into this same draft/save flow so the General panel doesn't need
// its own separate save button.
export function useSettingsForm() {
  const { baseUrl, onError } = useAdminApi();
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [draft, setDraft] = useState<OfficeSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, meRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/settings`, { credentials: "include" }),
        fetch(`${baseUrl}/api/auth/me`, { credentials: "include" }),
      ]);
      if (!settingsRes.ok || !meRes.ok) {
        onError("Failed to load settings");
        return;
      }
      const settingsData = await settingsRes.json();
      const meData = await meRes.json();
      const merged: OfficeSettings = { ...settingsData.settings, companyName: meData.org?.name ?? "" };
      setSettings(merged);
      setDraft(merged);
    } catch {
      onError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !settings) return;
    setSaving(true);
    try {
      const { companyName, ...officeFields } = draft;
      const requests: Promise<Response>[] = [
        fetch(`${baseUrl}/api/admin/settings`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(officeFields),
        }),
      ];
      if (companyName !== settings.companyName) {
        requests.push(
          fetch(`${baseUrl}/api/auth/org`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: companyName }),
          }),
        );
      }
      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) {
        onError("Failed to save settings");
        return;
      }
      setSettings(draft);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch {
      onError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (settings) setDraft(settings);
  }

  const isDirty = Boolean(settings && draft && JSON.stringify(settings) !== JSON.stringify(draft));

  return { settings, draft, setDraft, loading, saving, savedAt, isDirty, save, reset, reload: load };
}
