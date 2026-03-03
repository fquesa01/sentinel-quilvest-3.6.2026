import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Bell,
  Send,
  Calendar,
  Search,
  Mail,
  Linkedin,
  Eye,
  EyeOff,
  ExternalLink,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  Building2,
  Briefcase,
} from "lucide-react";
import type { NewsAlert, RelationshipContact } from "@shared/schema";

type AlertWithContact = {
  alert: NewsAlert;
  contact: {
    id: string;
    fullName: string;
    company: string | null;
    jobTitle: string | null;
    email: string | null;
    priorityLevel: number;
    tags: string[] | null;
  };
};

type StatsData = {
  contactsMonitored: number;
  alertsThisWeek: number;
  outreachSent: number;
  meetingsBooked: number;
  knowledgeBaseEntries: number;
  unreadAlerts: number;
};

type OutreachVariant = {
  type: string;
  channel: string;
  message: string;
  subjectLine: string | null;
  tone: string;
};

type OutreachResponse = {
  variants: OutreachVariant[];
  kbConnectionUsed: string;
};

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "unknown";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SentimentIcon({ sentiment }: { sentiment: string | null }) {
  if (sentiment === "positive") return <TrendingUp className="w-3 h-3" />;
  if (sentiment === "negative") return <TrendingDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const variant = sentiment === "positive"
    ? "default"
    : sentiment === "negative"
      ? "destructive"
      : "secondary";

  return (
    <Badge variant={variant} data-testid={`badge-sentiment-${sentiment}`}>
      <SentimentIcon sentiment={sentiment} />
      <span className="ml-1 capitalize">{sentiment || "neutral"}</span>
    </Badge>
  );
}

function CategoryBadge({ category }: { category: string | null }) {
  return (
    <Badge variant="outline" data-testid={`badge-category-${category}`}>
      <span className="capitalize">{category || "general"}</span>
    </Badge>
  );
}

