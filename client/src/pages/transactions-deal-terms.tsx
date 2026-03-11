import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Users,
  FileText,
  Save,
  Sparkles,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  FileSearch,
  Scale,
  Info,
  Building,
  MapPin,
  User,
  Briefcase,
  Clock,
  Shield,
  Scroll,
  AlertTriangle,
  Upload,
  X,
  Trash2,
} from "lucide-react";
import type { Deal, DealTerms, DataRoomDocument, DataRoom } from "@shared/schema";
import { format } from "date-fns";
import { GenerateDocumentDialog } from "@/components/generate-document-dialog";

type DealTermsWithCompletion = DealTerms & {
  completion?: { complete: number; total: number; percentage: number };
};

export default function TransactionsDealTerms() {
  const { id: dealId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "property", "parties", "financial", "dates"
  ]);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("select");

  const { data: deal, isLoading: dealLoading } = useQuery<Deal>({
    queryKey: ["/api/deals", dealId],
    enabled: !!dealId,
  });

  const { data: terms, isLoading: termsLoading, refetch: refetchTerms } = useQuery<DealTermsWithCompletion | null>({
    queryKey: ["/api/deals", dealId, "terms"],
    enabled: !!dealId,
  });

  const { data: dataRooms } = useQuery<DataRoom[]>({
    queryKey: ["/api/deals", dealId, "data-rooms"],
    enabled: !!dealId,
  });

  const firstDataRoom = dataRooms?.[0];

  const { data: dataRoomDocs, isLoading: docsLoading } = useQuery<DataRoomDocument[]>({
    queryKey: ["/api/data-rooms", firstDataRoom?.id, "documents"],
    enabled: !!firstDataRoom?.id,
  });

  const loiDocuments = dataRoomDocs?.filter(doc => 
    doc.fileName?.toLowerCase().includes('loi') || 
    doc.fileName?.toLowerCase().includes('letter of intent') ||
    doc.fileName?.toLowerCase().includes('term sheet')
  ) || [];

  const updateTermsMutation = useMutation({
    mutationFn: async (updates: Partial<DealTerms>) => {
      const res = await apiRequest("PATCH", `/api/deals/${dealId}/terms`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "terms"] });
      toast({ title: "Terms Updated", description: "Deal terms saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const extractTermsMutation = useMutation({
    mutationFn: async ({ documentId, sourceType }: { documentId: string; sourceType: string }) => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/terms/extract`, { documentId, sourceType });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "terms"] });
      setExtractDialogOpen(false);
      setSelectedDocumentId("");
      setUploadFile(null);
      toast({ 
        title: "Terms Extracted", 
        description: `Extracted with ${Math.round(data.confidence?.overall * 100)}% confidence.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
    },
  });

  // Upload mutation that uploads file, then selects it for extraction
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!firstDataRoom) {
        throw new Error("No data room available");
      }
      const formData = new FormData();
      formData.append("files", file);
      
      const res = await fetch(`/api/data-rooms/${firstDataRoom.id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed with status ${res.status}`);
      }
      
      const uploadedDocs = await res.json();
      if (!Array.isArray(uploadedDocs) || uploadedDocs.length === 0 || !uploadedDocs[0]?.id) {
        throw new Error("Upload succeeded but no document was returned");
      }
      
      return uploadedDocs[0];
    },
    onSuccess: async (uploadedDoc) => {
      // Invalidate and wait for documents list to refresh
      await queryClient.invalidateQueries({ queryKey: ["/api/data-rooms", firstDataRoom?.id, "documents"] });
      // Wait a bit for the query to refetch
      await queryClient.refetchQueries({ queryKey: ["/api/data-rooms", firstDataRoom?.id, "documents"] });
      
      // Select the uploaded document and switch to select tab
      setSelectedDocumentId(uploadedDoc.id);
      setShowAllDocuments(true); // Show all so the uploaded doc is visible
      setActiveTab("select");
      setUploadFile(null);
      toast({ 
        title: "Document Uploaded", 
        description: `"${uploadedDoc.fileName}" is ready. Click Extract Terms to continue.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    updateTermsMutation.mutate({ [field]: value });
  };

  const handleUploadClick = () => {
    if (uploadFile) {
      uploadMutation.mutate(uploadFile);
    }
  };

  const handleExtractClick = () => {
    if (!selectedDocumentId) {
      toast({ title: "Select a Document", description: "Please select a document to extract terms from.", variant: "destructive" });
      return;
    }
    extractTermsMutation.mutate({ documentId: selectedDocumentId, sourceType: 'loi' });
  };

  // Display documents based on toggle
  const displayDocuments = showAllDocuments ? (dataRoomDocs || []) : loiDocuments;

  if (dealLoading || termsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Deal not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionPct = terms?.completion?.percentage || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/transactions/deals/${dealId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Deal Terms</h1>
            <p className="text-muted-foreground">{deal.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            data-testid="button-generate-documents"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate Documents
          </Button>
          <Button
            variant="outline"
            onClick={() => setExtractDialogOpen(true)}
            disabled={extractTermsMutation.isPending}
            data-testid="button-extract-terms"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Extract from Document
          </Button>
          <Button
            onClick={() => refetchTerms()}
            variant="ghost"
            size="icon"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Terms Completion
              </CardTitle>
              <CardDescription>
                {terms?.completion?.complete || 0} of {terms?.completion?.total || 7} required fields completed
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{completionPct}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completionPct} className="h-2" />
          {terms?.sourceType && (
            <p className="text-xs text-muted-foreground mt-2">
              Source: {terms.sourceType === 'loi' ? 'Letter of Intent' : terms.sourceType === 'term_sheet' ? 'Term Sheet' : 'Manual Entry'}
              {terms.updatedAt && ` · Updated ${format(new Date(terms.updatedAt), "MMM d, yyyy")}`}
            </p>
          )}
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <Accordion
          type="multiple"
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-4"
        >
          <AccordionItem value="property" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold">Property Information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyName">Property Name</Label>
                  <Input
                    id="propertyName"
                    value={terms?.propertyName || ""}
                    onChange={(e) => handleFieldChange("propertyName", e.target.value)}
                    placeholder="Enter property name"
                    data-testid="input-property-name"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={terms?.propertyType || ""}
                    onValueChange={(v) => handleFieldChange("propertyType", v)}
                  >
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="multifamily">Multifamily</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="mixed_use">Mixed Use</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="propertyAddress">Address</Label>
                  <Input
                    id="propertyAddress"
                    value={terms?.propertyAddress || ""}
                    onChange={(e) => handleFieldChange("propertyAddress", e.target.value)}
                    placeholder="Street address"
                    data-testid="input-property-address"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyCity">City</Label>
                  <Input
                    id="propertyCity"
                    value={terms?.propertyCity || ""}
                    onChange={(e) => handleFieldChange("propertyCity", e.target.value)}
                    placeholder="City"
                    data-testid="input-property-city"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyState">State</Label>
                  <Input
                    id="propertyState"
                    value={terms?.propertyState || ""}
                    onChange={(e) => handleFieldChange("propertyState", e.target.value)}
                    placeholder="State"
                    data-testid="input-property-state"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyZip">ZIP Code</Label>
                  <Input
                    id="propertyZip"
                    value={terms?.propertyZip || ""}
                    onChange={(e) => handleFieldChange("propertyZip", e.target.value)}
                    placeholder="ZIP"
                    data-testid="input-property-zip"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyCounty">County</Label>
                  <Input
                    id="propertyCounty"
                    value={terms?.propertyCounty || ""}
                    onChange={(e) => handleFieldChange("propertyCounty", e.target.value)}
                    placeholder="County"
                    data-testid="input-property-county"
                  />
                </div>
                <div>
                  <Label htmlFor="squareFeet">Square Feet</Label>
                  <Input
                    id="squareFeet"
                    type="number"
                    value={terms?.squareFeet || ""}
                    onChange={(e) => handleFieldChange("squareFeet", parseInt(e.target.value) || null)}
                    placeholder="Total SF"
                    data-testid="input-square-feet"
                  />
                </div>
                <div>
                  <Label htmlFor="acreage">Acreage</Label>
                  <Input
                    id="acreage"
                    value={terms?.acreage || ""}
                    onChange={(e) => handleFieldChange("acreage", e.target.value)}
                    placeholder="Acres"
                    data-testid="input-acreage"
                  />
                </div>
                <div>
                  <Label htmlFor="units">Units</Label>
                  <Input
                    id="units"
                    type="number"
                    value={terms?.units || ""}
                    onChange={(e) => handleFieldChange("units", parseInt(e.target.value) || null)}
                    placeholder="Number of units"
                    data-testid="input-units"
                  />
                </div>
                <div>
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={terms?.yearBuilt || ""}
                    onChange={(e) => handleFieldChange("yearBuilt", parseInt(e.target.value) || null)}
                    placeholder="YYYY"
                    data-testid="input-year-built"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="parties" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold">Parties</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" /> Buyer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyerName">Entity Name</Label>
                      <Input
                        id="buyerName"
                        value={terms?.buyerName || ""}
                        onChange={(e) => handleFieldChange("buyerName", e.target.value)}
                        placeholder="Buyer entity name"
                        data-testid="input-buyer-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyerEntityType">Entity Type</Label>
                      <Select
                        value={terms?.buyerEntityType || ""}
                        onValueChange={(v) => handleFieldChange("buyerEntityType", v)}
                      >
                        <SelectTrigger data-testid="select-buyer-entity-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="lp">LP</SelectItem>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="trust">Trust</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="buyerStateOfFormation">State of Formation</Label>
                      <Input
                        id="buyerStateOfFormation"
                        value={terms?.buyerStateOfFormation || ""}
                        onChange={(e) => handleFieldChange("buyerStateOfFormation", e.target.value)}
                        placeholder="State"
                        data-testid="input-buyer-state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyerAddress">Address</Label>
                      <Input
                        id="buyerAddress"
                        value={terms?.buyerAddress || ""}
                        onChange={(e) => handleFieldChange("buyerAddress", e.target.value)}
                        placeholder="Address"
                        data-testid="input-buyer-address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyerSignerName">Signer Name</Label>
                      <Input
                        id="buyerSignerName"
                        value={terms?.buyerSignerName || ""}
                        onChange={(e) => handleFieldChange("buyerSignerName", e.target.value)}
                        placeholder="Authorized signatory"
                        data-testid="input-buyer-signer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="buyerSignerTitle">Signer Title</Label>
                      <Input
                        id="buyerSignerTitle"
                        value={terms?.buyerSignerTitle || ""}
                        onChange={(e) => handleFieldChange("buyerSignerTitle", e.target.value)}
                        placeholder="Title"
                        data-testid="input-buyer-signer-title"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" /> Seller
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sellerName">Entity Name</Label>
                      <Input
                        id="sellerName"
                        value={terms?.sellerName || ""}
                        onChange={(e) => handleFieldChange("sellerName", e.target.value)}
                        placeholder="Seller entity name"
                        data-testid="input-seller-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerEntityType">Entity Type</Label>
                      <Select
                        value={terms?.sellerEntityType || ""}
                        onValueChange={(v) => handleFieldChange("sellerEntityType", v)}
                      >
                        <SelectTrigger data-testid="select-seller-entity-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="lp">LP</SelectItem>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="trust">Trust</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sellerStateOfFormation">State of Formation</Label>
                      <Input
                        id="sellerStateOfFormation"
                        value={terms?.sellerStateOfFormation || ""}
                        onChange={(e) => handleFieldChange("sellerStateOfFormation", e.target.value)}
                        placeholder="State"
                        data-testid="input-seller-state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerAddress">Address</Label>
                      <Input
                        id="sellerAddress"
                        value={terms?.sellerAddress || ""}
                        onChange={(e) => handleFieldChange("sellerAddress", e.target.value)}
                        placeholder="Address"
                        data-testid="input-seller-address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerSignerName">Signer Name</Label>
                      <Input
                        id="sellerSignerName"
                        value={terms?.sellerSignerName || ""}
                        onChange={(e) => handleFieldChange("sellerSignerName", e.target.value)}
                        placeholder="Authorized signatory"
                        data-testid="input-seller-signer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellerSignerTitle">Signer Title</Label>
                      <Input
                        id="sellerSignerTitle"
                        value={terms?.sellerSignerTitle || ""}
                        onChange={(e) => handleFieldChange("sellerSignerTitle", e.target.value)}
                        placeholder="Title"
                        data-testid="input-seller-signer-title"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Escrow Agent
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="escrowAgentName">Company Name</Label>
                      <Input
                        id="escrowAgentName"
                        value={terms?.escrowAgentName || ""}
                        onChange={(e) => handleFieldChange("escrowAgentName", e.target.value)}
                        placeholder="Title company / escrow agent"
                        data-testid="input-escrow-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="escrowAgentContact">Contact Person</Label>
                      <Input
                        id="escrowAgentContact"
                        value={terms?.escrowAgentContact || ""}
                        onChange={(e) => handleFieldChange("escrowAgentContact", e.target.value)}
                        placeholder="Contact name"
                        data-testid="input-escrow-contact"
                      />
                    </div>
                    <div>
                      <Label htmlFor="escrowAgentEmail">Email</Label>
                      <Input
                        id="escrowAgentEmail"
                        type="email"
                        value={terms?.escrowAgentEmail || ""}
                        onChange={(e) => handleFieldChange("escrowAgentEmail", e.target.value)}
                        placeholder="email@example.com"
                        data-testid="input-escrow-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="escrowAgentAddress">Address</Label>
                      <Input
                        id="escrowAgentAddress"
                        value={terms?.escrowAgentAddress || ""}
                        onChange={(e) => handleFieldChange("escrowAgentAddress", e.target.value)}
                        placeholder="Address"
                        data-testid="input-escrow-address"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="financial" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">Financial Terms</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    value={terms?.purchasePrice || ""}
                    onChange={(e) => handleFieldChange("purchasePrice", e.target.value)}
                    placeholder="$0.00"
                    data-testid="input-purchase-price"
                  />
                </div>
                <div>
                  <Label htmlFor="initialDeposit">Initial Deposit</Label>
                  <Input
                    id="initialDeposit"
                    value={terms?.initialDeposit || ""}
                    onChange={(e) => handleFieldChange("initialDeposit", e.target.value)}
                    placeholder="$0.00"
                    data-testid="input-initial-deposit"
                  />
                </div>
                <div>
                  <Label htmlFor="initialDepositDays">Initial Deposit Due (Days)</Label>
                  <Input
                    id="initialDepositDays"
                    type="number"
                    value={terms?.initialDepositDays || ""}
                    onChange={(e) => handleFieldChange("initialDepositDays", parseInt(e.target.value) || null)}
                    placeholder="Business days after effective date"
                    data-testid="input-initial-deposit-days"
                  />
                </div>
                <div>
                  <Label htmlFor="additionalDeposit">Additional Deposit</Label>
                  <Input
                    id="additionalDeposit"
                    value={terms?.additionalDeposit || ""}
                    onChange={(e) => handleFieldChange("additionalDeposit", e.target.value)}
                    placeholder="$0.00"
                    data-testid="input-additional-deposit"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="additionalDepositTrigger">Additional Deposit Trigger</Label>
                  <Input
                    id="additionalDepositTrigger"
                    value={terms?.additionalDepositTrigger || ""}
                    onChange={(e) => handleFieldChange("additionalDepositTrigger", e.target.value)}
                    placeholder="e.g., Upon expiration of due diligence period"
                    data-testid="input-additional-deposit-trigger"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dates" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold">Key Dates & Periods</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={terms?.effectiveDate || ""}
                    onChange={(e) => handleFieldChange("effectiveDate", e.target.value)}
                    data-testid="input-effective-date"
                  />
                </div>
                <div>
                  <Label htmlFor="closingDate">Target Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    value={terms?.closingDate || ""}
                    onChange={(e) => handleFieldChange("closingDate", e.target.value)}
                    data-testid="input-closing-date"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDiligencePeriodDays">Due Diligence Period (Days)</Label>
                  <Input
                    id="dueDiligencePeriodDays"
                    type="number"
                    value={terms?.dueDiligencePeriodDays || ""}
                    onChange={(e) => handleFieldChange("dueDiligencePeriodDays", parseInt(e.target.value) || null)}
                    placeholder="Number of days"
                    data-testid="input-dd-days"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDiligenceExpiration">Due Diligence Expiration</Label>
                  <Input
                    id="dueDiligenceExpiration"
                    type="date"
                    value={terms?.dueDiligenceExpiration || ""}
                    onChange={(e) => handleFieldChange("dueDiligenceExpiration", e.target.value)}
                    data-testid="input-dd-expiration"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="hasFinancingContingency">Financing Contingency</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        id="hasFinancingContingency"
                        checked={terms?.hasFinancingContingency || false}
                        onCheckedChange={(v) => handleFieldChange("hasFinancingContingency", v)}
                        data-testid="switch-financing-contingency"
                      />
                      <span className="text-sm text-muted-foreground">
                        {terms?.hasFinancingContingency ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
                {terms?.hasFinancingContingency && (
                  <div>
                    <Label htmlFor="financingContingencyDays">Financing Contingency Period (Days)</Label>
                    <Input
                      id="financingContingencyDays"
                      type="number"
                      value={terms?.financingContingencyDays || ""}
                      onChange={(e) => handleFieldChange("financingContingencyDays", parseInt(e.target.value) || null)}
                      placeholder="Number of days"
                      data-testid="input-financing-days"
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="title" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Scroll className="h-5 w-5 text-primary" />
                <span className="font-semibold">Title & Survey</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titleObjectionPeriodDays">Title Objection Period (Days)</Label>
                  <Input
                    id="titleObjectionPeriodDays"
                    type="number"
                    value={terms?.titleObjectionPeriodDays || ""}
                    onChange={(e) => handleFieldChange("titleObjectionPeriodDays", parseInt(e.target.value) || null)}
                    placeholder="Days"
                    data-testid="input-title-objection-days"
                  />
                </div>
                <div>
                  <Label htmlFor="surveyObjectionPeriodDays">Survey Objection Period (Days)</Label>
                  <Input
                    id="surveyObjectionPeriodDays"
                    type="number"
                    value={terms?.surveyObjectionPeriodDays || ""}
                    onChange={(e) => handleFieldChange("surveyObjectionPeriodDays", parseInt(e.target.value) || null)}
                    placeholder="Days"
                    data-testid="input-survey-objection-days"
                  />
                </div>
                <div>
                  <Label htmlFor="titleCurePeriodDays">Title Cure Period (Days)</Label>
                  <Input
                    id="titleCurePeriodDays"
                    type="number"
                    value={terms?.titleCurePeriodDays || ""}
                    onChange={(e) => handleFieldChange("titleCurePeriodDays", parseInt(e.target.value) || null)}
                    placeholder="Days"
                    data-testid="input-title-cure-days"
                  />
                </div>
                <div>
                  <Label htmlFor="titleInsuranceAmount">Title Insurance Amount</Label>
                  <Input
                    id="titleInsuranceAmount"
                    value={terms?.titleInsuranceAmount || ""}
                    onChange={(e) => handleFieldChange("titleInsuranceAmount", e.target.value)}
                    placeholder="Coverage amount"
                    data-testid="input-title-insurance"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reps" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold">Representations & Warranties</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="repsSurvivalMonths">Survival Period (Months)</Label>
                  <Input
                    id="repsSurvivalMonths"
                    type="number"
                    value={terms?.repsSurvivalMonths || ""}
                    onChange={(e) => handleFieldChange("repsSurvivalMonths", parseInt(e.target.value) || null)}
                    placeholder="Months after closing"
                    data-testid="input-reps-survival"
                  />
                </div>
                <div>
                  <Label htmlFor="repsCap">Cap</Label>
                  <Input
                    id="repsCap"
                    value={terms?.repsCap || ""}
                    onChange={(e) => handleFieldChange("repsCap", e.target.value)}
                    placeholder="Maximum liability"
                    data-testid="input-reps-cap"
                  />
                </div>
                <div>
                  <Label htmlFor="repsBasket">Basket</Label>
                  <Input
                    id="repsBasket"
                    value={terms?.repsBasket || ""}
                    onChange={(e) => handleFieldChange("repsBasket", e.target.value)}
                    placeholder="Deductible/threshold"
                    data-testid="input-reps-basket"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="special" className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <span className="font-semibold">Special Conditions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div>
                <Label htmlFor="specialConditions">Special Conditions & Notes</Label>
                <Textarea
                  id="specialConditions"
                  value={Array.isArray(terms?.specialConditions) ? terms.specialConditions.join("\n") : ""}
                  onChange={(e) => handleFieldChange("specialConditions", e.target.value.split("\n").filter(Boolean))}
                  placeholder="Enter each condition on a new line..."
                  rows={6}
                  data-testid="textarea-special-conditions"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter each special condition on a separate line
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>

      <Dialog open={extractDialogOpen} onOpenChange={(open) => {
        setExtractDialogOpen(open);
        if (!open) {
          setUploadFile(null);
          setSelectedDocumentId("");
          setActiveTab("select");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Extract Deal Terms
            </DialogTitle>
            <DialogDescription>
              Select an existing document from the data room or upload a new one.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            setUploadFile(null);
            if (val === "upload") {
              setSelectedDocumentId("");
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select" data-testid="tab-select-document">
                <FileText className="h-4 w-4 mr-2" />
                Select Document
              </TabsTrigger>
              <TabsTrigger value="upload" data-testid="tab-upload-document">
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sourceDocument">Source Document</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-all" className="text-xs text-muted-foreground">
                    Show all
                  </Label>
                  <Switch 
                    id="show-all"
                    checked={showAllDocuments}
                    onCheckedChange={setShowAllDocuments}
                    data-testid="switch-show-all-docs"
                  />
                </div>
              </div>
              <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                <SelectTrigger data-testid="select-source-document">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {docsLoading ? (
                    <SelectItem value="_loading" disabled>Loading...</SelectItem>
                  ) : displayDocuments.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      {showAllDocuments ? "No documents in data room" : "No LOI/Term Sheet documents found"}
                    </SelectItem>
                  ) : (
                    displayDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.fileName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {showAllDocuments 
                  ? "Showing all documents in the data room" 
                  : "Showing documents with \"LOI\" or \"Term Sheet\" in the filename"}
              </p>
            </TabsContent>
            
            <TabsContent value="upload" className="space-y-4 pt-4">
              {!firstDataRoom ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <Info className="h-4 w-4 inline mr-1" />
                    No data room found for this deal. Create a data room first.
                  </p>
                </div>
              ) : uploadFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setUploadFile(null)}
                      disabled={uploadMutation.isPending}
                      data-testid="button-remove-file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click "Upload" to save to data room, then extract terms.
                  </p>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) setUploadFile(file);
                  }}
                >
                  <input
                    type="file"
                    id="extract-file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadFile(file);
                      e.target.value = "";
                    }}
                    data-testid="input-extract-file-upload"
                  />
                  <label htmlFor="extract-file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drop a file here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports PDF, DOC, DOCX, TXT
                    </p>
                  </label>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setExtractDialogOpen(false);
              setUploadFile(null);
              setSelectedDocumentId("");
              setActiveTab("select");
            }}>
              Cancel
            </Button>
            {activeTab === "upload" ? (
              <Button
                onClick={handleUploadClick}
                disabled={!uploadFile || uploadMutation.isPending}
                data-testid="button-upload-document"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            ) : (
              <Button
                onClick={handleExtractClick}
                disabled={!selectedDocumentId || extractTermsMutation.isPending}
                data-testid="button-confirm-extract"
              >
                {extractTermsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Extract Terms
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        dealId={dealId!}
        dealTitle={deal?.title || ""}
        dealType={deal?.dealType}
        representationRole={deal?.representationRole}
      />
    </div>
  );
}
