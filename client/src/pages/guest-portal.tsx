import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowRight, Eye, EyeOff, Building2, LogIn } from "lucide-react";

export default function GuestPortal() {
  const [, params] = useRoute("/guest/share/:token");
  const token = params?.token || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<"loading" | "register" | "login">("loading");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    company: "",
  });

  const { data: shareInfo, isLoading, error } = useQuery<any>({
    queryKey: ["/api/deal-share", token],
    queryFn: async () => {
      const res = await fetch(`/api/deal-share/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (shareInfo) {
      setFormData((prev) => ({ ...prev, email: shareInfo.email }));
      setMode(shareInfo.hasAccount ? "login" : "register");
    }
  }, [shareInfo]);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/guest/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...formData }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account created", description: "Welcome to Sentinel Counsel." });
      setLocation("/guest/deals");
    },
    onError: (error: Error) => {
      if (error.message.includes("already exists")) {
        setMode("login");
        toast({ title: "Account exists", description: "Please sign in with your password." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/guest/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password, token }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Signed in", description: "Welcome back." });
      setLocation("/guest/deals");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register") {
      if (formData.password.length < 8) {
        toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
        return;
      }
      registerMutation.mutate();
    } else {
      loginMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="guest-portal-loading">
        <div className="text-muted-foreground">Validating share link...</div>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md w-full mx-4 p-8 text-center" data-testid="guest-portal-error">
          <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
          <p className="text-muted-foreground text-sm">
            {(error as Error)?.message || "This share link is invalid or has expired."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">SENTINEL COUNSEL LLP</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8" data-testid="guest-portal-form">
          <div className="text-center mb-6">
            <Building2 className="h-10 w-10 mx-auto text-primary mb-3" />
            <h1 className="text-xl font-semibold" data-testid="text-deal-title">{shareInfo.dealTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {shareInfo.dealNumber} &middot; {shareInfo.dealType?.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Shared by <span className="font-medium text-foreground">{shareInfo.sharedBy}</span>
            </p>
            {shareInfo.message && (
              <p className="text-sm italic text-muted-foreground mt-2 border-l-2 border-primary/30 pl-3 text-left">
                "{shareInfo.message}"
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <h2 className="text-base font-medium">Create your account</h2>
                <p className="text-xs text-muted-foreground">
                  Set up your account to view deal details.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First name"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Last name"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company" className="text-xs">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                    data-testid="input-company"
                  />
                </div>
              </>
            )}

            {mode === "login" && (
              <>
                <h2 className="text-base font-medium">Sign in to view deal</h2>
                <p className="text-xs text-muted-foreground">
                  Welcome back. Enter your password to continue.
                </p>
              </>
            )}

            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                disabled={!!shareInfo.email}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={mode === "register" ? "Minimum 8 characters" : "Enter your password"}
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
              disabled={registerMutation.isPending || loginMutation.isPending}
              data-testid="button-submit-auth"
            >
              {(registerMutation.isPending || loginMutation.isPending) ? (
                "Please wait..."
              ) : mode === "register" ? (
                <>Create Account & View Deal <ArrowRight className="h-4 w-4 ml-2" /></>
              ) : (
                <>Sign In <LogIn className="h-4 w-4 ml-2" /></>
              )}
            </Button>

            {mode === "register" && (
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("login")} className="text-primary underline" data-testid="link-switch-to-login">
                  Sign in
                </button>
              </p>
            )}
            {mode === "login" && (
              <p className="text-xs text-center text-muted-foreground">
                Don't have an account?{" "}
                <button type="button" onClick={() => setMode("register")} className="text-primary underline" data-testid="link-switch-to-register">
                  Create one
                </button>
              </p>
            )}
          </form>
        </Card>
      </div>

      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        Sentinel Counsel LLP &middot; Secure Deal Portal
      </footer>
    </div>
  );
}
