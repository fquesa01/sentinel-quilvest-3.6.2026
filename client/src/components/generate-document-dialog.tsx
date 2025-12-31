import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  Download,
  Eye,
} from "lucide-react";
import type { GeneratedDocument } from "@shared/schema";
import { format } from "date-fns";

interface DocumentType {
  id: string;
  name: string;
  description: string;
}

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle: string;
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  dealId,
  dealTitle,
}: GenerateDocumentDialogProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  const { data: documentTypes, isLoading: typesLoading } = useQuery<DocumentType[]>({
    queryKey: ["/api/document-generation/types"],
    enabled: open,
  });

  const { data: generatedDocs, isLoading: docsLoading, refetch: refetchDocs } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/deals", dealId, "generated-documents"],
    enabled: open,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/deals/${dealId}/generate-document`, {
        documentType: selectedType,
        customInstructions: customInstructions || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals", dealId, "generated-documents"] });
      toast({
        title: "Document Generated",
        description: `${data.documentName} has been generated successfully.`,
      });
      setSelectedType(null);
      setCustomInstructions("");
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedType) {
      toast({
        title: "Select a Document Type",
        description: "Please select a document type to generate.",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    review: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
    approved: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
    executed: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Transaction Documents
          </DialogTitle>
          <DialogDescription>
            Generate legal documents for {dealTitle} using AI-powered templates and extracted deal terms.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh] pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">Select Document Type</h3>
              {typesLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {documentTypes?.map((type) => (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedType === type.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedType(type.id)}
                      data-testid={`card-doc-type-${type.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedType === type.id ? "bg-primary/20" : "bg-muted"
                          }`}>
                            <FileCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                          {selectedType === type.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {selectedType && (
              <div>
                <Label htmlFor="customInstructions">Additional Instructions (Optional)</Label>
                <Textarea
                  id="customInstructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Add any specific requirements or modifications for this document..."
                  rows={3}
                  className="mt-2"
                  data-testid="textarea-custom-instructions"
                />
              </div>
            )}

            {generatedDocs && generatedDocs.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Previously Generated Documents</h3>
                <div className="space-y-2">
                  {generatedDocs.map((doc) => (
                    <Card key={doc.id} className="p-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.documentName}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {doc.generatedAt && format(new Date(doc.generatedAt), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColors[doc.status || "draft"]}>
                            {doc.status || "draft"}
                          </Badge>
                          <Button size="icon" variant="ghost" data-testid={`button-view-${doc.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!typesLoading && generatedDocs?.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents have been generated yet.</p>
                <p className="text-sm">Select a document type above to get started.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedType || generateMutation.isPending}
            data-testid="button-generate-document"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface GeneratedDocumentViewerProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeneratedDocumentViewer({
  documentId,
  open,
  onOpenChange,
}: GeneratedDocumentViewerProps) {
  const { data: document, isLoading } = useQuery<GeneratedDocument>({
    queryKey: ["/api/generated-documents", documentId],
    enabled: open && !!documentId,
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-96" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{document?.documentName}</DialogTitle>
          <DialogDescription>
            Generated on {document?.generatedAt && format(new Date(document.generatedAt), "MMMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh]">
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-mono text-sm">
            {document?.generatedContent || "No content available."}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button data-testid="button-download-document">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
