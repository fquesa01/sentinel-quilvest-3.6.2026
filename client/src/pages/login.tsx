import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet";
import earthImage from "@assets/stock_images/earth_from_space_at__22b72e59.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setLocation("/start");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

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
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${earthImage})`,
            filter: "grayscale(1) blur(8px) brightness(0.3)",
          }}
        />

        {/* Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          <div className="w-full max-w-sm space-y-6">
            {/* Brand */}
            <div className="text-center space-y-2">
              <h1
                className="uppercase tracking-[0.15em] text-white font-semibold text-[24px]"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
              >
                Sentinel <span className="text-[#5ba897]">Counsel</span>
              </h1>
              <p className="text-[12px] tracking-[0.15em] text-gray-400 uppercase">
                {isSignUp ? "Create Account" : "Client Login"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-gray-300 text-[12px] tracking-wide uppercase"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="bg-black/50 border-gray-700 text-white placeholder:text-gray-600 focus:border-[#5ba897]"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-gray-300 text-[12px] tracking-wide uppercase"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-black/50 border-gray-700 text-white placeholder:text-gray-600 focus:border-[#5ba897]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-[12px] text-center">{error}</p>
              )}

              {message && (
                <p className="text-[#5ba897] text-[12px] text-center">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5ba897] hover:bg-[#4a9486] text-white font-medium tracking-wide"
              >
                {loading
                  ? "..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </Button>
            </form>

            {/* Toggle sign up / sign in */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setMessage("");
                }}
                className="text-[12px] text-gray-400 hover:text-[#5ba897] tracking-wide"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Need an account? Sign up"}
              </button>
            </div>

            {/* Back link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLocation("/")}
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
