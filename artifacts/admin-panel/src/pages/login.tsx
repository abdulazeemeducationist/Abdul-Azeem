import { useState } from "react";
import { useLocation } from "wouter";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSignIn } from "@workspace/api-client-react";
import { setAuth } from "@/lib/auth";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("admin@mcqapp.com");
  const [password, setPassword] = useState("admin123");
  const { toast } = useToast();
  const signIn = useSignIn();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signIn.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          if (data.user.role !== "admin") {
            toast({ title: "Access denied", description: "Admin accounts only.", variant: "destructive" });
            return;
          }
          setAuth(data);
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { message?: string } })?.data?.message ?? "Invalid credentials";
          toast({ title: "Sign in failed", description: msg, variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <GraduationCap className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">MCQ Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage content</p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="input-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mcqapp.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="input-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              data-testid="button-signin"
              type="submit"
              className="w-full"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
