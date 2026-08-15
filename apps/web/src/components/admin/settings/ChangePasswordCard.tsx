import { useState } from "react";
import { useAdminApi } from "../../../contexts/AdminApiContext";
import { adminFetch, toErrorMessage } from "../../../lib/adminApi";

interface Props {
  hasCustomAdminPassword?: boolean;
  onPasswordChanged?: (newPassword: string) => void;
  onChanged: () => void;
}

export default function ChangePasswordCard({ hasCustomAdminPassword, onPasswordChanged, onChanged }: Props) {
  const { password, baseUrl } = useAdminApi();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!pwForm.current || !pwForm.next) {
      setPwMsg({ kind: "err", text: "Please fill in all fields" });
      return;
    }
    if (pwForm.next.length < 6) {
      setPwMsg({ kind: "err", text: "New password must be at least 6 characters" });
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ kind: "err", text: "New password and confirmation don't match" });
      return;
    }
    setPwSaving(true);
    try {
      await adminFetch(baseUrl, "/api/admin/password", {
        password,
        method: "PATCH",
        body: { oldPassword: pwForm.current, newPassword: pwForm.next },
        errorMessage: "Failed to change password",
      });
      setPwMsg({ kind: "ok", text: "Password changed. Please use the new password next time you sign in." });
      setPwForm({ current: "", next: "", confirm: "" });
      onPasswordChanged?.(pwForm.next);
      // Refresh settings to update hasCustomAdminPassword flag
      onChanged();
    } catch (err) {
      setPwMsg({ kind: "err", text: toErrorMessage(err) });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <form
      onSubmit={changePassword}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6"
    >
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-1">Admin Password</h2>
      <p className="text-sm text-gray-500 mb-5">
        {hasCustomAdminPassword
          ? "A custom admin password is currently active."
          : "Currently using the default password. Change it to secure your dashboard."}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-1">At least 6 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            autoComplete="new-password"
          />
        </div>

        {pwMsg && (
          <div
            className={`text-sm rounded-lg px-3 py-2 ${
              pwMsg.kind === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {pwMsg.text}
          </div>
        )}

        <div className="pt-2 border-t flex justify-end">
          <button
            type="submit"
            disabled={pwSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {pwSaving ? "Saving..." : "Change Password"}
          </button>
        </div>
      </div>
    </form>
  );
}
