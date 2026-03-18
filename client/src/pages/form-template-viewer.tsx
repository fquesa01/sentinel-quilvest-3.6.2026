import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Download, Share2, FileText, Eye, Loader2, Check,
  AlertTriangle,
} from "lucide-react";
import type { FirmFormTemplate } from "@shared/schema";
import { ShareTemplateDialog } from "@/components/share-template-dialog";
import DOMPurify from "dompurify";

type TemplateWithMeta = Omit<FirmFormTemplate, "fileData"> & { hasFileData: boolean };

const DOCUMENT_TYPES: Record<string, string> = {
  closing_disclosure: "Closing Disclosure",
  deed: "Deed",
  bill_of_sale: "Bill of Sale",
  settlement_statement: "Settlement Statement",
  title_affidavit: "Title Affidavit",
  transfer_tax_declaration: "Transfer Tax Declaration",
  buyers_closing_certificate: "Buyer's Closing Certificate",
  sellers_closing_certificate: "Seller's Closing Certificate",
  sellers_affidavit: "Seller's Affidavit",
  promissory_note: "Promissory Note",
  mortgage: "Mortgage",
  security_agreement: "Security Agreement",
  ucc_financing_statement: "UCC Financing Statement",
  loan_agreement: "Loan Agreement",
  guaranty_agreement: "Guaranty Agreement",
  borrowers_certificate: "Borrower's Certificate",
  lenders_closing_certificate: "Lender's Closing Certificate",
  purchase_agreement: "Purchase Agreement",
  assignment_agreement: "Assignment Agreement",
  operating_agreement: "Operating Agreement",
  escrow_agreement: "Escrow Agreement",
  power_of_attorney: "Power of Attorney",
  affidavit_of_title: "Affidavit of Title",
  other: "Other",
};

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(template: TemplateWithMeta): boolean {
  return (
    template.mimeType === "application/pdf" ||
    (template.fileName?.toLowerCase().endsWith(".pdf") ?? false)
  );
}

function isWordFile(template: TemplateWithMeta): boolean {
  const fn = template.fileName?.toLowerCase() ?? "";
  return (
    template.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    template.mimeType === "application/msword" ||
    fn.endsWith(".docx") ||
    fn.endsWith(".doc")
  );
}

export default function FormTemplateViewerPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [templateNotes, setTemplateNotes] = useState("");
  const [notesInitialized, setNotesInitialized] = useState(false);

  const { data: template, isLoading, error } = useQuery<TemplateWithMeta>({
    queryKey: ["/api/form-templates", params.id],
    enabled: !!params.id,
  });

  if (template && !notesInitialized) {
    setTemplateNotes(template.notes || "");
    setNotesInitialized(true);
  }

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates", params.id] });
      toast({ title: "Notes saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error saving notes", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/transactions/form-templates")}
            data-testid="button-back-to-templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">Back to Templates</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Template not found or could not be loaded.</p>
            <Button variant="outline" onClick={() => navigate("/transactions/form-templates")} data-testid="button-return-templates">
              Return to Templates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const docTypeLabel = DOCUMENT_TYPES[template.documentType] ||
    template.documentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  const canRenderNativePdf = isPdfFile(template) && template.hasFileData;
  const hasExtractedContent = !!template.content;

  const sanitizedContent = useMemo(() => {
    if (!template.content) return "";
    return DOMPurify.sanitize(template.content, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
        "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "strong", "b", "em", "i", "u", "s", "del", "ins", "sub", "sup",
        "blockquote", "pre", "code", "a", "span", "div", "section", "article",
        "dl", "dt", "dd", "abbr", "cite", "q", "small", "mark", "figure", "figcaption",
        "caption", "col", "colgroup",
      ],
      ALLOWED_ATTR: [
        "href", "title", "class", "id", "colspan", "rowspan", "scope",
        "style", "align", "valign", "width", "height", "target", "rel",
      ],
      ALLOW_DATA_ATTR: false,
    });
  }, [template.content]);

  return (
    <div className="h-full flex flex-col" data-testid="template-viewer">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-4 flex-wrap sticky top-0 z-50 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/transactions/form-templates")}
            data-testid="button-back-to-templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-lg truncate" data-testid="text-viewer-title">
              {template.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{docTypeLabel}</Badge>
              {template.fileName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {template.fileName}
                  {template.fileSize ? ` (${formatFileSize(template.fileSize)})` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            data-testid="button-viewer-share"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          {template.hasFileData && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/form-templates/${template.id}/download`, "_blank")}
              data-testid="button-viewer-download"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {canRenderNativePdf ? (
          <iframe
            src={`/api/form-templates/${template.id}/view`}
            className="flex-1 w-full border-0"
            title={template.name}
            data-testid="iframe-pdf-viewer"
          />
        ) : hasExtractedContent ? (
          <div className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 md:px-12 md:py-12">
              {isPdfFile(template) && !template.hasFileData && (
                <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>
                    Showing extracted text. The original PDF is too large for native rendering.
                    {template.hasFileData ? "" : " Download the file for the full formatted version."}
                  </span>
                </div>
              )}
              {isWordFile(template) && (
                <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>Showing converted document content. Download the original file for full formatting.</span>
                </div>
              )}
              <article
                className="prose prose-lg dark:prose-invert max-w-none
                  prose-headings:font-semibold prose-headings:text-foreground
                  prose-p:leading-relaxed prose-p:text-foreground/90
                  prose-table:border prose-table:border-border
                  prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-th:bg-muted
                  prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2
                  prose-li:text-foreground/90"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                data-testid="content-document-viewer"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No preview content available for this template.</p>
              {template.hasFileData && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/form-templates/${template.id}/download`, "_blank")}
                  data-testid="button-download-fallback"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Original File
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3 bg-background">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground select-none" data-testid="toggle-notes">
            <span>Notes</span>
            {template.notes && <Badge variant="secondary" className="text-xs">Has notes</Badge>}
          </summary>
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Add notes about this template (usage instructions, revision reminders, context...)"
              value={templateNotes}
              onChange={(e) => setTemplateNotes(e.target.value)}
              rows={3}
              data-testid="textarea-viewer-notes"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => saveNotesMutation.mutate({ id: template.id, notes: templateNotes })}
                disabled={saveNotesMutation.isPending || templateNotes === (template.notes || "")}
                data-testid="button-save-viewer-notes"
              >
                {saveNotesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Save Notes
              </Button>
            </div>
          </div>
        </details>
      </div>

      {shareOpen && (
        <ShareTemplateDialog
          templateId={template.id}
          templateName={template.name}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}
    </div>
  );
}
