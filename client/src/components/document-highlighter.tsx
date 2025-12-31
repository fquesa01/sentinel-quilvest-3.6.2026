import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Highlighter, Trash2, User, Sun, Moon, Tag, X, Bookmark, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Highlight {
  id: string;
  communicationId: string;
  userId: string;
  userName: string;
  highlightedText: string;
  startOffset: number;
  endOffset: number;
  color: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

interface Comment {
  id: string;
  highlightId: string;
  userId: string;
  userName: string;
  commentText: string;
  createdAt: string;
  updatedAt: string;
}

interface AttachmentInfo {
  filePath: string;
  mimeType: string;
}

interface TagType {
  id: string;
  name: string;
  category: string;
  color: string;
  description?: string;
}

interface TextSelectionTag {
  id: string;
  communicationId: string;
  tagId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  taggedBy: string;
  createdAt: string;
  tag: TagType;
}

interface DocumentHighlighterProps {
  communicationId: string;
  documentBody: string;
  currentUserId?: string;
  isReadOnly?: boolean;
  attachmentsMap?: Map<string, AttachmentInfo>;
  // Props for bookmark functionality
  caseId?: string;
  documentTitle?: string;
}

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "yellow", class: "bg-yellow-200 hover:bg-yellow-300" },
  { name: "Green", value: "green", class: "bg-green-200 hover:bg-green-300" },
  { name: "Blue", value: "blue", class: "bg-blue-200 hover:bg-blue-300" },
  { name: "Pink", value: "pink", class: "bg-pink-200 hover:bg-pink-300" },
  { name: "Purple", value: "purple", class: "bg-purple-200 hover:bg-purple-300" },
];

const LIGHT_MODE_KEY = "document-viewer-light-mode";

