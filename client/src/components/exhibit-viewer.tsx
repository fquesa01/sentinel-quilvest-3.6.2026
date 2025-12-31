import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Paperclip,
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Languages,
} from "lucide-react";
import { format } from "date-fns";

type Attachment = {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  url?: string;
  content?: string;
  uploadedAt?: string;
};

type Communication = {
  id: string;
  subject: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  attachmentIds?: any;
  containsAttachments?: string;
  attachmentCount?: number;
  originalLanguage?: string;
  translatedBody?: string;
  isTranslated?: string;
};

type ExhibitViewerProps = {
  primaryDocument: Communication;
  attachments?: Attachment[];
  onDownload?: (attachmentId: string) => void;
};

export function ExhibitViewer({
  primaryDocument,
  attachments = [],
  onDownload,
}: ExhibitViewerProps) {
  const [currentExhibit, setCurrentExhibit] = useState<'primary' | number>('primary');
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{ subject: string; body: string } | null>(null);
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("POST", `/api/communications/${docId}/translate`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      setTranslatedContent({
        subject: data.translatedSubject,
        body: data.translatedBody,
      });
      setShowTranslation(true);
      toast({
        title: "Translation Complete",
        description: `Translated from ${data.originalLanguage || "detected language"} to English`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Translation Error",
        description: error.message || "Failed to translate document",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <Image className="h-4 w-4" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (fileType.includes('code') || fileType.includes('text')) return <FileCode className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const exhibitCount = attachments.length;
  const hasExhibits = exhibitCount > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Exhibit Navigation Header */}
      {hasExhibits && (
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" data-testid="badge-exhibit-count">
                <Paperclip className="h-3 w-3 mr-1" />
                {exhibitCount} Exhibit{exhibitCount > 1 ? 's' : ''}
              </Badge>
              {currentExhibit !== 'primary' && (
                <span className="text-sm text-muted-foreground">
                  Viewing: Exhibit {(currentExhibit as number) + 1} of {exhibitCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentExhibit === 'primary') {
                    setCurrentExhibit(attachments.length - 1);
                  } else if (currentExhibit === 0) {
                    setCurrentExhibit('primary');
                  } else {
                    setCurrentExhibit((currentExhibit as number) - 1);
                  }
                }}
                data-testid="button-prev-exhibit"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentExhibit('primary')}
                disabled={currentExhibit === 'primary'}
                data-testid="button-primary-doc"
              >
                Primary
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentExhibit === 'primary') {
                    setCurrentExhibit(0);
                  } else if (currentExhibit === attachments.length - 1) {
                    setCurrentExhibit('primary');
                  } else {
                    setCurrentExhibit((currentExhibit as number) + 1);
                  }
                }}
                data-testid="button-next-exhibit"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <Tabs value={currentExhibit === 'primary' ? 'primary' : 'exhibit'} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger
            value="primary"
            onClick={() => setCurrentExhibit('primary')}
            data-testid="tab-primary-document"
          >
            <FileText className="h-4 w-4 mr-2" />
            Primary Document
          </TabsTrigger>
          {hasExhibits && (
            <TabsTrigger value="exhibit" data-testid="tab-exhibits">
              <Paperclip className="h-4 w-4 mr-2" />
              Exhibits ({exhibitCount})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Primary Document Content */}
        <TabsContent value="primary" className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4" data-testid="primary-document-content">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h2 className="text-2xl font-bold">
                      {showTranslation && translatedContent ? translatedContent.subject : primaryDocument.subject}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>From: {primaryDocument.sender}</span>
                      <span>{format(new Date(primaryDocument.timestamp), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    {primaryDocument.recipients && primaryDocument.recipients.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">To: </span>
                        <span>{primaryDocument.recipients.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {primaryDocument.originalLanguage && (
                      <Badge variant="outline" data-testid="badge-original-language">
                        {primaryDocument.originalLanguage}
                      </Badge>
                    )}
                    {showTranslation ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTranslation(false)}
                        data-testid="button-show-original"
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        Show Original
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (translatedContent) {
                            setShowTranslation(true);
                          } else {
                            translateMutation.mutate(primaryDocument.id);
                          }
                        }}
                        disabled={translateMutation.isPending}
                        data-testid="button-translate"
                      >
                        <Languages className="h-4 w-4 mr-2" />
                        {translateMutation.isPending ? "Translating..." : "Translate to English"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
              {showTranslation && translatedContent && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                    <Languages className="h-4 w-4" />
                    <span className="font-medium">English Translation</span>
                  </div>
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {showTranslation && translatedContent ? translatedContent.body : primaryDocument.body}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Exhibits Content */}
        {hasExhibits && (
          <TabsContent value="exhibit" className="flex-1 p-0">
            {currentExhibit !== 'primary' ? (
              // Show selected exhibit
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4" data-testid="exhibit-content">
                  {(() => {
                    const attachment = attachments[currentExhibit as number];
                    return (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getFileIcon(attachment.fileType)}
                              <h3 className="text-lg font-semibold">{attachment.filename}</h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{attachment.fileType}</span>
                              <span>{formatFileSize(attachment.fileSize)}</span>
                              {attachment.uploadedAt && (
                                <span>{format(new Date(attachment.uploadedAt), 'MMM d, yyyy')}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {attachment.url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(attachment.url, '_blank')}
                                data-testid="button-open-exhibit"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDownload?.(attachment.id)}
                              data-testid="button-download-exhibit"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        {attachment.content ? (
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{attachment.content}</pre>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Preview not available for this file type</p>
                            <p className="text-xs mt-1">Download to view the complete file</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </ScrollArea>
            ) : (
              // Show all exhibits list
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2" data-testid="exhibits-list">
                  {attachments.map((attachment, index) => (
                    <button
                      key={attachment.id}
                      onClick={() => setCurrentExhibit(index)}
                      className="w-full text-left p-3 rounded-lg border border-border hover-elevate active-elevate-2 transition-colors"
                      data-testid={`exhibit-item-${index}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getFileIcon(attachment.fileType)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{attachment.filename}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Badge variant="outline" className="text-xs">
                              Exhibit {index + 1}
                            </Badge>
                            <span>{attachment.fileType}</span>
                            <span>{formatFileSize(attachment.fileSize)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload?.(attachment.id);
                          }}
                          data-testid={`button-download-exhibit-${index}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
