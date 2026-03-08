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

function formatInlineText(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(<strong key={`b-${keyIdx++}`}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

function parseTableRows(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const parseRow = (line: string) => {
    const stripped = line.replace(/^\|/, "").replace(/\|$/, "");
    return stripped.split("|").map((c) => c.trim());
  };
  const isSeparator = (line: string) => /^\|?[\s-:|]+\|?$/.test(line) && line.includes("-");

  const headers = parseRow(lines[0]);
  if (headers.length === 0 || headers.every((h) => h === "")) return null;

  const dataStart = isSeparator(lines[1]) ? 2 : 1;
  const rows = lines.slice(dataStart)
    .filter((l) => !isSeparator(l))
    .map((l) => {
      const cells = parseRow(l);
      while (cells.length < headers.length) cells.push("");
      return cells.slice(0, headers.length);
    })
    .filter((r) => r.some((c) => c !== ""));
  return { headers, rows };
}

function renderMarkdownContent(content: string) {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-6 mb-3">{formatInlineText(trimmed.slice(2))}</h1>);
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-semibold mt-5 mb-2">{formatInlineText(trimmed.slice(3))}</h2>);
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-4 mb-2">{formatInlineText(trimmed.slice(4))}</h3>);
      i++;
      continue;
    }

    const cleanedLine = trimmed.replace(/^`+/, "").replace(/`+$/, "").trim();
    if (cleanedLine.startsWith("|") && cleanedLine.includes("|", 1)) {
      const tableLines: string[] = [];
      while (i < lines.length) {
        const raw = lines[i].trim().replace(/^`+/, "").replace(/`+$/, "").trim();
        if (raw.startsWith("|") && raw.includes("|", 1)) {
          tableLines.push(raw);
          i++;
        } else break;
      }
      const table = parseTableRows(tableLines);
      if (table && table.headers.length > 0) {
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  {table.headers.map((h, hi) => (
                    <th key={hi} className="text-left py-2 px-3 font-semibold text-foreground bg-muted/50">
                      {formatInlineText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-muted-foreground">
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else {
        tableLines.forEach((tl, ti) => {
          elements.push(<p key={`tblf-${i}-${ti}`} className="mb-2 leading-relaxed">{formatInlineText(tl)}</p>);
        });
      }
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt.startsWith("- ") || lt.startsWith("* ")) {
          listItems.push(lt.slice(2));
          i++;
        } else break;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-6 my-2 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="text-muted-foreground leading-relaxed">{formatInlineText(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const m = lines[i].trim().match(/^\d+\.\s+(.+)/);
        if (m) listItems.push(m[1]);
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal pl-6 my-2 space-y-1">
          {listItems.map((item, li) => (
            <li key={li} className="text-muted-foreground leading-relaxed">{formatInlineText(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (trimmed === "") {
      elements.push(<div key={i} className="h-3" />);
      i++;
      continue;
    }

    elements.push(<p key={i} className="mb-2 leading-relaxed">{formatInlineText(trimmed)}</p>);
    i++;
  }

  return elements;
}

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
              {renderMarkdownContent(section.content)}
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
