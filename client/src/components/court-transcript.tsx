import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Printer, AlertTriangle, X, Bookmark, ListPlus } from "lucide-react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface TranscriptQuestion {
  questionIndex: number;
  questionText: string;
  answerText: string;
  recordedAt?: Date | string;
}

interface CourtTranscriptProps {
  intervieweeName: string;
  interviewDate: string;
  caseNumber?: string;
  caseName?: string;
  questions: TranscriptQuestion[];
  onExportPDF?: () => void;
  caseId?: string;
  interviewId?: string;
}

const LINES_PER_PAGE = 25;
const CHARS_PER_LINE = 56;

function splitTextIntoLines(text: string, charsPerLine: number = CHARS_PER_LINE): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= charsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

interface TranscriptLine {
  lineNumber: number;
  pageNumber: number;
  content: string;
  type: "content" | "blank";
}

function formatTranscriptLines(
  questions: TranscriptQuestion[],
  intervieweeName: string
): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let globalLineNumber = 1;
  let currentPage = 1;

  const addLine = (content: string, type: TranscriptLine["type"]) => {
    const lineInPage = ((globalLineNumber - 1) % LINES_PER_PAGE) + 1;
    if (lineInPage === 1 && globalLineNumber > 1) {
      currentPage++;
    }
    lines.push({
      lineNumber: lineInPage,
      pageNumber: currentPage,
      content,
      type,
    });
    globalLineNumber++;
  };

  for (const q of questions) {
    const questionLines = splitTextIntoLines(`Q: ${q.questionText}`);
    for (const lineContent of questionLines) {
      addLine(lineContent, "content");
    }
    
    const answerLines = splitTextIntoLines(`A: ${q.answerText || "[No response recorded]"}`);
    for (const lineContent of answerLines) {
      addLine(lineContent, "content");
    }
  }

  return lines;
}

function groupByPage(lines: TranscriptLine[]): Map<number, TranscriptLine[]> {
  const pages = new Map<number, TranscriptLine[]>();
  for (const line of lines) {
    if (!pages.has(line.pageNumber)) {
      pages.set(line.pageNumber, []);
    }
    pages.get(line.pageNumber)!.push(line);
  }
  return pages;
}

