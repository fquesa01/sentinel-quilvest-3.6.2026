import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Stamp,
  FileText,
  Users,
  MapPin,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Link } from "wouter";
import type { Deal } from "@shared/schema";

const transactionTypes = [
  { value: "general_notarization", label: "General Notarization" },
  { value: "real_estate_closing", label: "Real Estate Closing" },
  { value: "loan_signing", label: "Loan Signing" },
  { value: "power_of_attorney", label: "Power of Attorney" },
  { value: "estate_planning", label: "Estate Planning" },
  { value: "corporate_documents", label: "Corporate Documents" },
  { value: "affidavit", label: "Affidavit" },
  { value: "other", label: "Other" },
];

const jurisdictions = [
  "FL", "TX", "VA", "CA", "NY", "AZ", "CO", "GA", "IL", "IN", "KY", "MA", "MD",
  "MI", "MN", "MO", "NC", "NJ", "NV", "OH", "OK", "OR", "PA", "TN", "UT", "WA", "WI",
];

const signerRoles = [
  { value: "signer", label: "Signer" },
  { value: "witness", label: "Witness" },
  { value: "observer", label: "Observer" },
  { value: "attorney_in_fact", label: "Attorney-in-Fact" },
  { value: "authorized_representative", label: "Authorized Representative" },
  { value: "gp", label: "General Partner (GP)" },
  { value: "lp", label: "Limited Partner (LP)" },
  { value: "counsel", label: "Counsel" },
  { value: "principal", label: "Principal" },
];

const docTypes = [
  { value: "general", label: "General" },
  { value: "deed", label: "Deed" },
  { value: "mortgage", label: "Mortgage" },
  { value: "power_of_attorney", label: "Power of Attorney" },
  { value: "affidavit", label: "Affidavit" },
  { value: "trust", label: "Trust Document" },
  { value: "closing_disclosure", label: "Closing Disclosure" },
  { value: "note", label: "Promissory Note" },
];

interface SignerEntry {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  signingOrder: number;
}

interface DocEntry {
  file: File;
  title: string;
  documentType: string;
}

const steps = ["Details", "Jurisdiction", "Signers", "Documents", "Review"];

