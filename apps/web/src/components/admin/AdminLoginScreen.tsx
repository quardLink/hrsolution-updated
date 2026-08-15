import { Link } from "wouter";

interface Props {
  password: string;
  onPasswordChange: (value: string) => void;
  authError: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AdminLoginScreen({ password, onPasswordChange, authError, loading, onSubmit }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mb-4">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-gray-500 text-sm mt-1">Petro Safe Tech Attendance</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          {authError && (
            <p className="text-red-600 text-sm mt-2">{authError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Sign In"}
        </button>
        <Link href="/" className="block text-center text-blue-600 text-sm hover:underline">
          ← Back to Attendance
        </Link>
      </form>
    </div>
  );
}
