import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet";
import { useEffect, useRef } from "react";
import earthImage from "@assets/stock_images/earth_from_space_at__22b72e59.jpg";

export default function Landing() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        containerRef.current.style.setProperty('--x', `${e.clientX}px`);
        containerRef.current.style.setProperty('--y', `${e.clientY}px`);
      }
    };

    document.body.addEventListener('mousemove', handleMouseMove);
    return () => document.body.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>
      <div 
        ref={containerRef}
        className="min-h-screen bg-black flex flex-col relative overflow-hidden" 
        style={{ 
          fontFamily: "'Barlow', sans-serif",
        }}
      >
        {/* Blurred background layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${earthImage})`,
            filter: 'grayscale(1) blur(8px) brightness(0.4)',
          }}
        />
        
        {/* Clear reveal layer - follows mouse cursor */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${earthImage})`,
            maskImage: 'radial-gradient(250px circle at var(--x, 50%) var(--y, 50%), black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(250px circle at var(--x, 50%) var(--y, 50%), black 0%, transparent 100%)',
          }}
        />

        {/* Full-screen hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          {/* Content */}
          <div className="text-center max-w-4xl mx-auto space-y-4" style={{ mixBlendMode: 'overlay' }}>
            {/* Brand */}
            <h1 
              className="uppercase tracking-[0.15em] text-white font-semibold text-[32px]"
              data-testid="heading-brand"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
            >
              Sentinel <span className="text-[#5ba897]">Counsel</span>
            </h1>

            {/* Main Slogan */}
            <div className="space-y-4">
              <h2 
                className="font-light tracking-tight text-[#5ba897] text-[20px]"
                data-testid="heading-slogan"
              >
                Privilege by Design
              </h2>
              
              {/* Three C's Tagline */}
              <p 
                className="text-[11px] tracking-[0.25em] text-gray-400 uppercase font-medium"
                data-testid="text-tagline"
              >
                Corporate Communications.
                <br />
                Continuous. Comprehensive. Confidential.
              </p>
            </div>

            {/* Sign In */}
            <div className="pt-4" style={{ mixBlendMode: 'normal' }}>
              {user ? (
                <Link href="/start">
                  <Button 
                    size="sm"
                    variant="outline"
                    className="border-[#5ba897] text-[#5ba897] font-medium tracking-wide min-w-[140px] bg-transparent text-[13px] hover:bg-[#5ba897]/20"
                    data-testid="button-enter"
                  >
                    Enter
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = "/api/login"}
                  className="border-[#5ba897] text-[#5ba897] font-medium tracking-wide min-w-[140px] bg-transparent text-[13px] hover:bg-[#5ba897]/20"
                  data-testid="button-sign-in"
                >Client Login</Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Minimal footer */}
        <footer className="py-4 text-center relative z-10">
          <p className="text-[10px] text-gray-500 tracking-wide">
            © 2025 Sentinel Counsel LLP
          </p>
        </footer>
      </div>
    </>
  );
}
