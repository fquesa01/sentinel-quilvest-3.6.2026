import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import earthImage from "@assets/stock_images/earth_from_space_at__22b72e59.jpg";

export default function Login() {
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
          <div className="w-full max-w-sm space-y-8">
            {/* Brand */}
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

            {/* Sign In Button */}
            <div className="space-y-4">
              <Button
                data-testid="button-login"
                onClick={() => {
                  window.location.href = "/api/login";
                }}
                className="w-full bg-[#5ba897] hover:bg-[#4a9486] text-white font-medium tracking-wide"
              >
                Sign In with Replit
              </Button>
            </div>

            {/* Back link */}
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
