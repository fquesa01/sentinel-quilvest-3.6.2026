import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function EDiscoveryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState("");
  const [productionName, setProductionName] = useState("");
  const [exportFormat, setExportFormat] = useState("relativity");
  const [batesPrefix, setBatesPrefix] = useState("SENT");
  const [batesStart, setBatesStart] = useState("1");
  const { toast } = useToast();

  const { data: productionSets, isLoading } = useQuery({
    queryKey: ["/api/production-sets"],
  });

  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
  });

  const createProductionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/production-sets", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production-sets"] });
      toast({
        title: "Success",
        description: "Production set created successfully",
      });
      setDialogOpen(false);
      setProductionName("");
      setSelectedCase("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create production set",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!selectedCase || !productionName) {
      toast({
        title: "Validation Error",
        description: "Please select a case and enter a production name",
        variant: "destructive",
      });
      return;
    }

    const productionCount = (productionSets as any[])?.filter((p: any) => p.caseId === selectedCase).length || 0;
    const productionNumber = `PROD-${String(productionCount + 1).padStart(3, "0")}`;

    createProductionMutation.mutate({
      caseId: selectedCase,
      productionName,
      productionNumber,
      productionType: "initial",
      status: "draft",
      batesPrefix,
      batesStartNumber: parseInt(batesStart) || 1,
      batesPadding: 6,
      batesLevel: "page",
      exportFormat,
      renditionType: "native_pdf",
      includeNatives: true,
      includeText: true,
      includeMetadata: true,
      applyRedactions: true,
      redactionStyle: "black_box",
      validationStatus: "pending",
      documentCount: 0,
      pageCount: 0,
    } as any);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "secondary",
      in_progress: "default",
      validated: "default",
      transmitted: "default",
      completed: "default",
    };
    
    const icons: Record<string, any> = {
      draft: FileText,
      in_progress: AlertCircle,
      validated: CheckCircle,
      transmitted: Download,
      completed: CheckCircle,
    };

    const Icon = icons[status] || FileText;
    
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-none p-6 border-b border-border">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-ediscovery">
              Communication & Document Review
            </h1>
            <p className="text-muted-foreground mt-1">Create production sets with Bates numbering.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-production">
                <Plus className="h-4 w-4 mr-2" />
                Create Production Set
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Production Set</DialogTitle>
                <DialogDescription>
                  Configure a new production set for regulatory export (SEC/DOJ compliance)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="case">Case</Label>
                  <Select value={selectedCase} onValueChange={setSelectedCase}>
                    <SelectTrigger id="case" data-testid="select-case">
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cases as any[])?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseNumber} - {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Production Name</Label>
                  <Input
                    id="name"
                    data-testid="input-production-name"
                    value={productionName}
                    onChange={(e) => setProductionName(e.target.value)}
                    placeholder="e.g., Initial Production to SEC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bates-prefix">Bates Prefix</Label>
                    <Input
                      id="bates-prefix"
                      data-testid="input-bates-prefix"
                      value={batesPrefix}
                      onChange={(e) => setBatesPrefix(e.target.value)}
                      placeholder="SENT"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bates-start">Start Number</Label>
                    <Input
                      id="bates-start"
                      data-testid="input-bates-start"
                      type="number"
                      value={batesStart}
                      onChange={(e) => setBatesStart(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger id="format" data-testid="select-export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relativity">Relativity</SelectItem>
                      <SelectItem value="concordance">Concordance</SelectItem>
                      <SelectItem value="ipro">iPro</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Includes:</strong> Native files, PDF renditions, full text, metadata, privilege logs, and redactions (black box style)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={createProductionMutation.isPending}
                  data-testid="button-submit-production"
                >
                  {createProductionMutation.isPending ? "Creating..." : "Create Production Set"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Production Sets</CardTitle>
            <CardDescription>
              SEC/DOJ compliant export packages with Bates numbering and chain-of-custody tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productionSets && (productionSets as any[]).length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Production Number</TableHead>
                      <TableHead>Production Name</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead>Bates Range</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(productionSets as any[]).map((set: any) => {
                      const caseData = (cases as any[])?.find((c: any) => c.id === set.caseId);
                      const batesRange = set.batesEndNumber 
                        ? `${set.batesPrefix}-${String(set.batesStartNumber).padStart(set.batesPadding, "0")} to ${set.batesPrefix}-${String(set.batesEndNumber).padStart(set.batesPadding, "0")}`
                        : `${set.batesPrefix}-${String(set.batesStartNumber).padStart(set.batesPadding, "0")}`;
                      
                      return (
                        <TableRow key={set.id} data-testid={`row-production-${set.id}`}>
                          <TableCell className="font-mono font-medium">
                            {set.productionNumber}
                          </TableCell>
                          <TableCell>{set.productionName}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {caseData?.caseNumber || set.caseId}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {batesRange}
                          </TableCell>
                          <TableCell className="capitalize">
                            {set.exportFormat}
                          </TableCell>
                          <TableCell>
                            {set.documentCount} docs, {set.pageCount} pages
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(set.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(set.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-semibold">No Production Sets</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first production set to begin exporting case data for SEC/DOJ compliance
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="mt-4"
                  data-testid="button-create-first-production"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Production Set
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>About Production Sets</CardTitle>
            <CardDescription>
              SEC/DOJ compliant export workflow with complete chain-of-custody
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong className="text-foreground">Bates Numbering:</strong>
              <p className="text-muted-foreground">Every document and page receives a unique identifier (e.g., SENT-000001) for tracking and reference during investigations.</p>
            </div>
            <div>
              <strong className="text-foreground">Export Formats:</strong>
              <p className="text-muted-foreground">Relativity, Concordance, and iPro formats are industry-standard for regulatory submissions. CSV/JSON available for custom workflows.</p>
            </div>
            <div>
              <strong className="text-foreground">What's Included:</strong>
              <p className="text-muted-foreground">Native files, PDF renditions, extracted text, metadata fields, privilege logs, redactions, and hash manifests for verification.</p>
            </div>
            <div>
              <strong className="text-foreground">WORM Compliance:</strong>
              <p className="text-muted-foreground">All flagged communications are preserved in Write-Once-Read-Many format with tamper-evident audit trails per SEC Rule 17a-4.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
