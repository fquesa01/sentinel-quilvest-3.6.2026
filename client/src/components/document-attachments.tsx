import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Paperclip, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Download,
  Eye,
  Image as ImageIcon,
  FileImage
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Attachment = {
  id: string;
  subject: string;
  communicationType: string;
  timestamp: string;
  metadata?: any;
  sourceMetadata?: any;
  parentDocumentId: string;
};

interface DocumentAttachmentsProps {
  documentId: string;
  attachmentIds?: string[];
  attachmentCount?: number;
}

export function DocumentAttachments({ 
  documentId, 
  attachmentIds = [], 
  attachmentCount = 0 
}: DocumentAttachmentsProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [viewMode, setViewMode] = useState<'native' | 'converted'>('converted');

  // Fetch attachments if we have attachment IDs
  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['/api/communications/attachments', documentId],
    enabled: attachmentCount > 0 && attachmentIds.length > 0,
  });

  const getFileIcon = (type: string, metadata?: any) => {
    const fileName = metadata?.fileName || metadata?.original_filename || '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

    if (['xlsx', 'xls', 'csv'].includes(fileExt)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    } else if (['pdf'].includes(fileExt)) {
      return <FileText className="h-5 w-5 text-red-600" />;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExt)) {
      return <FileImage className="h-5 w-5 text-blue-600" />;
    } else if (type === 'email') {
      return <Paperclip className="h-5 w-5 text-gray-600" />;
    }
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const getFileName = (attachment: Attachment) => {
    return attachment.metadata?.fileName || 
           attachment.metadata?.original_filename || 
           attachment.subject ||
           'Unnamed Attachment';
  };

  const getFileSize = (attachment: Attachment) => {
    const bytes = attachment.metadata?.fileSize || attachment.metadata?.size || 0;
    if (bytes === 0) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const isNativeViewSupported = (attachment: Attachment) => {
    const fileName = getFileName(attachment);
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    return ['xlsx', 'xls', 'csv', 'doc', 'docx'].includes(fileExt);
  };

  if (attachmentCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No attachments
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments
            <Badge variant="secondary">{attachmentCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Loading attachments...
            </div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No attachments found
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 border rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    onClick={() => setSelectedAttachment(attachment)}
                    data-testid={`attachment-${attachment.id}`}
                  >
                    <div className="shrink-0">
                      {getFileIcon(attachment.communicationType, attachment.metadata)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {getFileName(attachment)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getFileSize(attachment)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAttachment(attachment);
                        }}
                        data-testid={`button-view-${attachment.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Attachment Viewer Dialog */}
      <Dialog open={!!selectedAttachment} onOpenChange={() => setSelectedAttachment(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAttachment && getFileIcon(selectedAttachment.communicationType, selectedAttachment.metadata)}
              {selectedAttachment && getFileName(selectedAttachment)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttachment && (
            <div className="flex flex-col h-full gap-4">
              {isNativeViewSupported(selectedAttachment) && (
                <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <TabsList>
                    <TabsTrigger value="converted" data-testid="tab-converted-view">
                      Converted View (PDF/Image)
                    </TabsTrigger>
                    <TabsTrigger value="native" data-testid="tab-native-view">
                      Native Format
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <div className="flex-1 border rounded-md p-4 overflow-auto bg-muted/20">
                {viewMode === 'native' ? (
                  <div className="text-center py-8 space-y-4">
                    <FileSpreadsheet className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Native Format View</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download the file to view in {getFileName(selectedAttachment).split('.').pop()?.toUpperCase()} format
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Native File
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <FileImage className="h-16 w-16 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Converted View</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Viewing converted PDF/image representation
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        (Preview functionality will be implemented with document processing service)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <div>Size: {getFileSize(selectedAttachment)}</div>
                <div>Type: {selectedAttachment.communicationType}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
