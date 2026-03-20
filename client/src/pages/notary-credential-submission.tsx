import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Upload,
  CheckCircle2,
  FileText,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

const stateOptions = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const languageOptions = ["English", "Spanish", "French", "Portuguese", "Mandarin", "Korean", "Japanese", "Vietnamese", "Arabic", "Russian", "German"];

const DOC_TYPES = [
  { key: "commission_cert", label: "Commission Certificate", required: true },
  { key: "bond_cert", label: "Surety Bond Document", required: false },
  { key: "eo_insurance_cert", label: "E&O Insurance Certificate", required: false },
  { key: "training_cert", label: "RON Training Certificate", required: false },
  { key: "background_check", label: "Background Check", required: false },
  { key: "seal_image", label: "Notary Seal Image", required: false },
  { key: "signature_image", label: "Signature Image", required: false },
] as const;

export default function NotaryCredentialSubmission() {
  const [, params] = useRoute("/notary/onboard/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    commissionState: "",
    commissionNumber: "",
    commissionExpiration: "",
    notarizationType: "both",
    languages: ["English"],
    bondAmount: "",
    bondExpiration: "",
    eoInsuranceAmount: "",
    eoInsuranceExpiration: "",
    ronTrainingCompleted: false,
    ronTrainingDate: "",
  });

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: invitation, isLoading, error } = useQuery<{ email: string; expiresAt: string; status: string }>({
    queryKey: ["/api/ron/public/validate-invitation", token],
    queryFn: async () => {
      const res = await fetch(`/api/ron/public/validate-invitation/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("firstName", formData.firstName);
      fd.append("lastName", formData.lastName);
      fd.append("email", formData.email || invitation?.email || "");
      fd.append("phone", formData.phone);
      fd.append("commissionState", formData.commissionState);
      fd.append("commissionNumber", formData.commissionNumber);
      if (formData.commissionExpiration) fd.append("commissionExpiration", formData.commissionExpiration);
      fd.append("notarizationType", formData.notarizationType);
      fd.append("languages", JSON.stringify(formData.languages));
      if (formData.bondAmount) fd.append("bondAmount", formData.bondAmount);
      if (formData.bondExpiration) fd.append("bondExpiration", formData.bondExpiration);
      if (formData.eoInsuranceAmount) fd.append("eoInsuranceAmount", formData.eoInsuranceAmount);
      if (formData.eoInsuranceExpiration) fd.append("eoInsuranceExpiration", formData.eoInsuranceExpiration);
      fd.append("ronTrainingCompleted", String(formData.ronTrainingCompleted));
      if (formData.ronTrainingDate) fd.append("ronTrainingDate", formData.ronTrainingDate);

      for (const [key, file] of Object.entries(files)) {
        if (file) fd.append(key, file);
      }

      const res = await fetch(`/api/ron/public/submit-credentials/${token}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Credentials Submitted", description: "Your credentials have been submitted for review." });
    },
    onError: (error: Error) => {
      toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (docType: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.commissionState) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!files["commission_cert"]) {
      toast({ title: "Missing Document", description: "Commission certificate is required.", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  const toggleLanguage = (lang: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background" data-testid="notary-submission-loading">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Validating invitation...</span>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="max-w-md w-full mx-4 p-8 text-center" data-testid="notary-submission-error">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Link Unavailable</h2>
          <p className="text-muted-foreground text-sm">
            {(error as Error)?.message || "This invitation link is invalid or has expired."}
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b px-6 py-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">NOTARY CREDENTIAL SUBMISSION</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center" data-testid="notary-submission-success">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 dark:text-green-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Credentials Submitted</h2>
            <p className="text-muted-foreground text-sm">
              Your credentials have been submitted successfully. An administrator will review your documents and update your status.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="notary-submission-page">
      <header className="border-b px-6 py-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">NOTARY CREDENTIAL SUBMISSION</span>
      </header>

      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-submission-title">Submit Your Notary Credentials</h1>
          <p className="text-muted-foreground mt-1">
            Please complete this form with your notary information and upload supporting documents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    data-testid="input-notary-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    data-testid="input-notary-last-name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || invitation.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!invitation.email}
                    data-testid="input-notary-email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="input-notary-phone"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Commission State *</Label>
                  <Select value={formData.commissionState} onValueChange={(v) => setFormData({ ...formData, commissionState: v })}>
                    <SelectTrigger data-testid="select-commission-state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="commissionNumber" className="text-xs">Commission Number</Label>
                  <Input
                    id="commissionNumber"
                    value={formData.commissionNumber}
                    onChange={(e) => setFormData({ ...formData, commissionNumber: e.target.value })}
                    data-testid="input-commission-number"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="commissionExpiration" className="text-xs">Commission Expiration</Label>
                <Input
                  id="commissionExpiration"
                  type="date"
                  value={formData.commissionExpiration}
                  onChange={(e) => setFormData({ ...formData, commissionExpiration: e.target.value })}
                  data-testid="input-commission-expiration"
                />
              </div>
              <div>
                <Label className="text-xs">Notarization Type</Label>
                <Select value={formData.notarizationType} onValueChange={(v) => setFormData({ ...formData, notarizationType: v })}>
                  <SelectTrigger data-testid="select-notarization-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person Only</SelectItem>
                    <SelectItem value="virtual">Virtual/RON Only</SelectItem>
                    <SelectItem value="both">Both In-Person & Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Languages</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {languageOptions.map((lang) => (
                    <Badge
                      key={lang}
                      className={`cursor-pointer toggle-elevate ${formData.languages.includes(lang) ? "toggle-elevated bg-primary text-primary-foreground" : ""}`}
                      variant={formData.languages.includes(lang) ? "default" : "outline"}
                      onClick={() => toggleLanguage(lang)}
                      data-testid={`badge-lang-${lang.toLowerCase()}`}
                    >
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bond & Insurance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bondAmount" className="text-xs">Bond Amount ($)</Label>
                  <Input
                    id="bondAmount"
                    type="number"
                    value={formData.bondAmount}
                    onChange={(e) => setFormData({ ...formData, bondAmount: e.target.value })}
                    data-testid="input-bond-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="bondExpiration" className="text-xs">Bond Expiration</Label>
                  <Input
                    id="bondExpiration"
                    type="date"
                    value={formData.bondExpiration}
                    onChange={(e) => setFormData({ ...formData, bondExpiration: e.target.value })}
                    data-testid="input-bond-expiration"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eoInsuranceAmount" className="text-xs">E&O Insurance Amount ($)</Label>
                  <Input
                    id="eoInsuranceAmount"
                    type="number"
                    value={formData.eoInsuranceAmount}
                    onChange={(e) => setFormData({ ...formData, eoInsuranceAmount: e.target.value })}
                    data-testid="input-eo-insurance-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="eoInsuranceExpiration" className="text-xs">E&O Insurance Expiration</Label>
                  <Input
                    id="eoInsuranceExpiration"
                    type="date"
                    value={formData.eoInsuranceExpiration}
                    onChange={(e) => setFormData({ ...formData, eoInsuranceExpiration: e.target.value })}
                    data-testid="input-eo-insurance-expiration"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">RON Training</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="ronTrainingCompleted"
                  checked={formData.ronTrainingCompleted}
                  onChange={(e) => setFormData({ ...formData, ronTrainingCompleted: e.target.checked })}
                  className="h-4 w-4"
                  data-testid="checkbox-ron-training"
                />
                <Label htmlFor="ronTrainingCompleted" className="text-sm">I have completed RON training</Label>
              </div>
              {formData.ronTrainingCompleted && (
                <div>
                  <Label htmlFor="ronTrainingDate" className="text-xs">Training Completion Date</Label>
                  <Input
                    id="ronTrainingDate"
                    type="date"
                    value={formData.ronTrainingDate}
                    onChange={(e) => setFormData({ ...formData, ronTrainingDate: e.target.value })}
                    data-testid="input-ron-training-date"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supporting Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Upload your certification documents. Accepted formats: PDF, JPG, PNG (max 50MB each).
              </p>
              {DOC_TYPES.map(({ key, label, required }) => (
                <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}{required ? " *" : ""}</p>
                      {files[key] && (
                        <p className="text-xs text-muted-foreground truncate">{files[key]!.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {files[key] ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Selected
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleFileSelect(key, null)}
                          data-testid={`button-remove-${key}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          ref={(el) => { fileRefs.current[key] = el; }}
                          onChange={(e) => handleFileSelect(key, e.target.files?.[0] || null)}
                          data-testid={`input-file-${key}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileRefs.current[key]?.click()}
                          data-testid={`button-upload-${key}`}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={submitMutation.isPending}
            data-testid="button-submit-credentials"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit Credentials"
            )}
          </Button>
        </form>
      </div>

      <footer className="border-t px-6 py-3 text-center text-xs text-muted-foreground">
        Secure Notary Credential Submission Portal
      </footer>
    </div>
  );
}
