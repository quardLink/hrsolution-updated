interface Props {
  isDirty: boolean;
  saving: boolean;
  savedAt: number | null;
  onReset: () => void;
}

export default function SettingsSaveBar({ isDirty, saving, savedAt, onReset }: Props) {
  return (
    <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm">
        {savedAt && <span className="text-green-600 font-medium">✓ Saved</span>}
        {isDirty && !savedAt && <span className="text-amber-600">Unsaved changes</span>}
      </div>
      <div className="flex gap-2 sm:ml-auto">
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty || saving}
          className="flex-1 sm:flex-initial px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={!isDirty || saving}
          className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
