import { useState } from "react";
import { Link } from "wouter";

interface Props {
  authError: string;
  loading: boolean;
  onSubmit: (email: string, password: string) => void;
}

export default function AdminLoginScreen({ authError, loading, onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(email, password);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-6 relative"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center text-3xl mb-4">
            🔐
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your firm's dashboard</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              autoFocus
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              autoComplete="current-password"
            />
          </div>
          {authError && (
            <p className="text-red-400 text-sm">{authError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-foreground hover:text-primary font-medium">
            Create your firm's account
          </Link>
        </p>
        <Link href="/" className="block text-center text-muted-foreground text-sm hover:text-foreground">
          ← Back to Attendance
        </Link>
      </form>
    </div>
  );
}
