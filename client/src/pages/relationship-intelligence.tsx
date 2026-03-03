import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Database,
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
  const kbConnections = alert.knowledgeBaseConnections as {
    entries: Array<{ id: string; title: string; documentType: string; summary: string; relevance: number }>;
    connectionSummary: string;
  } | null;

  return (
    <Card
      className={alert.isRead ? "opacity-75" : ""}
      data-testid={`alert-card-${alert.id}`}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>{getInitials(contact.fullName)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" data-testid={`text-contact-name-${alert.id}`}>
                    {contact.fullName}
                  </span>
                  {contact.company && (
                    <span className="text-xs text-muted-foreground">
                      {contact.jobTitle ? `${contact.jobTitle} at ` : ""}{contact.company}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium mt-1" data-testid={`text-headline-${alert.id}`}>
                  {alert.headline}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {alert.sourceName} &middot; {timeAgo(alert.publishedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <SentimentBadge sentiment={alert.sentiment} />
              <CategoryBadge category={alert.category} />
              {contact.priorityLevel <= 2 && (
                <Badge variant="outline" data-testid={`badge-priority-${alert.id}`}>
                  {contact.priorityLevel === 1 ? "VIP" : "High Priority"}
                </Badge>
              )}
              {!alert.isRead && (
                <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
              )}
            </div>

            {alert.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-summary-${alert.id}`}>
                {alert.summary}
              </p>
            )}

            {kbConnections && kbConnections.entries && kbConnections.entries.length > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <Database className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {kbConnections.entries.length} KB Connection{kbConnections.entries.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {kbConnections.connectionSummary}
                  </p>
                </div>
              </div>
            )}

            {alert.suggestedOutreach && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <Zap className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {alert.suggestedOutreach}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
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
              {alert.sourceUrl && alert.sourceUrl !== "#" && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${alert.id}`}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Source
                  </a>
                </Button>
              )}
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
          </div>
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

export default function RelationshipIntelligence() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [contactFilter, setContactFilter] = useState("all");
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
      const res = await apiRequest("POST", "/api/relationship-intelligence/scan", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
      toast({
        title: "Scan Complete",
        description: `Scanned ${data.scanned} contacts, created ${data.alertsCreated} new alerts.`,
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
          <Button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            data-testid="button-scan-news"
          >
            {scanMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Scan News
          </Button>
        </div>

        <StatsBar stats={stats} isLoading={statsLoading} />

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