export function DocumentHighlighter({
  communicationId,
  documentBody,
  currentUserId,
  isReadOnly = false,
  attachmentsMap,
  caseId,
  documentTitle,
}: DocumentHighlighterProps) {
  const [selectedText, setSelectedText] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [selectionCoords, setSelectionCoords] = useState({ x: 0, y: 0 });
  const [isLightMode, setIsLightMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LIGHT_MODE_KEY);
      return saved === "true";
    }
    return false;
  });
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Persist light mode preference
  useEffect(() => {
    localStorage.setItem(LIGHT_MODE_KEY, String(isLightMode));
  }, [isLightMode]);

  // Fetch highlights for this document
  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ["/api/highlights", communicationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/highlights/${communicationId}`);
      return response.json();
    },
    enabled: !!communicationId,
  });

  // Fetch text selection tags for this document
  const { data: textSelectionTags = [] } = useQuery<TextSelectionTag[]>({
    queryKey: ["/api/text-selection-tags", communicationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/text-selection-tags/${communicationId}`);
      return response.json();
    },
    enabled: !!communicationId,
  });

  // Fetch available tags for tagging
  const { data: availableTags = [] } = useQuery<TagType[]>({
    queryKey: ["/api/tags"],
  });

  // Create highlight mutation
  const createHighlightMutation = useMutation({
    mutationFn: async (data: {
      communicationId: string;
      highlightedText: string;
      startOffset: number;
      endOffset: number;
      color: string;
    }) => {
      const response = await apiRequest("POST", "/api/highlights", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/highlights", communicationId] });
      toast({
        title: "Highlight created",
        description: "Text has been highlighted successfully.",
      });
      setSelectedText(null);
      setShowColorPicker(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating highlight",
        description: error.message || "Failed to create highlight",
        variant: "destructive",
      });
    },
  });

  // Delete highlight mutation
  const deleteHighlightMutation = useMutation({
    mutationFn: async (highlightId: string) => {
      const response = await apiRequest("DELETE", `/api/highlights/${highlightId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/highlights", communicationId] });
      toast({
        title: "Highlight deleted",
        description: "Highlight has been removed.",
      });
      setActiveHighlight(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting highlight",
        description: error.message || "Failed to delete highlight",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: { highlightId: string; commentText: string }) => {
      const response = await apiRequest("POST", `/api/highlights/${data.highlightId}/comments`, { commentText: data.commentText });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/highlights", communicationId] });
      toast({
        title: "Comment added",
        description: "Your comment has been added to the highlight.",
      });
      setCommentText("");
    },
    onError: (error: any) => {
      toast({
        title: "Error adding comment",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Create text selection tag mutation
  const createTextSelectionTagMutation = useMutation({
    mutationFn: async (data: {
      communicationId: string;
      tagId: string;
      selectedText: string;
      startOffset: number;
      endOffset: number;
    }) => {
      const response = await apiRequest("POST", "/api/text-selection-tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-selection-tags", communicationId] });
      toast({
        title: "Tag applied",
        description: "Tag has been applied to the selected text.",
      });
      setSelectedText(null);
      setShowTagSelector(false);
      setShowColorPicker(false);
      setTagSearchQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "Error applying tag",
        description: error.message || "Failed to apply tag",
        variant: "destructive",
      });
    },
  });

  // Delete text selection tag mutation
  const deleteTextSelectionTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/text-selection-tags/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/text-selection-tags", communicationId] });
      toast({
        title: "Tag removed",
        description: "Tag has been removed from the text selection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing tag",
        description: error.message || "Failed to remove tag",
        variant: "destructive",
      });
    },
  });

  // Create quote bookmark mutation
  const createQuoteBookmarkMutation = useMutation({
    mutationFn: async (data: {
      communicationId: string;
      caseId: string;
      title: string;
      excerpt: string;
      startOffset: number;
      endOffset: number;
    }) => {
      const response = await apiRequest("POST", "/api/bookmarks", {
        bookmarkType: "quote",
        communicationId: data.communicationId,
        caseId: data.caseId,
        title: data.title,
        excerpt: data.excerpt.substring(0, 200),
        startOffset: data.startOffset,
        endOffset: data.endOffset,
      });
      return response.json();
    },
    onSuccess: () => {
      // Refetch bookmark queries to update UI immediately
      queryClient.refetchQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Quote bookmarked",
        description: "The selected text has been bookmarked.",
      });
      setSelectedText(null);
      setShowColorPicker(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error bookmarking quote",
        description: error.message || "Failed to bookmark quote",
        variant: "destructive",
      });
    },
  });

  // Flag contradiction mutation - creates finding with auto-linked evidence
  const flagContradictionMutation = useMutation({
    mutationFn: async (data: {
      caseId: string;
      selectedText: string;
      communicationId: string;
      documentTitle?: string;
    }) => {
      // Create finding with contradiction entry type
      const findingResponse = await apiRequest("POST", `/api/cases/${data.caseId}/findings`, {
        title: `Contradiction: "${data.selectedText.substring(0, 50)}${data.selectedText.length > 50 ? '...' : ''}"`,
        content: `**Flagged Statement:**\n\n> "${data.selectedText}"\n\n**Source:** ${data.documentTitle || 'Document'}\n\n**Analysis:**\n\n_Add your analysis of why this statement is contradictory..._`,
        entryType: "contradiction",
        category: "key_fact",
        isPinned: false,
        aiGenerated: false,
      });
      const finding = await findingResponse.json();

      // Create evidence link to source document
      await apiRequest("POST", `/api/findings/${finding.id}/evidence-links`, {
        targetType: "communication",
        targetId: data.communicationId,
        notes: `Flagged text: "${data.selectedText.substring(0, 100)}${data.selectedText.length > 100 ? '...' : ''}"`,
      });

      return finding;
    },
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings", "counts"] });
      }
      toast({
        title: "Contradiction Flagged",
        description: "Statement added to findings as a contradiction with evidence link.",
      });
      setSelectedText(null);
      setShowColorPicker(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error flagging contradiction",
        description: error.message || "Failed to flag contradiction",
        variant: "destructive",
      });
    },
  });

  // Handle flagging contradiction
  const handleFlagContradiction = () => {
    if (!selectedText || !caseId) return;
    
    flagContradictionMutation.mutate({
      caseId,
      selectedText: selectedText.text,
      communicationId,
      documentTitle,
    });
  };

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (isReadOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;

    const selectedString = selection.toString().trim();
    if (!selectedString) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Get the text content of the document to calculate offsets
    const textContent = contentRef.current.textContent || "";
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(contentRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedString.length;

    setSelectedText({
      text: selectedString,
      startOffset,
      endOffset,
    });
    setSelectionCoords({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShowColorPicker(true);
  }, [isReadOnly]);

  // Create highlight with selected color
  const handleCreateHighlight = () => {
    if (!selectedText) return;

    createHighlightMutation.mutate({
      communicationId,
      highlightedText: selectedText.text,
      startOffset: selectedText.startOffset,
      endOffset: selectedText.endOffset,
      color: selectedColor,
    });
  };

  // Apply tag to selected text
  const handleApplyTag = (tag: TagType) => {
    if (!selectedText) return;

    createTextSelectionTagMutation.mutate({
      communicationId,
      tagId: tag.id,
      selectedText: selectedText.text,
      startOffset: selectedText.startOffset,
      endOffset: selectedText.endOffset,
    });
  };

  // Bookmark selected quote
  const handleBookmarkQuote = () => {
    if (!selectedText || !caseId) return;

    createQuoteBookmarkMutation.mutate({
      communicationId,
      caseId,
      title: documentTitle || "Document",
      excerpt: selectedText.text,
      startOffset: selectedText.startOffset,
      endOffset: selectedText.endOffset,
    });
  };

  // Get tag color class based on tag color
  const getTagColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-100 border-blue-400 text-blue-800",
      green: "bg-green-100 border-green-400 text-green-800",
      red: "bg-red-100 border-red-400 text-red-800",
      yellow: "bg-yellow-100 border-yellow-400 text-yellow-800",
      purple: "bg-purple-100 border-purple-400 text-purple-800",
      orange: "bg-orange-100 border-orange-400 text-orange-800",
      pink: "bg-pink-100 border-pink-400 text-pink-800",
      gray: "bg-gray-100 border-gray-400 text-gray-800",
    };
    return colorMap[color] || colorMap.blue;
  };

  // Filter tags based on search query
  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
    tag.category?.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  const renderTextWithInlineAttachments = (text: string, keyPrefix: string = '') => {
    if (!attachmentsMap || attachmentsMap.size === 0) {
      return text;
    }

    const attachmentPattern = /<attached:\s*([^>]+)>/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let attachmentIndex = 0;

    while ((match = attachmentPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const filename = match[1].trim();
      const attachment = attachmentsMap.get(filename);

      if (attachment) {
        const isImage = attachment.mimeType?.startsWith('image/');
        const isVideo = attachment.mimeType?.startsWith('video/');
        
        if (isImage) {
          parts.push(
            <div key={`${keyPrefix}attachment-${attachmentIndex}`} className="my-3">
              <img 
                src={attachment.filePath}
                alt={filename}
                className="max-w-full max-h-96 rounded-lg shadow-md"
                data-testid={`inline-image-${attachmentIndex}`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = 'block';
                }}
              />
              <div className="hidden text-sm text-muted-foreground mt-1">
                Unable to load image: {filename}
              </div>
            </div>
          );
        } else if (isVideo) {
          parts.push(
            <div key={`${keyPrefix}attachment-${attachmentIndex}`} className="my-3">
              <video 
                src={attachment.filePath}
                controls
                className="max-w-full max-h-96 rounded-lg shadow-md"
                data-testid={`inline-video-${attachmentIndex}`}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          );
        } else {
          parts.push(
            <span key={`${keyPrefix}attachment-${attachmentIndex}`} className="text-primary underline">
              {match[0]}
            </span>
          );
        }
      } else {
        parts.push(
          <span key={`${keyPrefix}attachment-${attachmentIndex}`} className="text-muted-foreground italic">
            {match[0]}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
      attachmentIndex++;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  const renderHighlightedContent = () => {
    if (!documentBody || isLoading) return documentBody;

    // Combine highlights and text selection tags into unified annotations
    type Annotation = {
      type: 'highlight';
      id: string;
      startOffset: number;
      endOffset: number;
      data: typeof highlights[0];
    } | {
      type: 'textTag';
      id: string;
      startOffset: number;
      endOffset: number;
      data: TextSelectionTag;
    };

    const annotations: Annotation[] = [
      ...highlights.map((h): Annotation => ({
        type: 'highlight',
        id: h.id,
        startOffset: h.startOffset,
        endOffset: h.endOffset,
        data: h,
      })),
      ...textSelectionTags.map((t): Annotation => ({
        type: 'textTag',
        id: t.id,
        startOffset: t.startOffset,
        endOffset: t.endOffset,
        data: t,
      })),
    ].sort((a, b) => a.startOffset - b.startOffset);
    
    if (annotations.length === 0) {
      return <span ref={contentRef} onMouseUp={handleTextSelection}>{renderTextWithInlineAttachments(documentBody)}</span>;
    }

    const elements: JSX.Element[] = [];
    let lastOffset = 0;

    annotations.forEach((annotation, index) => {
      // Skip annotations that are fully contained within already-rendered text
      if (annotation.endOffset <= lastOffset) {
        return;
      }
      
      // Adjust start if annotation starts before our current position (partial overlap)
      const effectiveStart = Math.max(annotation.startOffset, lastOffset);
      
      // Add gap text before this annotation (if any)
      if (effectiveStart > lastOffset) {
        const textSegment = documentBody.substring(lastOffset, effectiveStart);
        elements.push(
          <span key={`text-${index}`}>
            {renderTextWithInlineAttachments(textSegment, `pre-${index}-`)}
          </span>
        );
      }

      if (annotation.type === 'highlight') {
        const highlight = annotation.data;
        // Add highlighted text
        const highlightColorClass = {
          yellow: "bg-yellow-200",
          green: "bg-green-200",
          blue: "bg-blue-200",
          pink: "bg-pink-200",
          purple: "bg-purple-200",
        }[highlight.color] || "bg-yellow-200";

        elements.push(
          <Popover key={`highlight-${highlight.id}`}>
            <PopoverTrigger asChild>
              <span
                className={cn(
                  highlightColorClass,
                  "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                data-testid={`highlight-${highlight.id}`}
              >
                {documentBody.substring(effectiveStart, highlight.endOffset)}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">{highlight.userName}</span>
                  </div>
                  {highlight.userId === currentUserId && !isReadOnly && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteHighlightMutation.mutate(highlight.id)}
                      data-testid={`delete-highlight-${highlight.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(highlight.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                
                {/* Comments */}
                {highlight.comments && highlight.comments.length > 0 && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="text-sm font-medium">Comments</div>
                    {highlight.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted p-2 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.createdAt), "MMM d h:mm a")}
                          </span>
                        </div>
                        <div className="text-sm">{comment.commentText}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add comment form */}
                {!isReadOnly && (
                  <div className="border-t pt-3 space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[60px]"
                      data-testid={`comment-input-${highlight.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (commentText.trim()) {
                          addCommentMutation.mutate({
                            highlightId: highlight.id,
                            commentText: commentText.trim(),
                          });
                        }
                      }}
                      disabled={!commentText.trim()}
                      data-testid={`add-comment-${highlight.id}`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Comment
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );

        lastOffset = highlight.endOffset;
      } else if (annotation.type === 'textTag') {
        const textTag = annotation.data;
        const tagColor = textTag.tag?.color || 'blue';
        const colorClasses = getTagColorClass(tagColor);

        elements.push(
          <Popover key={`texttag-${textTag.id}`}>
            <PopoverTrigger asChild>
              <span
                className={cn(
                  "border-b-2 cursor-pointer hover:opacity-80 transition-opacity",
                  colorClasses.split(' ')[1]
                )}
                data-testid={`text-tag-${textTag.id}`}
              >
                {documentBody.substring(effectiveStart, textTag.endOffset)}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="text-sm font-medium">Tagged Text</span>
                  </div>
                  {textTag.taggedBy === currentUserId && !isReadOnly && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTextSelectionTagMutation.mutate(textTag.id)}
                      data-testid={`delete-text-tag-${textTag.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={cn("text-xs", colorClasses)}
                    data-testid={`tag-badge-${textTag.tag?.id}`}
                  >
                    {textTag.tag?.name}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(textTag.createdAt), "MMM d, yyyy h:mm a")}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );

        lastOffset = textTag.endOffset;
      }
    });

    // Add remaining text
    if (lastOffset < documentBody.length) {
      const remainingText = documentBody.substring(lastOffset);
      elements.push(
        <span key="text-end">
          {renderTextWithInlineAttachments(remainingText, 'end-')}
        </span>
      );
    }

    return (
      <span ref={contentRef} onMouseUp={handleTextSelection}>
        {elements}
      </span>
    );
  };

  return (
    <div className="relative">
      {/* Background mode toggle button */}
      <div className="flex justify-end mb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLightMode(!isLightMode)}
              className="gap-2"
              data-testid="toggle-doc-background"
            >
              {isLightMode ? (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="text-xs">Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="text-xs">Light Mode</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLightMode 
              ? "Switch to dark background for document viewing" 
              : "Switch to light background for better highlight visibility"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Document content with conditional background */}
      <div
        className={cn(
          "p-4 rounded-md transition-colors",
          isLightMode 
            ? "bg-white text-black" 
            : "bg-sidebar text-white"
        )}
        data-testid="document-content-container"
      >
        {renderHighlightedContent()}
      </div>
      
      {/* Color picker popover for new highlights */}
      {showColorPicker && selectedText && !isReadOnly && !showTagSelector && (
        <div
          className="absolute z-50 bg-background border rounded-lg shadow-lg p-2"
          style={{
            left: selectionCoords.x,
            top: selectionCoords.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex items-center gap-1 mb-2">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "w-6 h-6 rounded",
                  color.class,
                  selectedColor === color.value && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedColor(color.value)}
                title={color.name}
                data-testid={`color-${color.value}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleCreateHighlight}
              data-testid="create-highlight"
            >
              <Highlighter className="h-4 w-4 mr-1" />
              Highlight
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowTagSelector(true)}
              data-testid="show-tag-selector"
            >
              <Tag className="h-4 w-4 mr-1" />
              Tag
            </Button>
            {caseId && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleBookmarkQuote}
                  disabled={createQuoteBookmarkMutation.isPending}
                  data-testid="button-bookmark-selection"
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Bookmark
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleFlagContradiction}
                  disabled={flagContradictionMutation.isPending}
                  data-testid="button-flag-contradiction"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Flag Contradiction
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowColorPicker(false);
                setSelectedText(null);
              }}
              data-testid="cancel-highlight"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tag selector popover */}
      {showTagSelector && selectedText && !isReadOnly && (
        <div
          className="absolute z-50 bg-background border rounded-lg shadow-lg p-3 w-72"
          style={{
            left: selectionCoords.x,
            top: selectionCoords.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Apply Tag</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setShowTagSelector(false);
                setShowColorPicker(false);
                setSelectedText(null);
                setTagSearchQuery("");
              }}
              data-testid="close-tag-selector"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Command className="rounded-lg border shadow-none">
            <CommandInput 
              placeholder="Search tags..." 
              value={tagSearchQuery}
              onValueChange={setTagSearchQuery}
              data-testid="tag-search-input"
            />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup heading="Available Tags">
                <ScrollArea className="h-48">
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleApplyTag(tag)}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`tag-option-${tag.id}`}
                    >
                      <Badge 
                        className={cn("text-xs", getTagColorClass(tag.color))}
                      >
                        {tag.name}
                      </Badge>
                      {tag.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {tag.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="mt-2 flex justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowTagSelector(false);
                setTagSearchQuery("");
              }}
              data-testid="back-to-highlight"
            >
              Back to Highlight
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}