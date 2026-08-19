import type { OfficeSettings } from "../../../hooks/useSettingsForm";
import SettingsSaveBar from "./SettingsSaveBar";

interface Props {
  draft: OfficeSettings;
  onChange: (next: OfficeSettings) => void;
  onSubmit: (e: React.FormEvent) => void;
  isDirty: boolean;
  saving: boolean;
  savedAt: number | null;
  onReset: () => void;
}

export default function SettingsHoursPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  return (
    <form onSubmit={onSubmit} className="bg-card rounded-xl border border-border p-4 lg:p-6 max-w-2xl">
      <h2 className="text-lg lg:text-xl font-bold text-foreground mb-1">Working Hours</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Default times applied to employees who don't have a custom schedule.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">
            Expected Check-In Time
          </label>
          <input
            type="time"
            value={draft.defaultMorningStart}
            onChange={(e) => onChange({ ...draft, defaultMorningStart: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Late threshold applies after this time.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">
            Late Grace Period (minutes)
          </label>
          <input
            type="number"
            min="0"
            max="120"
            value={draft.lateThresholdMinutes}
            onChange={(e) => onChange({ ...draft, lateThresholdMinutes: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Arrivals within this many minutes after check-in time count as on-time.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-1">
            Evening Check-Out Reminder
          </label>
          <input
            type="time"
            value={draft.defaultAfternoonEnd}
            onChange={(e) => onChange({ ...draft, defaultAfternoonEnd: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Sound reminder plays at this time on the kiosk.
          </p>
        </div>
      </div>
      <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
    </form>
  );
}
