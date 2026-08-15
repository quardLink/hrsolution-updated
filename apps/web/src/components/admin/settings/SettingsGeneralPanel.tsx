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

export default function SettingsGeneralPanel({ draft, onChange, onSubmit, isDirty, saving, savedAt, onReset }: Props) {
  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6 max-w-2xl">
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Company Info</h2>
      <p className="text-sm text-gray-500 mb-5">Shown in the admin header and on PDF exports.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            type="text"
            value={draft.companyName}
            onChange={(e) => onChange({ ...draft, companyName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
          <input
            type="text"
            value="Asia/Riyadh (Saudi Arabia)"
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Fixed to Asia/Riyadh. Changing this requires a server restart.
          </p>
        </div>
      </div>
      <SettingsSaveBar isDirty={isDirty} saving={saving} savedAt={savedAt} onReset={onReset} />
    </form>
  );
}
