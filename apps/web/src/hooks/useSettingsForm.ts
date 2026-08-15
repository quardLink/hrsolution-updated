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
  hasCustomAdminPassword?: boolean;
}

// Shared by the General and Working Hours settings panels — both just edit
// different subsets of the same draft/save-bar flow.
export function useSettingsForm() {
  const { password, baseUrl, onError } = useAdminApi();
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [draft, setDraft] = useState<OfficeSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/settings`, { headers: { "x-admin-password": password } });
      if (!res.ok) {
        onError("Failed to load settings");
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setDraft(data.settings);
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
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        onError("Failed to save settings");
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setDraft(data.settings);
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
