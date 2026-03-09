import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";

export default function GuestLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const sessionQuery = useQuery<any>({
    queryKey: ["/api/guest/session"],
    queryFn: async () => {
      const res = await fetch("/api/guest/session");
      if (!res.ok) throw new Error("Not authenticated");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (sessionQuery.data && !sessionQuery.error) {
      setLocation("/guest/deals");
    }
  }, [sessionQuery.data, sessionQuery.error, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/guest/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setLocation("/guest/deals");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">SENTINEL COUNSEL LLP</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-8" data-testid="guest-login-form">
          <h1 className="text-lg font-semibold mb-1">Guest Sign In</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in to view deals shared with you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
              data-testid="button-submit-login"
            >
              {loginMutation.isPending ? "Signing in..." : (
                <>Sign In <LogIn className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </form>
        </Card>
      </div>

      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        Sentinel Counsel LLP &middot; Secure Deal Portal
      </footer>
    </div>
  );
}
