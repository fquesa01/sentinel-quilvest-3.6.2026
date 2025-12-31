import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileDown,
  Mail,
  UserPlus,
  Printer,
  FileText,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type DocumentExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  documentTitles?: string[];
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export function DocumentExportDialog({
  open,
  onOpenChange,
  documentIds,
  documentTitles = [],
}: DocumentExportDialogProps) {
  const { toast } = useToast();
  const [exportType, setExportType] = useState<'pdf' | 'email' | 'share'>('pdf');
  
  // PDF options
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [includeHighlights, setIncludeHighlights] = useState(true);
  
  // Email options
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  
  // Share options
  const [selectedUserId, setSelectedUserId] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  // Fetch users for sharing (compliance officers and investigators)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: exportType === 'share',
  });

  const exportMutation = useMutation({
    mutationFn: async (data: any) => {
      // For PDF export, we need to handle blob response
      if (data.type === 'pdf') {
        const response = await fetch('/api/documents/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to export documents' }));
          throw new Error(errorData.message || 'Failed to export documents');
        }

        // Get the blob
        const blob = await response.blob();
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `document-export-${Date.now()}.pdf`;
        if (contentDisposition) {
          const matches = /filename="([^"]+)"/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }

        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true };
      } else {
        // For other types, use regular API request
        return apiRequest('POST', '/api/documents/export', data);
      }
    },
    onSuccess: (response) => {
      toast({
        title: "Export Successful",
        description: `Document${documentIds.length > 1 ? 's' : ''} exported successfully`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export documents",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (exportType === 'pdf') {
      exportMutation.mutate({
        type: 'pdf',
        documentIds,
        options: {
          includeMetadata,
          includeAttachments,
          includeHighlights,
        },
      });
    } else if (exportType === 'email') {
      if (!emailTo.trim()) {
        toast({
          title: "Email Required",
          description: "Please enter a recipient email address",
          variant: "destructive",
        });
        return;
      }
      exportMutation.mutate({
        type: 'email',
        documentIds,
        options: {
          to: emailTo,
          subject: emailSubject || `Document${documentIds.length > 1 ? 's' : ''} for Review`,
          message: emailMessage,
        },
      });
    } else if (exportType === 'share') {
      if (!selectedUserId) {
        toast({
          title: "User Required",
          description: "Please select a user to share with",
          variant: "destructive",
        });
        return;
      }
      exportMutation.mutate({
        type: 'share',
        documentIds,
        options: {
          userId: selectedUserId,
          message: shareMessage,
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-export-document">
        <DialogHeader>
          <DialogTitle>Export Document{documentIds.length > 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Choose how you would like to export {documentIds.length} document{documentIds.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Selected Documents Summary */}
        {documentTitles.length > 0 && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="text-sm font-medium mb-2">Selected Documents:</div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {documentTitles.slice(0, 5).map((title, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  <span className="truncate">{title}</span>
                </div>
              ))}
              {documentTitles.length > 5 && (
                <div className="text-xs text-muted-foreground">
                  + {documentTitles.length - 5} more...
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs value={exportType} onValueChange={(v: any) => setExportType(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pdf" data-testid="tab-export-pdf">
              <Printer className="h-4 w-4 mr-2" />
              Print to PDF
            </TabsTrigger>
            <TabsTrigger value="email" data-testid="tab-export-email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="share" data-testid="tab-export-share">
              <UserPlus className="h-4 w-4 mr-2" />
              Share
            </TabsTrigger>
          </TabsList>

          {/* PDF Export Options */}
          <TabsContent value="pdf" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
                  data-testid="checkbox-include-metadata"
                />
                <label
                  htmlFor="metadata"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include document metadata (sender, recipients, date, etc.)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attachments"
                  checked={includeAttachments}
                  onCheckedChange={(checked) => setIncludeAttachments(!!checked)}
                  data-testid="checkbox-include-attachments"
                />
                <label
                  htmlFor="attachments"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include all exhibits and attachments
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="highlights"
                  checked={includeHighlights}
                  onCheckedChange={(checked) => setIncludeHighlights(!!checked)}
                  data-testid="checkbox-include-highlights"
                />
                <label
                  htmlFor="highlights"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Preserve search highlights and annotations
                </label>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-medium">Note:</div>
                <div className="text-xs mt-1">
                  PDF export will generate a print-ready document with Bates stamping and
                  professional formatting suitable for production or court filing.
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Email Export Options */}
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailTo">Recipient Email *</Label>
              <Input
                id="emailTo"
                type="email"
                placeholder="colleague@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                data-testid="input-email-to"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailSubject">Subject (optional)</Label>
              <Input
                id="emailSubject"
                placeholder={`Document${documentIds.length > 1 ? 's' : ''} for Review`}
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailMessage">Message (optional)</Label>
              <Textarea
                id="emailMessage"
                placeholder="Add a message to the recipient..."
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                data-testid="textarea-email-message"
              />
            </div>

            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <div className="font-medium">Security Notice:</div>
                <div className="text-xs mt-1">
                  Documents will be sent as encrypted PDF attachments with password protection.
                  The recipient will receive the password in a separate email.
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Share with Investigator Options */}
          <TabsContent value="share" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shareUser">Share with User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="shareUser" data-testid="select-share-user">
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name || user.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shareMessage">Message (optional)</Label>
              <Textarea
                id="shareMessage"
                placeholder="Add a message for the investigator..."
                rows={4}
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                data-testid="textarea-share-message"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-medium">Share Notification:</div>
                <div className="text-xs mt-1">
                  The selected user will receive a notification and the documents will appear
                  in their document review queue with your message attached.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exportMutation.isPending}
            data-testid="button-cancel-export"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            data-testid="button-confirm-export"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
