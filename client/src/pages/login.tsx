import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet";
import { SiGoogle } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { Lock, Mail } from "lucide-react";
import earthImage from "@assets/stock_images/earth_from_space_at__22b72e59.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { data: providers } = useQuery<{ google: boolean; replit: boolean; microsoft: boolean }>({
    queryKey: ["/api/auth/providers"],
  });

  const hasGoogle = providers?.google;
  const hasReplit = providers?.replit;
  const hasMicrosoft = providers?.microsoft;
  const hasAnyOAuth = hasGoogle || hasReplit || hasMicrosoft;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError("Please enter email and password");
      return;
    }
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLoginError(data.message || "Login failed");
        return;
      }
      window.location.href = "/";
    } catch {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <div
        className="min-h-screen bg-black flex flex-col relative overflow-hidden"
        style={{ fontFamily: "'Barlow', sans-serif" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${earthImage})`,
            filter: "grayscale(1) blur(8px) brightness(0.3)",
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
              <h1
                className="uppercase tracking-[0.15em] text-white font-semibold text-[24px]"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
              >
                Sentinel <span className="text-[#5ba897]">Counsel</span>
              </h1>
              <p className="text-[12px] tracking-[0.15em] text-gray-400 uppercase">
                Client Login
              </p>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-gray-300 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-black/50 border-gray-600 text-white placeholder:text-gray-500"
                    data-testid="input-login-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-gray-300 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-black/50 border-gray-600 text-white placeholder:text-gray-500"
                    data-testid="input-login-password"
                  />
                </div>
              </div>
              {loginError && (
                <p className="text-red-400 text-sm" data-testid="text-login-error">{loginError}</p>
              )}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#5ba897] text-white font-medium tracking-wide"
                data-testid="button-login-submit"
              >
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {hasAnyOAuth && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-600" />
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider">or continue with</span>
                  <div className="flex-1 h-px bg-gray-600" />
                </div>

                <div className="space-y-3">
                  {hasGoogle && (
                    <Button
                      data-testid="button-login-google"
                      onClick={() => { window.location.href = "/api/auth/google"; }}
                      className="w-full bg-white text-gray-800 font-medium tracking-wide border border-gray-300"
                    >
                      <SiGoogle className="mr-2 h-4 w-4" />
                      Sign in with Google
                    </Button>
                  )}

                  {hasMicrosoft && (
                    <Button
                      data-testid="button-login-microsoft"
                      onClick={() => { window.location.href = "/api/auth/microsoft"; }}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 font-medium tracking-wide"
                    >
                      Sign In with Microsoft
                    </Button>
                  )}

                  {hasReplit && (
                    <Button
                      data-testid="button-login-replit"
                      onClick={() => { window.location.href = "/api/login"; }}
                      variant="outline"
                      className="w-full border-gray-600 text-gray-300 font-medium tracking-wide"
                    >
                      Sign In with Replit
                    </Button>
                  )}
                </div>
              </>
            )}

            <div className="text-center">
              <button
                type="button"
                data-testid="link-back"
                onClick={() => window.location.href = "/"}
                className="text-[11px] text-gray-500 hover:text-gray-300 tracking-wide"
              >
                &larr; Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
