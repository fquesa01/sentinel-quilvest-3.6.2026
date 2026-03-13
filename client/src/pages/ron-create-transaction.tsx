import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const steps = ["Details", "Jurisdiction", "Review"];

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

  const { data: deals } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ron/transactions", {
        ...form,
        dealId: form.dealId && form.dealId !== "none" ? form.dealId : undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ron/dashboard/stats"] });
      toast({ title: "Transaction created" });
      setLocation(`/ron/transactions/${data.id}`);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

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
              <Check className="h-5 w-5" /> Review & Create
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <p className="text-sm text-muted-foreground mt-4">
              After creating the transaction, you can upload documents, add signers, and schedule sessions.
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
