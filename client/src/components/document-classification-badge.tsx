import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  Edit,
  Link as LinkIcon,
} from "lucide-react";

interface DocumentClassification {
  id: string;
  documentId: string;
  documentTypeId: string | null;
  classifiedType: string | null;
  classifiedCategory: string | null;
  confidence: number;
  status: string;
  extractedMetadata: Record<string, any> | null;
  matchedChecklistItems: { itemId: string; itemName: string; confidence: number }[] | null;
  autoAssigned: boolean;
  classifiedAt: string;
}

interface DocumentType {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface DocumentClassificationBadgeProps {
  documentId: string;
  dealId: string;
  showDetails?: boolean;
  onClassified?: (classification: DocumentClassification) => void;
}

export function DocumentClassificationBadge({
  documentId,
  dealId,
  showDetails = false,
  onClassified,
}: DocumentClassificationBadgeProps) {
  const { toast } = useToast();
  const [reclassifyOpen, setReclassifyOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: classification, isLoading } = useQuery<DocumentClassification>({
    queryKey: ["/api/documents", documentId, "classification"],
    enabled: !!documentId,
    retry: false,
  });

  const { data: documentTypes } = useQuery<DocumentType[]>({
    queryKey: ["/api/document-types"],
    enabled: reclassifyOpen,
  });

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/documents/${documentId}/classify`, { dealId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId, "classification"] });
      toast({ title: "Document Classified", description: `Type: ${data.classifiedType || 'Unknown'}` });
      if (onClassified) onClassified(data);
    },
    onError: (error: any) => {
      toast({ title: "Classification Failed", description: error.message, variant: "destructive" });
    },
  });

  const reclassifyMutation = useMutation({
    mutationFn: async (newClassification: string) => {
      const res = await apiRequest("POST", `/api/documents/${documentId}/reclassify`, { newClassification });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId, "classification"] });
      setReclassifyOpen(false);
      toast({ title: "Document Reclassified", description: "Classification updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-6 w-24" />;
  }

  if (!classification) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => classifyMutation.mutate()}
        disabled={classifyMutation.isPending}
        data-testid="button-classify-document"
      >
        {classifyMutation.isPending ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3 mr-1" />
        )}
        Classify
      </Button>
    );
  }

  const confidenceColor = classification.confidence >= 0.85 
    ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
    : classification.confidence >= 0.6
    ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
    : "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";

  const confidencePct = Math.round(classification.confidence * 100);

  if (!showDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={confidenceColor} data-testid="badge-classification">
            {classification.classifiedType || "Unclassified"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{classification.classifiedCategory}</p>
          <p className="text-xs text-muted-foreground">Confidence: {confidencePct}%</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            AI Classification
            {classification.autoAssigned && (
              <Badge variant="outline" className="ml-auto text-xs">Auto-Assigned</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{classification.classifiedType || "Unknown Type"}</p>
              <p className="text-sm text-muted-foreground">{classification.classifiedCategory}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setReclassifyOpen(true)}
              data-testid="button-reclassify"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Confidence</span>
              <span className={classification.confidence >= 0.85 ? "text-green-600" : classification.confidence >= 0.6 ? "text-yellow-600" : "text-red-600"}>
                {confidencePct}%
              </span>
            </div>
            <Progress value={confidencePct} className="h-1.5" />
          </div>

          {classification.matchedChecklistItems && classification.matchedChecklistItems.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                Matched Checklist Items
              </p>
              <div className="space-y-1">
                {classification.matchedChecklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="flex-1 truncate">{item.itemName}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(item.confidence * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classification.extractedMetadata && Object.keys(classification.extractedMetadata).length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Extracted Data
              </p>
              <div className="space-y-1 text-xs">
                {Object.entries(classification.extractedMetadata).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium truncate max-w-[150px]">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reclassifyOpen} onOpenChange={setReclassifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reclassify Document</DialogTitle>
            <DialogDescription>
              Override the AI classification with a manual selection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger data-testid="select-document-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name} ({type.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReclassifyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => reclassifyMutation.mutate(selectedType)}
              disabled={!selectedType || reclassifyMutation.isPending}
              data-testid="button-confirm-reclassify"
            >
              {reclassifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Classification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ClassificationResultsPanelProps {
  documentId: string;
  dealId: string;
}

export function ClassificationResultsPanel({ documentId, dealId }: ClassificationResultsPanelProps) {
  return (
    <DocumentClassificationBadge
      documentId={documentId}
      dealId={dealId}
      showDetails={true}
    />
  );
}
