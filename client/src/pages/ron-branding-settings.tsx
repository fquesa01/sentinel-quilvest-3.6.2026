import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Palette, Building2, CreditCard, Save, Loader2, Eye } from "lucide-react";
import type { Organization } from "@shared/schema";

export default function RonBrandingSettings() {
  const { toast } = useToast();

  const { data: org, isLoading } = useQuery<Organization | null>({
    queryKey: ["/api/my-organization"],
  });

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [companyName, setCompanyName] = useState("");
  const [footerText, setFooterText] = useState("");
  const [billingPlan, setBillingPlan] = useState("per_session");
  const [perSessionRate, setPerSessionRate] = useState("25.00");

  useEffect(() => {
    if (org) {
      setLogoUrl(org.logoUrl || "");
      setPrimaryColor(org.primaryColor || "#3b82f6");
      setCompanyName(org.companyName || org.name || "");
      setFooterText(org.footerText || "");
      setBillingPlan(org.billingPlan || "per_session");
      setPerSessionRate(((org.perSessionRate || 2500) / 100).toFixed(2));
    }
  }, [org]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error("No organization found");
      const res = await apiRequest("PATCH", `/api/ron/branding/${org.id}`, {
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        companyName: companyName || null,
        footerText: footerText || null,
        billingPlan,
        perSessionRate: Math.round(parseFloat(perSessionRate) * 100),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-organization"] });
      toast({ title: "Settings Saved", description: "Your branding and billing settings have been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No Organization Found</p>
            <p className="text-sm mt-1">You need to be part of an organization to configure branding settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" data-testid="ron-branding-settings-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-branding-title">
          <Palette className="h-6 w-6" />
          White-Label Branding & Billing
        </h1>
        <p className="text-muted-foreground">
          Customize how your organization appears to signers during RON sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Organization Branding
          </CardTitle>
          <CardDescription>
            These settings apply to all signer-facing pages including IDV, session lobby, and certificates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
              data-testid="input-company-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              data-testid="input-logo-url"
            />
            <p className="text-xs text-muted-foreground">Recommended size: 160x40px. Supports PNG, SVG, or JPEG.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Brand Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                id="primaryColor"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 rounded-md border cursor-pointer"
                data-testid="input-primary-color"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
                data-testid="input-primary-color-text"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Custom Footer Text</Label>
            <Textarea
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Powered by Your Company | NMLS #12345"
              rows={2}
              data-testid="input-footer-text"
            />
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4" /> Preview
            </p>
            <div className="border rounded-md p-4 space-y-3">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="h-8 max-w-[160px] object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    data-testid="img-logo-preview"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <span
                  className="font-semibold text-lg"
                  style={{ color: primaryColor || undefined }}
                  data-testid="text-preview-name"
                >
                  {companyName || org.name}
                </span>
              </div>
              {footerText && (
                <p className="text-xs text-muted-foreground text-center border-t pt-2" data-testid="text-preview-footer">
                  {footerText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Billing Configuration
          </CardTitle>
          <CardDescription>
            Configure how RON sessions are billed for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Billing Plan</Label>
            <Select value={billingPlan} onValueChange={setBillingPlan}>
              <SelectTrigger data-testid="select-billing-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_session">Per Session</SelectItem>
                <SelectItem value="monthly">Monthly Subscription</SelectItem>
                <SelectItem value="enterprise">Enterprise Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {billingPlan === "per_session" && (
            <div className="space-y-2">
              <Label htmlFor="perSessionRate">Per-Session Rate (USD)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="perSessionRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={perSessionRate}
                  onChange={(e) => setPerSessionRate(e.target.value)}
                  className="flex-1"
                  data-testid="input-per-session-rate"
                />
              </div>
              <p className="text-xs text-muted-foreground">Charged automatically when a RON session is completed</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-branding"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