export default function RonCreateTransaction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    title: "",
    transactionType: "general_notarization",
    dealId: "",
    jurisdiction: "FL",
    notes: "",
    signingOrderMode: "parallel" as "parallel" | "sequential",
  });

  const [signers, setSigners] = useState<SignerEntry[]>([]);
  const [signerDraft, setSignerDraft] = useState<SignerEntry>({
    firstName: "", lastName: "", email: "", phone: "", role: "signer", signingOrder: 1,
  });

  const [documents, setDocuments] = useState<DocEntry[]>([]);

  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ron/transactions", {
        title: form.title,
        transactionType: form.transactionType,
        jurisdiction: form.jurisdiction,
        signingOrder: form.signingOrderMode,
        dealId: form.dealId && form.dealId !== "none" ? form.dealId : undefined,
        notes: form.notes,
      });
      const txn: { id: string } = await res.json();

      for (const signer of signers) {
        await apiRequest("POST", `/api/ron/transactions/${txn.id}/signers`, signer);
      }

      const failedUploads: string[] = [];
      for (const doc of documents) {
        const formData = new FormData();
        formData.append("file", doc.file);
        formData.append("title", doc.title || doc.file.name);
        formData.append("documentType", doc.documentType);
        const uploadRes = await fetch(`/api/ron/transactions/${txn.id}/documents`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({ message: "Upload failed" }));
          failedUploads.push(`${doc.file.name}: ${errBody.message || "Upload failed"}`);
        }
      }
      if (failedUploads.length > 0) {
        throw new Error(`Document upload errors: ${failedUploads.join("; ")}`);
      }

      return txn;
    },
    onSuccess: (data: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/dashboard/stats"] });
      toast({ title: "Transaction created" });
      setLocation(`/ron/transactions/${data.id}`);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const addSigner = () => {
    if (!signerDraft.firstName || !signerDraft.lastName || !signerDraft.email) return;
    setSigners([...signers, { ...signerDraft, signingOrder: signers.length + 1 }]);
    setSignerDraft({ firstName: "", lastName: "", email: "", phone: "", role: "signer", signingOrder: signers.length + 2 });
  };

  const removeSigner = (idx: number) => {
    setSigners(signers.filter((_, i) => i !== idx));
  };

  const addDocument = (file: File) => {
    setDocuments([...documents, { file, title: file.name.replace(/\.[^.]+$/, ""), documentType: "general" }]);
  };

  const removeDocument = (idx: number) => {
    setDocuments(documents.filter((_, i) => i !== idx));
  };

  const updateDocType = (idx: number, type: string) => {
    setDocuments(documents.map((d, i) => i === idx ? { ...d, documentType: type } : d));
  };

  const updateDocTitle = (idx: number, title: string) => {
    setDocuments(documents.map((d, i) => i === idx ? { ...d, title } : d));
  };

  const canProceed = () => {
    if (currentStep === 0) return !!form.title.trim();
    return true;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6" data-testid="ron-create-transaction-page">
      <div className="flex items-center gap-3">
        <Link href="/ron/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Notarization Transaction</h1>
          <p className="text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded-full ${
              i <= currentStep ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-2 justify-center flex-wrap">
        {steps.map((step, i) => (
          <Badge
            key={step}
            variant={i === currentStep ? "default" : "outline"}
            className={`text-xs cursor-pointer ${i < currentStep ? "border-primary/50" : ""}`}
            onClick={() => { if (i <= currentStep || canProceed()) setCurrentStep(i); }}
          >
            {i < currentStep ? <Check className="h-3 w-3 mr-1" /> : null}
            {step}
          </Badge>
        ))}
      </div>

      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stamp className="h-5 w-5" /> Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Transaction Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Smith Property Closing"
                data-testid="input-txn-title"
              />
            </div>
            <div>
              <Label>Transaction Type</Label>
              <Select value={form.transactionType} onValueChange={(v) => setForm({ ...form, transactionType: v })}>
                <SelectTrigger data-testid="select-txn-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Deal (optional)</Label>
              <Select value={form.dealId} onValueChange={(v) => setForm({ ...form, dealId: v })}>
                <SelectTrigger data-testid="select-deal-link">
                  <SelectValue placeholder="No deal linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal linked</SelectItem>
                  {deals?.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>{deal.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                data-testid="input-txn-notes"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Jurisdiction & Signing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Jurisdiction (State) *</Label>
              <Select value={form.jurisdiction} onValueChange={(v) => setForm({ ...form, jurisdiction: v })}>
                <SelectTrigger data-testid="select-jurisdiction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jurisdictions.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Signing Order Mode</Label>
              <Select
                value={form.signingOrderMode}
                onValueChange={(v: "parallel" | "sequential") => setForm({ ...form, signingOrderMode: v })}
              >
                <SelectTrigger data-testid="select-signing-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parallel">Parallel (all signers at once)</SelectItem>
                  <SelectItem value="sequential">Sequential (in order)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Signers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signers.length > 0 && (
              <div className="space-y-2">
                {signers.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.email} &middot; {signerRoles.find(r => r.value === s.role)?.label || s.role}
                        {form.signingOrderMode === "sequential" && ` &middot; Order: ${s.signingOrder}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSigner(idx)} data-testid={`button-remove-signer-${idx}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Add a signer</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">First Name *</Label>
                  <Input
                    value={signerDraft.firstName}
                    onChange={(e) => setSignerDraft({ ...signerDraft, firstName: e.target.value })}
                    data-testid="input-signer-first-name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Last Name *</Label>
                  <Input
                    value={signerDraft.lastName}
                    onChange={(e) => setSignerDraft({ ...signerDraft, lastName: e.target.value })}
                    data-testid="input-signer-last-name"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={signerDraft.email}
                  onChange={(e) => setSignerDraft({ ...signerDraft, email: e.target.value })}
                  data-testid="input-signer-email"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={signerDraft.phone}
                    onChange={(e) => setSignerDraft({ ...signerDraft, phone: e.target.value })}
                    data-testid="input-signer-phone"
                  />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={signerDraft.role} onValueChange={(v) => setSignerDraft({ ...signerDraft, role: v })}>
                    <SelectTrigger data-testid="select-signer-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {signerRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addSigner}
                disabled={!signerDraft.firstName || !signerDraft.lastName || !signerDraft.email}
                data-testid="button-add-signer"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Signer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also add signers after creating the transaction.
            </p>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-md border border-border">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Input
                        value={doc.title}
                        onChange={(e) => updateDocTitle(idx, e.target.value)}
                        className="text-sm"
                        data-testid={`input-doc-title-${idx}`}
                      />
                      <div className="flex items-center gap-2">
                        <Select value={doc.documentType} onValueChange={(v) => updateDocType(idx, v)}>
                          <SelectTrigger className="w-[180px]" data-testid={`select-doc-type-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {docTypes.map((dt) => (
                              <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground truncate">{doc.file.name}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeDocument(idx)} data-testid={`button-remove-doc-${idx}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border border-dashed border-border rounded-md p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">Upload documents for notarization</p>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.doc,.docx"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    Array.from(files).forEach(addDocument);
                  }
                  e.target.value = "";
                }}
                data-testid="input-doc-upload"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can also upload documents after creating the transaction.
            </p>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" /> Review & Create
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Title</p>
                <p className="font-medium">{form.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">
                  {transactionTypes.find(t => t.value === form.transactionType)?.label}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Jurisdiction</p>
                <p className="font-medium">{form.jurisdiction}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Signing Order</p>
                <p className="font-medium capitalize">{form.signingOrderMode}</p>
              </div>
              {form.dealId && form.dealId !== "none" && deals && (
                <div>
                  <p className="text-muted-foreground">Linked Deal</p>
                  <p className="font-medium">{deals.find(d => d.id === form.dealId)?.title || "Unknown"}</p>
                </div>
              )}
              {form.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="font-medium">{form.notes}</p>
                </div>
              )}
            </div>

            {signers.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-2">Signers ({signers.length})</p>
                <div className="space-y-1">
                  {signers.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{s.firstName} {s.lastName}</span>
                      <span className="text-muted-foreground">&middot; {s.email}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {signerRoles.find(r => r.value === s.role)?.label || s.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length > 0 && (
              <div>
                <p className="text-muted-foreground text-sm mb-2">Documents ({documents.length})</p>
                <div className="space-y-1">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md border border-border">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {docTypes.find(dt => dt.value === doc.documentType)?.label || doc.documentType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-4">
              After creating the transaction, you can schedule sessions and manage document annotations.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          data-testid="button-prev-step"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            data-testid="button-next-step"
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            data-testid="button-create-transaction"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Transaction
          </Button>
        )}
      </div>
    </div>
  );
}
