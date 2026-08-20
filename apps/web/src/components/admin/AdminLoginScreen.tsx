import { useState } from "react";
import { Link } from "wouter";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PoweredBy from "@/components/PoweredBy";

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
      <Card className="w-full max-w-sm shadow-2xl relative">
        <CardContent className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Admin Access</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your firm's dashboard</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              {authError && <p className="text-red-500 text-sm">{authError}</p>}
            </div>
            <Button type="submit" disabled={loading || !email || !password} className="w-full" size="lg">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
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
        </CardContent>
      </Card>
      <PoweredBy />
    </div>
  );
}