export function CourtTranscript({
  intervieweeName,
  interviewDate,
  caseNumber,
  caseName,
  questions,
  caseId,
  interviewId,
}: CourtTranscriptProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [selectedText, setSelectedText] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [selectionCoords, setSelectionCoords] = useState({ x: 0, y: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);
  
  const transcriptLines = formatTranscriptLines(questions, intervieweeName);
  const pages = groupByPage(transcriptLines);
  const totalPages = pages.size;

  const handleTextSelection = useCallback(() => {
    if (!caseId || typeof window === "undefined") return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;

    const selectedString = selection.toString().trim();
    if (!selectedString) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
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
    setShowActionMenu(true);
  }, [caseId]);

  const flagContradictionMutation = useMutation({
    mutationFn: async (data: {
      caseId: string;
      selectedText: string;
      interviewId?: string;
      intervieweeName: string;
    }) => {
      const findingResponse = await apiRequest("POST", `/api/cases/${data.caseId}/findings`, {
        title: `Contradiction: "${data.selectedText.substring(0, 50)}${data.selectedText.length > 50 ? '...' : ''}"`,
        content: `**Flagged Statement:**\n\n> "${data.selectedText}"\n\n**Source:** Interview Transcript - ${data.intervieweeName}\n\n**Analysis:**\n\n_Add your analysis of why this statement is contradictory..._`,
        entryType: "contradiction",
        category: "key_fact",
        isPinned: false,
        aiGenerated: false,
      });
      const finding = await findingResponse.json();

      if (data.interviewId) {
        await apiRequest("POST", `/api/findings/${finding.id}/evidence-links`, {
          targetType: "interview",
          targetId: data.interviewId,
          notes: `Flagged text from transcript: "${data.selectedText.substring(0, 100)}${data.selectedText.length > 100 ? '...' : ''}"`,
        });
      }

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
      setShowActionMenu(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error flagging contradiction",
        description: error.message || "Failed to flag contradiction",
        variant: "destructive",
      });
    },
  });

  const addToFindingsMutation = useMutation({
    mutationFn: async (data: {
      caseId: string;
      selectedText: string;
      interviewId?: string;
      intervieweeName: string;
    }) => {
      const findingResponse = await apiRequest("POST", `/api/cases/${data.caseId}/findings`, {
        title: `Interview Note: ${data.intervieweeName}`,
        content: `**Selected Statement:**\n\n> "${data.selectedText}"\n\n**Source:** Interview Transcript - ${data.intervieweeName}\n\n**Notes:**\n\n_Add your notes about this statement..._`,
        entryType: "note",
        category: "key_fact",
        isPinned: false,
        aiGenerated: false,
      });
      const finding = await findingResponse.json();

      if (data.interviewId) {
        await apiRequest("POST", `/api/findings/${finding.id}/evidence-links`, {
          targetType: "interview",
          targetId: data.interviewId,
          notes: `Selected text from transcript: "${data.selectedText.substring(0, 100)}${data.selectedText.length > 100 ? '...' : ''}"`,
        });
      }

      return finding;
    },
    onSuccess: () => {
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "findings", "counts"] });
      }
      toast({
        title: "Added to Findings",
        description: "Statement added to findings with evidence link.",
      });
      setSelectedText(null);
      setShowActionMenu(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding to findings",
        description: error.message || "Failed to add to findings",
        variant: "destructive",
      });
    },
  });

  const handleFlagContradiction = () => {
    if (!selectedText || !caseId) return;
    flagContradictionMutation.mutate({
      caseId,
      selectedText: selectedText.text,
      interviewId,
      intervieweeName,
    });
  };

  const handleAddToFindings = () => {
    if (!selectedText || !caseId) return;
    addToFindingsMutation.mutate({
      caseId,
      selectedText: selectedText.text,
      interviewId,
      intervieweeName,
    });
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 72;
      const lineHeight = 24;
      const lineNumberWidth = 45;

      pages.forEach((pageLines, pageNum) => {
        if (pageNum > 1) {
          pdf.addPage();
        }

        pdf.setFont("times", "normal");
        pdf.setFontSize(14);

        pdf.setFontSize(10);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, 40, { align: "right" });
        if (caseNumber) {
          pdf.text(`Case: ${caseNumber}`, margin, 40);
        }
        pdf.text(`Witness: ${intervieweeName}`, margin, 54);
        pdf.text(`Date: ${interviewDate}`, margin, 68);

        pdf.line(margin, 80, pageWidth - margin, 80);

        pdf.setFontSize(14);
        let y = 110;

        for (const line of pageLines) {
          const lineNumStr = line.lineNumber.toString().padStart(2, " ");
          pdf.setTextColor(128, 128, 128);
          pdf.text(lineNumStr, margin, y);

          pdf.setTextColor(0, 0, 0);
          pdf.setFont("times", "normal");
          pdf.text(line.content, margin + lineNumberWidth, y);
          
          y += lineHeight;
        }

        const footerY = pageHeight - 40;
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
        pdf.text("CONFIDENTIAL - ATTORNEY-CLIENT PRIVILEGED", pageWidth / 2, footerY, { align: "center" });
      });

      const fileName = `transcript_${intervieweeName.replace(/\s+/g, "_")}_${interviewDate.replace(/\//g, "-")}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF Exported",
        description: `Transcript saved as ${fileName}`,
      });
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="w-full relative">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Court Transcript
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} data-testid="btn-print-transcript">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button size="sm" onClick={handleExportPDF} data-testid="btn-export-pdf">
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={contentRef}
          className="transcript-viewer overflow-auto max-h-[600px] bg-white dark:bg-gray-900"
          onMouseUp={handleTextSelection}
        >
          {Array.from(pages.entries()).map(([pageNum, pageLines]) => (
            <div
              key={pageNum}
              className="transcript-page border-b-2 border-dashed border-muted-foreground/30 pb-4 mb-4 last:border-b-0 last:mb-0"
              data-testid={`transcript-page-${pageNum}`}
            >
              <div className="page-header px-6 py-3 bg-muted/50 flex justify-between items-center text-xs text-muted-foreground font-mono">
                <div>
                  {caseNumber && <span className="mr-4">Case: {caseNumber}</span>}
                  <span>Witness: {intervieweeName}</span>
                </div>
                <div>
                  Page {pageNum} of {totalPages}
                </div>
              </div>

              <div className="transcript-content px-6 py-4 font-mono text-sm leading-relaxed">
                {pageLines.map((line, idx) => (
                  <div
                    key={`${pageNum}-${idx}`}
                    className="transcript-line flex items-start gap-4 min-h-[1.5rem]"
                    data-testid={`transcript-line-${pageNum}-${line.lineNumber}`}
                  >
                    <span className="line-number text-muted-foreground w-6 text-right select-none flex-shrink-0">
                      {line.lineNumber}
                    </span>
                    <div className="line-content flex-1">
                      <span>{line.content}</span>
                    </div>
                  </div>
                ))}

                {pageLines.length < LINES_PER_PAGE && (
                  Array.from({ length: LINES_PER_PAGE - pageLines.length }).map((_, idx) => (
                    <div
                      key={`empty-${pageNum}-${idx}`}
                      className="transcript-line flex items-start gap-4 min-h-[1.5rem]"
                    >
                      <span className="line-number text-muted-foreground/50 w-6 text-right select-none flex-shrink-0">
                        {pageLines.length + idx + 1}
                      </span>
                      <div className="line-content flex-1"></div>
                    </div>
                  ))
                )}
              </div>

              <div className="page-footer px-6 py-2 text-center text-xs text-muted-foreground border-t border-muted">
                CONFIDENTIAL - ATTORNEY-CLIENT PRIVILEGED
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {showActionMenu && selectedText && caseId && (
        <div
          className="fixed z-50 bg-background border rounded-lg shadow-lg p-2"
          style={{
            left: selectionCoords.x,
            top: selectionCoords.y,
            transform: "translateX(-50%) translateY(-100%)",
          }}
        >
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleFlagContradiction}
              disabled={flagContradictionMutation.isPending}
              data-testid="button-flag-contradiction-transcript"
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Flag Contradiction
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddToFindings}
              disabled={addToFindingsMutation.isPending}
              data-testid="button-add-to-findings-transcript"
            >
              <ListPlus className="h-4 w-4 mr-1" />
              Add to Findings
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowActionMenu(false);
                setSelectedText(null);
              }}
              data-testid="button-cancel-transcript-action"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function formatCourtTranscriptText(
  questions: TranscriptQuestion[],
  intervieweeName: string,
  interviewDate: string,
  caseNumber?: string
): string {
  const lines: string[] = [];
  let globalLineNumber = 1;
  let currentPage = 1;

  const addHeader = () => {
    lines.push(`${"=".repeat(70)}`);
    lines.push(`Page ${currentPage}`);
    if (caseNumber) lines.push(`Case: ${caseNumber}`);
    lines.push(`Witness: ${intervieweeName}`);
    lines.push(`Date: ${interviewDate}`);
    lines.push(`${"=".repeat(70)}`);
    lines.push("");
  };

  addHeader();

  const addLine = (content: string) => {
    const lineInPage = ((globalLineNumber - 1) % LINES_PER_PAGE) + 1;
    
    if (lineInPage === 1 && globalLineNumber > 1) {
      currentPage++;
      lines.push("");
      lines.push(`${"─".repeat(70)}`);
      lines.push(`                                              [PAGE BREAK]`);
      lines.push(`${"─".repeat(70)}`);
      addHeader();
    }

    const lineNumStr = lineInPage.toString().padStart(2, " ");
    lines.push(`${lineNumStr}  ${content}`);
    globalLineNumber++;
  };

  for (const q of questions) {
    const questionLines = splitTextIntoLines(`Q: ${q.questionText}`);
    for (const lineContent of questionLines) {
      addLine(lineContent);
    }
    
    const answerLines = splitTextIntoLines(`A: ${q.answerText || "[No response recorded]"}`);
    for (const lineContent of answerLines) {
      addLine(lineContent);
    }
  }

  lines.push("");
  lines.push(`${"=".repeat(70)}`);
  lines.push("                    END OF TRANSCRIPT");
  lines.push(`${"=".repeat(70)}`);

  return lines.join("\n");
}
