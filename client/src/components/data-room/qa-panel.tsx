import { useState, FormEvent } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  Filter,
  Plus,
  X,
  FileText,
  Folder,
} from "lucide-react";
import { format } from "date-fns";

interface QAPanelProps {
  dataRoomId: string;
  isOpen: boolean;
  onClose: () => void;
  folderId?: string | null;
  documentId?: string | null;
}

interface Question {
  id: string;
  dataRoomId: string;
  askedById?: string;
  askedByGuestId?: string;
  relatedFolderId?: string;
  relatedDocumentId?: string;
  question: string;
  answer?: string;
  answeredById?: string;
  answeredAt?: string;
  status: string;
  priority?: string;
  createdAt: string;
  askedBy?: { email: string; firstName?: string; lastName?: string };
  askedByGuest?: { email: string; firstName?: string; lastName?: string };
  answeredBy?: { email: string; firstName?: string; lastName?: string };
  relatedFolder?: { name: string; indexNumber?: string };
  relatedDocument?: { fileName: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  answered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-amber-500",
  high: "text-red-500",
};

export function QAPanel({ dataRoomId, isOpen, onClose, folderId, documentId }: QAPanelProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewQuestionOpen, setIsNewQuestionOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  const { data: questions, refetch } = useQuery<Question[]>({
    queryKey: ["/api/data-rooms", dataRoomId, "questions"],
    queryFn: async () => {
      let url = `/api/data-rooms/${dataRoomId}/questions`;
      const params = new URLSearchParams();
      if (folderId) params.append("folderId", folderId);
      if (documentId) params.append("documentId", documentId);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load questions");
      return res.json();
    },
    enabled: isOpen,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: {
      question: string;
      priority: string;
      relatedFolderId?: string;
      relatedDocumentId?: string;
    }) => {
      return apiRequest("POST", `/api/data-rooms/${dataRoomId}/questions`, data);
    },
    onSuccess: () => {
      refetch();
      setNewQuestion("");
      setIsNewQuestionOpen(false);
      toast({ title: "Question submitted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const answerQuestionMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      return apiRequest("POST", `/api/data-room-questions/${questionId}/answer`, { answer });
    },
    onSuccess: () => {
      refetch();
      setExpandedQuestionId(null);
      setAnswerText("");
      toast({ title: "Answer submitted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmitQuestion = (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    createQuestionMutation.mutate({
      question: newQuestion.trim(),
      priority: selectedPriority,
      relatedFolderId: folderId || undefined,
      relatedDocumentId: documentId || undefined,
    });
  };

  const handleSubmitAnswer = (questionId: string) => {
    if (!answerText.trim()) return;
    answerQuestionMutation.mutate({ questionId, answer: answerText.trim() });
  };

  const getAskerName = (q: Question) => {
    const person = q.askedBy || q.askedByGuest;
    if (!person) return "Unknown";
    if (person.firstName && person.lastName) {
      return `${person.firstName} ${person.lastName}`;
    }
    return person.email;
  };

  const getAskerInitials = (q: Question) => {
    const person = q.askedBy || q.askedByGuest;
    if (!person) return "??";
    if (person.firstName && person.lastName) {
      return `${person.firstName[0]}${person.lastName[0]}`.toUpperCase();
    }
    return person.email.substring(0, 2).toUpperCase();
  };

  const filteredQuestions = (questions || []).filter((q) => {
    if (statusFilter === "all") return true;
    return q.status === statusFilter;
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Q&A
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Questions</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredQuestions.length} questions
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setIsNewQuestionOpen(true)}
            data-testid="button-new-question"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ask Question
          </Button>
        </div>

        {isNewQuestionOpen && (
          <Card className="mb-4">
            <CardContent className="pt-4">
              <form onSubmit={handleSubmitQuestion} className="space-y-3">
                <div>
                  <Label>Your Question</Label>
                  <Textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Enter your question about this data room..."
                    className="mt-1"
                    data-testid="input-new-question"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                      <SelectTrigger className="w-[120px] mt-1" data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsNewQuestionOpen(false);
                      setNewQuestion("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newQuestion.trim() || createQuestionMutation.isPending}
                    data-testid="button-submit-question"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="flex-1 h-[400px]">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No questions yet</p>
              <p className="text-sm">Be the first to ask a question about this data room</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q) => (
                <Card
                  key={q.id}
                  className={expandedQuestionId === q.id ? "ring-2 ring-primary" : ""}
                  data-testid={`question-${q.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="text-xs">
                          {getAskerInitials(q)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{getAskerName(q)}</span>
                          <Badge className={statusColors[q.status] || statusColors.pending}>
                            {q.status === "pending" ? (
                              <Clock className="h-3 w-3 mr-1" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            {q.status}
                          </Badge>
                          {q.priority && (
                            <span className={`text-xs ${priorityColors[q.priority]}`}>
                              {q.priority} priority
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{q.question}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>{format(new Date(q.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                          {q.relatedFolder && (
                            <span className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              {q.relatedFolder.indexNumber} {q.relatedFolder.name}
                            </span>
                          )}
                          {q.relatedDocument && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {q.relatedDocument.fileName}
                            </span>
                          )}
                        </div>

                        {q.answer && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs font-medium">Answer</span>
                              {q.answeredAt && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(q.answeredAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{q.answer}</p>
                          </div>
                        )}

                        {q.status === "pending" && (
                          <div className="mt-3">
                            {expandedQuestionId === q.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={answerText}
                                  onChange={(e) => setAnswerText(e.target.value)}
                                  placeholder="Type your answer..."
                                  className="text-sm"
                                  data-testid={`input-answer-${q.id}`}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubmitAnswer(q.id)}
                                    disabled={!answerText.trim() || answerQuestionMutation.isPending}
                                    data-testid={`button-submit-answer-${q.id}`}
                                  >
                                    Submit Answer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setExpandedQuestionId(null);
                                      setAnswerText("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedQuestionId(q.id)}
                                data-testid={`button-answer-${q.id}`}
                              >
                                Answer Question
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