function StatsBar({ stats, isLoading }: { stats: StatsData | undefined; isLoading: boolean }) {
  const items = [
    { label: "Contacts Monitored", value: stats?.contactsMonitored ?? 0, icon: Users, testId: "stat-contacts" },
    { label: "Alerts This Week", value: stats?.alertsThisWeek ?? 0, icon: Bell, testId: "stat-alerts" },
    { label: "Outreach Sent", value: stats?.outreachSent ?? 0, icon: Send, testId: "stat-outreach" },
    { label: "Meetings Booked", value: stats?.meetingsBooked ?? 0, icon: Calendar, testId: "stat-meetings" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.testId}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
            <item.icon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid={item.testId}>
                {item.value}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function highlightNames(text: string, contactName: string, company: string | null): JSX.Element {
  const parts: string[] = [contactName];
  if (company) parts.push(company);
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const segments = text.split(regex);
  const matchRegex = new RegExp(`^(${escaped.join("|")})$`, "i");
  return (
    <>
      {segments.map((seg, i) =>
        matchRegex.test(seg) ? (
          <span key={i} className="font-semibold text-foreground">{seg}</span>
        ) : (
          <span key={i}>{seg}</span>
        )
      )}
    </>
  );
}

function AlertCard({
  alertData,
  onDraftEmail,
  onDraftLinkedIn,
  onDismiss,
  onMarkRead,
}: {
  alertData: AlertWithContact;
  onDraftEmail: () => void;
  onDraftLinkedIn: () => void;
  onDismiss: () => void;
  onMarkRead: () => void;
}) {
  const { alert, contact } = alertData;

  return (
    <Card
      className={alert.isRead ? "opacity-75" : ""}
      data-testid={`alert-card-${alert.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback>{getInitials(contact.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span className="font-semibold text-sm" data-testid={`text-contact-name-${alert.id}`}>
                {contact.fullName}
              </span>
              {contact.company && (
                <span className="text-xs text-muted-foreground ml-1.5">
                  {contact.company}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <CategoryBadge category={alert.category} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo(alert.publishedAt)}
            </span>
            {!alert.isRead && (
              <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
        </div>

        {alert.sourceUrl && alert.sourceUrl !== "#" ? (
          <a
            href={alert.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-base font-semibold leading-snug hover:underline"
            data-testid={`text-headline-${alert.id}`}
          >
            {alert.headline}
            <ExternalLink className="w-3.5 h-3.5 inline-block ml-1.5 text-muted-foreground" />
          </a>
        ) : (
          <h4 className="text-base font-semibold leading-snug" data-testid={`text-headline-${alert.id}`}>
            {alert.headline}
          </h4>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <SentimentBadge sentiment={alert.sentiment} />
          <CategoryBadge category={alert.category} />
          {contact.priorityLevel <= 2 && (
            <Badge variant="outline" data-testid={`badge-priority-${alert.id}`}>
              {contact.priorityLevel === 1 ? "VIP" : "High Priority"}
            </Badge>
          )}
        </div>

        {alert.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-summary-${alert.id}`}>
            {highlightNames(alert.summary, contact.fullName, contact.company)}
          </p>
        )}

        {alert.sourceName && (
          <p className="text-xs text-muted-foreground" data-testid={`text-source-${alert.id}`}>
            {alert.sourceName} &middot; {timeAgo(alert.publishedAt)}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {alert.sourceUrl && alert.sourceUrl !== "#" && (
            <Button
              size="sm"
              asChild
              data-testid={`button-read-article-${alert.id}`}
            >
              <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Read Full Article
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDraftEmail}
            data-testid={`button-draft-email-${alert.id}`}
          >
            <Mail className="w-3.5 h-3.5 mr-1" />
            Draft Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDraftLinkedIn}
            data-testid={`button-draft-linkedin-${alert.id}`}
          >
            <Linkedin className="w-3.5 h-3.5 mr-1" />
            Draft LinkedIn
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkRead}
            data-testid={`button-mark-read-${alert.id}`}
          >
            {alert.isRead ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
            {alert.isRead ? "Unread" : "Read"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            data-testid={`button-dismiss-${alert.id}`}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachDialog({
  open,
  onOpenChange,
  alert,
  contact,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: NewsAlert | null;
  contact: { id: string; fullName: string; company: string | null } | null;
  channel: string;
}) {
  const { toast } = useToast();
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/relationship-intelligence/outreach/generate", {
        alertId: alert?.id,
        contactId: contact?.id,
      });
      return res.json() as Promise<OutreachResponse>;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const logOutreachMutation = useMutation({
    mutationFn: async (data: { channel: string; messageContent: string }) => {
      await apiRequest("POST", "/api/relationship-intelligence/outreach", {
        contactId: contact?.id,
        newsAlertId: alert?.id,
        channel: data.channel,
        messageContent: data.messageContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
      toast({ title: "Outreach Logged", description: "Message logged to outreach history." });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (open && !hasFiredRef.current) {
      hasFiredRef.current = true;
      generateMutation.mutate();
    }
    if (!open) {
      hasFiredRef.current = false;
    }
  }, [open]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleLogSent = () => {
    if (selectedVariant !== null && generateMutation.data?.variants) {
      const variant = generateMutation.data.variants[selectedVariant];
      logOutreachMutation.mutate({
        channel: variant.channel,
        messageContent: editedMessage || variant.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-outreach">
            Draft {channel === "linkedin" ? "LinkedIn" : "Email"} Outreach
          </DialogTitle>
          <DialogDescription>
            {contact && (
              <>Outreach to {contact.fullName}{contact.company ? ` at ${contact.company}` : ""}</>
            )}
          </DialogDescription>
        </DialogHeader>

        {alert && (
          <div className="p-3 rounded-md bg-muted/50 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">News Context</p>
            <p className="text-sm font-medium">{alert.headline}</p>
            {alert.summary && (
              <p className="text-xs text-muted-foreground">{alert.summary}</p>
            )}
          </div>
        )}

        {generateMutation.isPending && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Generating outreach variants...</span>
          </div>
        )}

        {generateMutation.isError && (
          <div className="py-4 text-center space-y-2">
            <p className="text-sm text-destructive">Failed to generate outreach messages.</p>
            <Button variant="outline" size="sm" onClick={() => generateMutation.mutate()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {generateMutation.data?.variants && (
          <div className="space-y-3">
            {generateMutation.data.variants.map((variant, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer toggle-elevate ${selectedVariant === idx ? "toggle-elevated border-primary" : ""}`}
                onClick={() => {
                  setSelectedVariant(idx);
                  setEditedMessage(variant.message);
                }}
                data-testid={`outreach-variant-${variant.type}`}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="capitalize">{variant.type}</Badge>
                      <Badge variant="outline" className="capitalize">{variant.channel}</Badge>
                      {variant.tone && (
                        <span className="text-xs text-muted-foreground capitalize">{variant.tone}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(variant.message, idx);
                      }}
                      data-testid={`button-copy-variant-${idx}`}
                    >
                      {copiedIdx === idx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  {variant.subjectLine && (
                    <p className="text-xs text-muted-foreground">
                      Subject: {variant.subjectLine}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{variant.message}</p>
                </CardContent>
              </Card>
            ))}

            {generateMutation.data.kbConnectionUsed && generateMutation.data.kbConnectionUsed !== "none" && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  KB Connection: {generateMutation.data.kbConnectionUsed}
                </p>
              </div>
            )}
          </div>
        )}

        {selectedVariant !== null && generateMutation.data?.variants && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Edit before sending</label>
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="min-h-[100px]"
              data-testid="textarea-edit-outreach"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-outreach">
            Cancel
          </Button>
          <Button
            onClick={handleLogSent}
            disabled={selectedVariant === null || logOutreachMutation.isPending}
            data-testid="button-log-outreach"
          >
            {logOutreachMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Log as Sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const addContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  company: z.string().optional().default(""),
  jobTitle: z.string().optional().default(""),
  priorityLevel: z.number().min(1).max(5).default(3),
});

type AddContactValues = z.infer<typeof addContactSchema>;

function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<AddContactValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      jobTitle: "",
      priorityLevel: 3,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AddContactValues) => {
      return apiRequest("POST", "/api/relationship-intelligence/contacts", {
        ...data,
        tags: [],
      });
    },
    onSuccess: () => {
      toast({ title: "Contact added to monitoring" });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Contact to Monitor</DialogTitle>
          <DialogDescription>Add a new person to track for news and updates.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} data-testid="input-add-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priorityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority (1=highest, 5=lowest)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => field.onChange(star)}
                          data-testid={`star-add-${star}`}
                        >
                          <Star
                            className={`h-5 w-5 ${
                              star <= field.value
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-add-contact">
                {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Add Contact
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ContactsPanel() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const queryParams = new URLSearchParams();
  if (contactSearch) queryParams.set("search", contactSearch);
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(page * pageSize));
  const qStr = queryParams.toString();

  const { data: contactsData, isLoading } = useQuery<{
    contacts: RelationshipContact[];
    total: number;
  }>({
    queryKey: ["/api/relationship-intelligence/contacts", `?${qStr}`],
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/relationship-intelligence/contacts/${contactId}`);
    },
    onSuccess: () => {
      toast({ title: "Contact removed from monitoring" });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const contacts = contactsData?.contacts || [];
  const total = contactsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    setPage(0);
  }, [contactSearch]);

  return (
    <>
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between gap-2 space-y-0 cursor-pointer hover-elevate"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-contacts-panel"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Monitored Contacts
            </CardTitle>
            <Badge variant="secondary" data-testid="badge-contact-count">{total || "..."}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {expanded && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddDialogOpen(true);
                }}
                data-testid="button-add-contact"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Contact
              </Button>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts by name, email, or company..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-contacts"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-6 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {contactSearch ? "No contacts match your search." : "No contacts being monitored yet."}
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className={contacts.length > 8 ? "h-[400px]" : ""}>
                  <div className="space-y-1">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate group"
                        data-testid={`contact-row-${contact.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(contact.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate" data-testid={`text-contact-name-${contact.id}`}>
                              {contact.fullName}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`h-3 w-3 ${
                                    s <= contact.priorityLevel
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/20"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {contact.company && (
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="w-3 h-3 shrink-0" />
                                {contact.company}
                              </span>
                            )}
                            {contact.jobTitle && (
                              <span className="flex items-center gap-1 truncate">
                                <Briefcase className="w-3 h-3 shrink-0" />
                                {contact.jobTitle}
                              </span>
                            )}
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                          </div>
                        </div>
                        {confirmDelete === contact.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                deleteMutation.mutate(contact.id);
                                setConfirmDelete(null);
                              }}
                              data-testid={`button-confirm-delete-${contact.id}`}
                            >
                              Remove
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(null)}
                              data-testid={`button-cancel-delete-${contact.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="invisible group-hover:visible"
                            onClick={() => setConfirmDelete(contact.id)}
                            data-testid={`button-delete-contact-${contact.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <p className="text-xs text-muted-foreground" data-testid="text-contacts-pagination">
                      Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        data-testid="button-contacts-prev"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => p + 1)}
                        data-testid="button-contacts-next"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
      <AddContactDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}

export default function RelationshipIntelligence() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
  const [scanMode, setScanMode] = useState<"both" | "person" | "company">("both");
  const [outreachDialog, setOutreachDialog] = useState<{
    open: boolean;
    alert: NewsAlert | null;
    contact: { id: string; fullName: string; company: string | null } | null;
    channel: string;
  }>({ open: false, alert: null, contact: null, channel: "email" });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/relationship-intelligence/stats"],
  });

  const alertQueryParams = new URLSearchParams();
  if (categoryFilter !== "all") alertQueryParams.set("category", categoryFilter);
  if (sentimentFilter !== "all") alertQueryParams.set("sentiment", sentimentFilter);
  if (contactFilter !== "all") alertQueryParams.set("contactId", contactFilter);
  const alertQueryString = alertQueryParams.toString();

  const { data: alertsData, isLoading: alertsLoading } = useQuery<{
    alerts: AlertWithContact[];
    total: number;
  }>({
    queryKey: ["/api/relationship-intelligence/alerts", alertQueryString ? `?${alertQueryString}` : ""],
  });

  const { data: contactsData } = useQuery<{
    contacts: RelationshipContact[];
    total: number;
  }>({
    queryKey: ["/api/relationship-intelligence/contacts"],
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, boolean> }) => {
      await apiRequest("PATCH", `/api/relationship-intelligence/alerts/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/relationship-intelligence/scan", { searchMode: scanMode });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
      const parts = [];
      if (data.companies) parts.push(`${data.companies} companies`);
      if (data.scanned) parts.push(`${data.scanned} contacts`);
      toast({
        title: "News Scan Complete",
        description: data.alertsCreated > 0
          ? `Found ${data.alertsCreated} new article${data.alertsCreated !== 1 ? "s" : ""} across ${parts.join(" and ")}.`
          : `Scanned ${parts.join(" and ")} — no new articles found.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Scan Error", description: error.message, variant: "destructive" });
    },
  });

  const allAlerts = alertsData?.alerts || [];

  const filteredAlerts = searchQuery
    ? allAlerts.filter(
        (a) =>
          a.alert.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.contact.company && a.contact.company.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allAlerts;

  const highPriority = filteredAlerts.filter(
    (a) => a.contact.priorityLevel <= 2 || (a.alert.knowledgeBaseConnections as any)?.entries?.length > 0
  );
  const mediumPriority = filteredAlerts.filter(
    (a) =>
      a.contact.priorityLevel === 3 &&
      !((a.alert.knowledgeBaseConnections as any)?.entries?.length > 0)
  );
  const otherPriority = filteredAlerts.filter(
    (a) =>
      a.contact.priorityLevel > 3 &&
      !((a.alert.knowledgeBaseConnections as any)?.entries?.length > 0)
  );

  const openOutreachDialog = (alert: NewsAlert, contact: AlertWithContact["contact"], channel: string) => {
    setOutreachDialog({
      open: true,
      alert,
      contact: { id: contact.id, fullName: contact.fullName, company: contact.company },
      channel,
    });
  };

  const renderAlertGroup = (title: string, alerts: AlertWithContact[], testId: string) => {
    if (alerts.length === 0) return null;
    return (
      <div className="space-y-3" data-testid={testId}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title} ({alerts.length})
        </h3>
        {alerts.map((alertData) => (
          <AlertCard
            key={alertData.alert.id}
            alertData={alertData}
            onDraftEmail={() => openOutreachDialog(alertData.alert, alertData.contact, "email")}
            onDraftLinkedIn={() => openOutreachDialog(alertData.alert, alertData.contact, "linkedin")}
            onDismiss={() =>
              updateAlertMutation.mutate({ id: alertData.alert.id, updates: { isDismissed: true } })
            }
            onMarkRead={() =>
              updateAlertMutation.mutate({ id: alertData.alert.id, updates: { isRead: !alertData.alert.isRead } })
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 space-y-4 max-w-[1200px] mx-auto w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Intelligence Feed
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor your professional network and surface actionable opportunities
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={scanMode} onValueChange={(v) => setScanMode(v as any)}>
              <SelectTrigger className="w-[180px]" data-testid="select-scan-mode">
                <SelectValue placeholder="Scan Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Person & Company</SelectItem>
                <SelectItem value="person">Person Only</SelectItem>
                <SelectItem value="company">Company Only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              data-testid="button-scan-news"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Scan News
                </>
              )}
            </Button>
          </div>
        </div>

        <StatsBar stats={stats} isLoading={statsLoading} />

        <ContactsPanel />

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts, contacts, companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-alerts"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="funding">Funding</SelectItem>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="award">Award</SelectItem>
                  <SelectItem value="departure">Departure</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="ipo">IPO</SelectItem>
                  <SelectItem value="bankruptcy">Bankruptcy</SelectItem>
                  <SelectItem value="regulatory">Regulatory</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-sentiment-filter">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>

              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-contact-filter">
                  <SelectValue placeholder="All Contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  {contactsData?.contacts?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {alertsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold" data-testid="text-no-alerts">No alerts found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {allAlerts.length === 0
                  ? "Click \"Scan News\" to check for news about your contacts."
                  : "No alerts match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {renderAlertGroup("High Priority", highPriority, "group-high-priority")}
            {renderAlertGroup("Medium Priority", mediumPriority, "group-medium-priority")}
            {renderAlertGroup("Other", otherPriority, "group-other")}
          </div>
        )}
      </div>

      <OutreachDialog
        open={outreachDialog.open}
        onOpenChange={(open) => setOutreachDialog((prev) => ({ ...prev, open }))}
        alert={outreachDialog.alert}
        contact={outreachDialog.contact}
        channel={outreachDialog.channel}
      />
    </div>
  );
}
