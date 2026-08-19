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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-6 relative"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center text-3xl mb-4">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-1">Petro Safe Tech Attendance</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter admin password"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            autoFocus
          />
          {authError && (
            <p className="text-red-400 text-sm mt-2">{authError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Sign In"}
        </button>
        <Link href="/" className="block text-center text-muted-foreground text-sm hover:text-foreground">
          ← Back to Attendance
        </Link>
      </form>
    </div>
  );
}
