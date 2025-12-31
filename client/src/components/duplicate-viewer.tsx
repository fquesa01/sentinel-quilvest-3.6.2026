import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, FileText, MessageSquare, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'thread';
  masterDocumentId: string;
  duplicateCount: number;
  documents: Array<{
    id: string;
    sourceType: 'communication' | 'chat';
    subject: string | null;
    sender: string | null;
    timestamp: Date | null;
    contentHash?: string;
  }>;
  similarityScore?: number;
}

interface DuplicateDetectionResult {
  totalDocuments: number;
  totalDuplicates: number;
  duplicateGroups: DuplicateGroup[];
}

interface DuplicateViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: {
    communicationIds: string[];
    chatMessageIds: string[];
  };
  options?: {
    similarityThreshold?: number;
    includeNearDuplicates?: boolean;
    includeThreadDuplicates?: boolean;
  };
}

export function DuplicateViewer({
  open,
  onOpenChange,
  documentIds,
  options = {
    includeNearDuplicates: true,
    includeThreadDuplicates: true,
  },
}: DuplicateViewerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<DuplicateDetectionResult>({
    queryKey: ['/api/duplicates/detect', documentIds, options],
    queryFn: async () => {
      const response = await apiRequest('/api/duplicates/detect', {
        method: 'POST',
        body: JSON.stringify({
          documentIds,
          options
        }),
      });
      return response;
    },
    enabled: open && (documentIds.communicationIds.length > 0 || documentIds.chatMessageIds.length > 0),
  });

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getTypeIcon = (type: DuplicateGroup['type']) => {
    switch (type) {
      case 'exact':
        return <Copy className="h-4 w-4" />;
      case 'near':
        return <FileText className="h-4 w-4" />;
      case 'thread':
        return <Link2 className="h-4 w-4" />;
    }
  };

  const getTypeBadgeVariant = (type: DuplicateGroup['type']): "default" | "secondary" | "outline" => {
    switch (type) {
      case 'exact':
        return 'default';
      case 'near':
        return 'secondary';
      case 'thread':
        return 'outline';
    }
  };

  const getTypeLabel = (type: DuplicateGroup['type']) => {
    switch (type) {
      case 'exact':
        return 'Exact Duplicate';
      case 'near':
        return 'Near Duplicate';
      case 'thread':
        return 'Thread/Conversation';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Duplicate Document Detection</DialogTitle>
          <DialogDescription>
            Review detected duplicate documents before applying tags
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Failed to detect duplicates</p>
              <p className="text-sm mt-2">{(error as Error).message}</p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Detection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Documents</p>
                      <p className="text-2xl font-semibold">{data.totalDocuments.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duplicates Found</p>
                      <p className="text-2xl font-semibold text-orange-500">
                        {data.totalDuplicates.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duplicate Groups</p>
                      <p className="text-2xl font-semibold">{data.duplicateGroups.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Groups */}
              {data.duplicateGroups.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {data.duplicateGroups.map((group) => (
                      <Card key={group.groupId} className="overflow-hidden">
                        <CardHeader 
                          className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleGroup(group.groupId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(group.type)}
                                <Badge variant={getTypeBadgeVariant(group.type)}>
                                  {getTypeLabel(group.type)}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium">
                                {group.duplicateCount + 1} documents
                              </span>
                              {group.similarityScore && (
                                <span className="text-sm text-muted-foreground">
                                  ({Math.round(group.similarityScore * 100)}% similar)
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(group.groupId);
                              }}
                            >
                              {expandedGroups.has(group.groupId) ? 'Hide' : 'Show'} Documents
                            </Button>
                          </div>
                        </CardHeader>
                        {expandedGroups.has(group.groupId) && (
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              {group.documents.map((doc, index) => (
                                <div
                                  key={doc.id}
                                  className={`p-3 rounded-md border ${
                                    doc.id === group.masterDocumentId
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        {doc.sourceType === 'communication' ? (
                                          <FileText className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <span className="text-sm font-medium line-clamp-1">
                                          {doc.subject || '[No subject]'}
                                        </span>
                                        {doc.id === group.masterDocumentId && (
                                          <Badge variant="outline" className="text-xs">Master</Badge>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        From: {doc.sender || '[Unknown]'} •{' '}
                                        {doc.timestamp
                                          ? format(new Date(doc.timestamp), 'MMM d, yyyy h:mm a')
                                          : '[No date]'}
                                      </div>
                                      {doc.contentHash && (
                                        <div className="text-xs text-muted-foreground font-mono">
                                          Hash: {doc.contentHash.substring(0, 12)}...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      No duplicate documents detected in the selected set.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}