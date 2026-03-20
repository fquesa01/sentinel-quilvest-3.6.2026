import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Organization } from "@shared/schema";

interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string | null;
  companyName: string | null;
  footerText: string | null;
  isLoaded: boolean;
}

const defaultBranding: BrandingConfig = {
  logoUrl: null,
  primaryColor: null,
  companyName: null,
  footerText: null,
  isLoaded: false,
};

const BrandingContext = createContext<BrandingConfig>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}

interface BrandingProviderProps {
  organizationId?: string;
  children: React.ReactNode;
}

export function BrandingProvider({ organizationId, children }: BrandingProviderProps) {
  const { data: org } = useQuery<Organization>({
    queryKey: ["/api/ron/branding", organizationId],
    enabled: !!organizationId,
  });

  const branding = useMemo<BrandingConfig>(() => {
    if (!org) return defaultBranding;
    return {
      logoUrl: org.logoUrl || null,
      primaryColor: org.primaryColor || null,
      companyName: org.companyName || org.name || null,
      footerText: org.footerText || null,
      isLoaded: true,
    };
  }, [org]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

interface BrandedHeaderProps {
  fallbackTitle?: string;
  className?: string;
}

export function BrandedHeader({ fallbackTitle = "Sentinel RON", className = "" }: BrandedHeaderProps) {
  const branding = useBranding();
  const displayName = branding.companyName || fallbackTitle;

  return (
    <div className={`flex items-center gap-3 ${className}`} data-testid="branded-header">
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={`${displayName} logo`}
          className="h-8 max-w-[160px] object-contain"
          data-testid="img-org-logo"
        />
      ) : null}
      <span
        className="font-semibold text-lg"
        style={branding.primaryColor ? { color: branding.primaryColor } : undefined}
        data-testid="text-org-name"
      >
        {displayName}
      </span>
    </div>
  );
}

interface BrandedFooterProps {
  className?: string;
}

export function BrandedFooter({ className = "" }: BrandedFooterProps) {
  const branding = useBranding();

  if (!branding.footerText && !branding.companyName) return null;

  return (
    <div
      className={`text-xs text-muted-foreground text-center py-2 ${className}`}
      data-testid="branded-footer"
    >
      {branding.footerText || `Powered by ${branding.companyName}`}
    </div>
  );
}
