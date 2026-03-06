import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, Save, X, RefreshCw, Sparkles, Clock } from "lucide-react";
import { format } from "date-fns";

interface MemoSection {
  title: string;
  content: string;
  isEdited: boolean;
  generatedAt: string;
  editedAt?: string;
}

interface MemoSectionEditorProps {
  sectionKey: string;
  section: MemoSection;
  onSave: (content: string) => void;
  onRegenerate: (prompt?: string) => void;
  isSaving: boolean;
  isRegenerating: boolean;
}

export function MemoSectionEditor({
  sectionKey,
  section,
  onSave,
  onRegenerate,
  isSaving,
  isRegenerating,
}: MemoSectionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(section.content);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");

  const handleStartEdit = () => {
    setEditContent(section.content);
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(editContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(section.content);
  };

  const handleRegenerate = () => {
    onRegenerate(regenPrompt || undefined);
    setShowRegenDialog(false);
    setRegenPrompt("");
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(section.generatedAt), "MMM d, yyyy h:mm a")}
              </Badge>
              {section.isEdited && (
                <Badge variant="secondary" className="text-xs">Edited</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenDialog(true)}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {section.content.split("\n").map((paragraph, i) => {
                if (paragraph.startsWith("# ")) {
                  return <h1 key={i} className="text-xl font-bold mt-6 mb-3">{paragraph.slice(2)}</h1>;
                }
                if (paragraph.startsWith("## ")) {
                  return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{paragraph.slice(3)}</h2>;
                }
                if (paragraph.startsWith("### ")) {
                  return <h3 key={i} className="text-base font-semibold mt-4 mb-2">{paragraph.slice(4)}</h3>;
                }
                if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
                  return <li key={i} className="ml-4">{paragraph.slice(2)}</li>;
                }
                if (paragraph.startsWith("|")) {
                  return <code key={i} className="block text-xs bg-muted p-1 rounded">{paragraph}</code>;
                }
                if (paragraph.trim() === "") {
                  return <br key={i} />;
                }
                return <p key={i} className="mb-2 leading-relaxed">{paragraph}</p>;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate: {section.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Optionally provide instructions for how to improve this section.
            </p>
            <Input
              placeholder="e.g., Add more detail on competitive positioning, focus on risks..."
              value={regenPrompt}
              onChange={(e) => setRegenPrompt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenDialog(false)}>Cancel</Button>
            <Button onClick={handleRegenerate}>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
