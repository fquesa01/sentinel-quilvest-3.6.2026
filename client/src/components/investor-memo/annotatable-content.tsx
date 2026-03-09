import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  SelectionToolbar, AnnotationInput, MemoAnnotationsPanel, useTextSelection,
} from "./memo-annotations";
import type { MemoAnnotation } from "@shared/schema";

interface AnnotatableContentProps {
  memoId: string;
  sectionKey: string;
  annotations: MemoAnnotation[];
  children: React.ReactNode;
}

export function AnnotatableContent({ memoId, sectionKey, annotations, children }: AnnotatableContentProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const { toolbarPosition, selectedText, selectionOffset, clearSelection } = useTextSelection(contentRef);
  const [annotationMode, setAnnotationMode] = useState<"comment" | "ai_question" | null>(null);

  const createAnnotation = useMutation({
    mutationFn: async (data: { type: "comment" | "ai_question"; content: string }) => {
      const res = await apiRequest("POST", `/api/memos/${memoId}/annotations`, {
        sectionKey,
        selectedText,
        startOffset: selectionOffset,
        type: data.type,
        content: data.content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId, "annotations"] });
      setAnnotationMode(null);
      clearSelection();
      toast({ title: annotationMode === "ai_question" ? "AI response received" : "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to create annotation", variant: "destructive" });
    },
  });

  return (
    <div>
      <div ref={contentRef}>
        {children}
      </div>

      <SelectionToolbar
        position={toolbarPosition}
        onAskAI={() => setAnnotationMode("ai_question")}
        onComment={() => setAnnotationMode("comment")}
        onClose={clearSelection}
      />

      {annotationMode && selectedText && (
        <AnnotationInput
          type={annotationMode}
          selectedText={selectedText}
          onSubmit={(content) => createAnnotation.mutate({ type: annotationMode, content })}
          onCancel={() => {
            setAnnotationMode(null);
            clearSelection();
          }}
          isPending={createAnnotation.isPending}
        />
      )}

      <MemoAnnotationsPanel
        memoId={memoId}
        sectionKey={sectionKey}
        annotations={annotations}
      />
    </div>
  );
}
