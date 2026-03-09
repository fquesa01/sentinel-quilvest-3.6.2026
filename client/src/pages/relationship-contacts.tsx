import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { RelationshipContact, NewsAlert, OutreachLogEntry } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  Search,
  Plus,
  Upload,
  Edit2,
  Trash2,
  X,
  FileText,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Linkedin,
  ArrowLeft,
  Newspaper,
  Send,
  Users,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  company: z.string().optional().default(""),
  jobTitle: z.string().optional().default(""),
  linkedinUrl: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  country: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  priorityLevel: z.number().min(1).max(5).default(3),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

function PriorityStars({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly && !onChange}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(star);
          }}
          className={`${readonly && !onChange ? "cursor-default" : "cursor-pointer"}`}
          data-testid={`star-${star}`}
        >
          <Star
            className={`h-4 w-4 ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: RelationshipContact | null;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const isEditing = !!contact;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact?.firstName || "",
      lastName: contact?.lastName || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      company: contact?.company || "",
      jobTitle: contact?.jobTitle || "",
      linkedinUrl: contact?.linkedinUrl || "",
      city: contact?.city || "",
      state: contact?.state || "",
      country: contact?.country || "",
      tags: contact?.tags?.join(", ") || "",
      priorityLevel: contact?.priorityLevel || 3,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const payload = {
        ...data,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/relationship-intelligence/contacts/${contact.id}`, payload);
      }
      return apiRequest("POST", "/api/relationship-intelligence/contacts", payload);
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Contact updated" : "Contact created",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      onSuccess();
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update contact information." : "Add a new contact to monitor."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
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
                      <Input {...field} data-testid="input-last-name" />
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
                    <Input type="email" {...field} data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-phone" />
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
                      <Input {...field} data-testid="input-company" />
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
                      <Input {...field} data-testid="input-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-linkedin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. client, vip, legal" {...field} data-testid="input-tags" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priorityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <PriorityStars
                      value={field.value}
                      onChange={(v) => field.onChange(v)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-contact">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-contact">
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CSVUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);

  const parsePreview = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;
      const hdrs = lines[0].split(",").map((h) => h.trim());
      setHeaders(hdrs);
      const rows = lines.slice(1, 6).map((line) => line.split(",").map((c) => c.trim()));
      setPreview(rows);
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped && dropped.name.endsWith(".csv")) {
        setFile(dropped);
        parsePreview(dropped);
      } else {
        toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      }
    },
    [parsePreview, toast]
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/relationship-intelligence/contacts/import-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete",
        description: `${data.imported} imported, ${data.merged} merged, ${data.skipped} skipped`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      onOpenChange(false);
      setFile(null);
      setPreview(null);
      setHeaders(null);
    },
    onError: (err: Error) => {
      toast({ title: "Import Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with contact information. Duplicates will be automatically merged.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            data-testid="csv-drop-zone"
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop a CSV file here, or click to browse
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-browse-csv"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  parsePreview(f);
                }
              }}
              data-testid="input-csv-file"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium" data-testid="text-csv-filename">{file.name}</span>
                <Badge variant="secondary" className="no-default-active-elevate">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setHeaders(null);
                }}
                data-testid="button-remove-csv"
              >
                <X />
              </Button>
            </div>

            {headers && preview && (
              <div className="border rounded-md overflow-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs py-1 whitespace-nowrap">
                            {cell || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Preview shows first 5 rows. Email and name+company matching will be used for deduplication.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-csv">
            Cancel
          </Button>
          <Button
            disabled={!file || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
            data-testid="button-import-csv"
          >
            {uploadMutation.isPending && <Loader2 className="animate-spin" />}
            Import Contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type OverlapData = {
  alert: {
    id: string;
    headline: string;
    summary: string | null;
    sourceUrl: string | null;
    sourceName: string | null;
    publishedAt: string | null;
    sentiment: string | null;
    category: string | null;
  };
  overlap: Array<{
    id: string;
    type: string;
    subject: string;
    snippet: string;
    sender: string;
    timestamp: string;
    matchReason: string;
  }>;
  searchTermsUsed: string[];
};

function ArticleDetailDialog({
  open,
  onOpenChange,
  alertId,
  contactId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertId: string | null;
  contactId: string;
}) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const prevAlertIdRef = useRef<string | null>(null);

  if (alertId !== prevAlertIdRef.current) {
    prevAlertIdRef.current = alertId;
    if (expandedEmails.size > 0) setExpandedEmails(new Set());
  }

  const overlapQuery = useQuery<OverlapData>({
    queryKey: [`/api/relationship-intelligence/alerts/${alertId}/overlap?contactId=${contactId}`],
    enabled: open && !!alertId,
  });

  const toggleEmail = (id: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (ts: string | null) => {
    if (!ts) return "Unknown date";
    try {
      return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "Unknown date";
    }
  };

  const alert = overlapQuery.data?.alert;
  const overlap = overlapQuery.data?.overlap || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-article-detail">Article Detail</DialogTitle>
          <DialogDescription>
            {alert?.sourceName && <>From {alert.sourceName}</>}
          </DialogDescription>
        </DialogHeader>

        {overlapQuery.isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading article details...</span>
          </div>
        )}

        {overlapQuery.isError && (
          <div className="py-4 text-center">
            <p className="text-sm text-destructive">Failed to load article details.</p>
          </div>
        )}

        {alert && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-base font-semibold" data-testid="text-article-headline">{alert.headline}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {alert.sentiment && (
                  <Badge variant="outline" className="no-default-active-elevate text-xs">{alert.sentiment}</Badge>
                )}
                {alert.category && (
                  <Badge variant="secondary" className="no-default-active-elevate text-xs">{alert.category}</Badge>
                )}
                {alert.publishedAt && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(alert.publishedAt)}
                  </span>
                )}
                {alert.sourceName && (
                  <span className="text-xs text-muted-foreground">{alert.sourceName}</span>
                )}
              </div>
            </div>

            {alert.summary && (
              <div className="p-3 rounded-md bg-muted/50 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Summary</p>
                <p className="text-sm" data-testid="text-article-summary">{alert.summary}</p>
              </div>
            )}

            {alert.sourceUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(alert.sourceUrl!, "_blank")}
                data-testid="button-read-full-article"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Read Full Article
              </Button>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Email Overlap ({overlap.length})
              </h4>
              <p className="text-xs text-muted-foreground">
                Emails that may connect you to this contact or topic.
              </p>

              {overlap.length === 0 ? (
                <div className="p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    No matching emails found for this contact and article.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {overlap.map((item) => (
                    <Card key={item.id} data-testid={`overlap-item-${item.id}`}>
                      <CardContent className="p-3 space-y-1">
                        <div
                          className="flex items-start justify-between gap-2 cursor-pointer"
                          onClick={() => toggleEmail(item.id)}
                          data-testid={`button-toggle-overlap-${item.id}`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-sm font-medium truncate">{item.subject}</p>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              <span>From: {item.sender}</span>
                              {item.timestamp && <span>{formatDate(item.timestamp)}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{item.matchReason}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            {expandedEmails.has(item.id) ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {!expandedEmails.has(item.id) && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.snippet}</p>
                        )}

                        {expandedEmails.has(item.id) && (
                          <div className="mt-2 p-3 rounded-md bg-muted/30">
                            <p className="text-sm whitespace-pre-wrap" data-testid={`text-overlap-body-${item.id}`}>
                              {item.snippet}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-article-detail">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDetailPanel({
  contact,
  onClose,
  onEdit,
}: {
  contact: RelationshipContact;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [articleDialog, setArticleDialog] = useState<{ open: boolean; alertId: string | null }>({ open: false, alertId: null });

  const alertsQuery = useQuery<{
    alerts: Array<{ alert: NewsAlert; contact: any }>;
    total: number;
  }>({
    queryKey: ["/api/relationship-intelligence/alerts", `?contactId=${contact.id}&limit=10`],
  });

  const outreachQuery = useQuery<OutreachLogEntry[]>({
    queryKey: ["/api/relationship-intelligence/outreach", `?contactId=${contact.id}`],
    enabled: false,
  });

  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const location = [contact.city, contact.state, contact.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b flex-wrap">
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-detail">
          <ArrowLeft />
        </Button>
        <span className="font-semibold flex-1" data-testid="text-detail-name">{contact.fullName}</span>
        <Button variant="outline" size="sm" onClick={onEdit} data-testid="button-edit-from-detail">
          <Edit2 className="mr-1" /> Edit
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold" data-testid="text-contact-fullname">{contact.fullName}</h2>
            {contact.jobTitle && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                <Briefcase className="h-3 w-3" /> {contact.jobTitle}
              </p>
            )}
            {contact.company && (
              <p className="text-sm text-muted-foreground" data-testid="text-contact-company">
                {contact.company}
              </p>
            )}
            <PriorityStars value={contact.priorityLevel} readonly />
          </div>
        </div>

        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span data-testid="text-contact-email">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span data-testid="text-contact-phone">{contact.phone}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span data-testid="text-contact-location">{location}</span>
            </div>
          )}
          {contact.linkedinUrl && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline truncate"
                data-testid="link-contact-linkedin"
              >
                LinkedIn Profile
              </a>
            </div>
          )}
        </div>

        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="no-default-active-elevate" data-testid={`badge-tag-${i}`}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Newspaper className="h-4 w-4" /> Recent News Alerts
          </h3>
          {alertsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts...
            </div>
          ) : alertsQuery.data?.alerts && alertsQuery.data.alerts.length > 0 ? (
            <div className="space-y-2">
              {alertsQuery.data.alerts.map(({ alert }) => (
                <Card
                  key={alert.id}
                  className="p-3 cursor-pointer hover-elevate"
                  onClick={() => setArticleDialog({ open: true, alertId: alert.id })}
                  data-testid={`card-alert-${alert.id}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2" data-testid={`text-alert-headline-${alert.id}`}>
                        {alert.headline}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {alert.sentiment && (
                          <Badge
                            variant="outline"
                            className="no-default-active-elevate text-xs"
                            data-testid={`badge-sentiment-${alert.id}`}
                          >
                            {alert.sentiment}
                          </Badge>
                        )}
                        {alert.category && (
                          <Badge
                            variant="secondary"
                            className="no-default-active-elevate text-xs"
                            data-testid={`badge-category-${alert.id}`}
                          >
                            {alert.category}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {alert.sourceName}
                        </span>
                      </div>
                      {alert.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{alert.summary}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No news alerts yet.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Send className="h-4 w-4" /> Outreach History
          </h3>
          {outreachQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : outreachQuery.data && outreachQuery.data.length > 0 ? (
            <div className="space-y-2">
              {outreachQuery.data.map((entry) => (
                <Card key={entry.id} className="p-3">
                  <p className="text-sm">{entry.messageContent?.substring(0, 100)}...</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {entry.channel && <Badge variant="outline" className="no-default-active-elevate text-xs">{entry.channel}</Badge>}
                    {entry.outcome && <Badge variant="secondary" className="no-default-active-elevate text-xs">{entry.outcome}</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No outreach history yet.</p>
          )}
        </div>
      </div>

      <ArticleDetailDialog
        open={articleDialog.open}
        onOpenChange={(open) => setArticleDialog(prev => ({ ...prev, open }))}
        alertId={articleDialog.alertId}
        contactId={contact.id}
      />
    </div>
  );
}

interface CaseWithComms {
  id: string;
  title: string;
  comm_count: number;
  sender_count: number;
}

interface ImportResult {
  message: string;
  imported: number;
  skipped: number;
  totalExtracted: number;
  caseTitle: string;
  topCommunicators: string[];
  organizations: string[];
}

function CaseImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const casesQuery = useQuery<CaseWithComms[]>({
    queryKey: ["/api/relationship-intelligence/cases-with-comms"],
    enabled: open,
  });

  const importMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const res = await apiRequest("POST", "/api/relationship-intelligence/import-from-case", { caseId });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/stats"] });
      toast({ title: `Imported ${data.imported} contacts from "${data.caseTitle}"` });
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setSelectedCaseId(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Contacts from Case</DialogTitle>
          <DialogDescription>
            Extract contacts from case communications and add them to your intelligence feed.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium" data-testid="text-import-success">Import Complete</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-import-extracted">{result.totalExtracted}</p>
                <p className="text-xs text-muted-foreground">Extracted</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-import-imported">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-import-skipped">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </Card>
            </div>
            {result.organizations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Organizations Found</p>
                <div className="flex flex-wrap gap-1">
                  {result.organizations.map((org) => (
                    <Badge key={org} variant="secondary" className="no-default-active-elevate text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {org}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {result.topCommunicators.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Top Communicators</p>
                <div className="flex flex-wrap gap-1">
                  {result.topCommunicators.slice(0, 8).map((name) => (
                    <Badge key={name} variant="outline" className="no-default-active-elevate text-xs">{name}</Badge>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose} data-testid="button-import-done">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {casesQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !casesQuery.data || casesQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-cases">
                No cases with communications found.
              </p>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {casesQuery.data.map((c) => (
                    <Card
                      key={c.id}
                      className={`p-3 cursor-pointer hover-elevate ${
                        selectedCaseId === c.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedCaseId(c.id)}
                      data-testid={`card-case-${c.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-case-title-${c.id}`}>{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.comm_count.toLocaleString()} communications · {c.sender_count} unique senders
                          </p>
                        </div>
                        <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} data-testid="button-import-cancel">Cancel</Button>
              <Button
                onClick={() => selectedCaseId && importMutation.mutate(selectedCaseId)}
                disabled={!selectedCaseId || importMutation.isPending}
                data-testid="button-import-contacts"
              >
                {importMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><FolderOpen className="h-4 w-4" /> Import Contacts</>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RelationshipContactsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [showAddDialog, setShowAddDialog] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("createContact")) {
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return false;
  });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [showCaseImport, setShowCaseImport] = useState(false);
  const [editingContact, setEditingContact] = useState<RelationshipContact | null>(null);
  const [selectedContact, setSelectedContact] = useState<RelationshipContact | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (companyFilter) queryParams.set("company", companyFilter);
  if (priorityFilter) queryParams.set("priority", priorityFilter);
  queryParams.set("limit", String(pageSize));
  queryParams.set("offset", String(page * pageSize));

  const contactsQuery = useQuery<{ contacts: RelationshipContact[]; total: number }>({
    queryKey: ["/api/relationship-intelligence/contacts", `?${queryParams.toString()}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/relationship-intelligence/contacts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Contact deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
      if (selectedContact) setSelectedContact(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const priorityMutation = useMutation({
    mutationFn: async ({ id, priorityLevel }: { id: string; priorityLevel: number }) => {
      return apiRequest("PATCH", `/api/relationship-intelligence/contacts/${id}`, { priorityLevel });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationship-intelligence/contacts"] });
    },
  });

  const contacts = contactsQuery.data?.contacts || [];
  const total = contactsQuery.data?.total || 0;

  if (selectedContact) {
    return (
      <div className="h-full">
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onEdit={() => {
            setEditingContact(selectedContact);
            setShowEditDialog(true);
          }}
        />
        {showEditDialog && editingContact && (
          <ContactFormDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            contact={editingContact}
            onSuccess={() => {
              setEditingContact(null);
              const refreshed = contacts.find((c) => c.id === selectedContact.id);
              if (refreshed) setSelectedContact(refreshed);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-lg font-semibold" data-testid="text-page-title">Contacts</h1>
            <Badge variant="secondary" className="no-default-active-elevate" data-testid="badge-contact-count">
              {total}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowCaseImport(true)} data-testid="button-import-case-open">
              <FolderOpen /> Import from Case
            </Button>
            <Button variant="outline" onClick={() => setShowCSVDialog(true)} data-testid="button-import-csv-open">
              <Upload /> Import CSV
            </Button>
            <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-contact">
              <Plus /> Add Contact
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-contacts"
            />
          </div>
          <Input
            placeholder="Filter by company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-48"
            data-testid="input-filter-company"
          />
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40" data-testid="select-filter-priority">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="5">5 Stars (VIP)</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          {(searchQuery || companyFilter || priorityFilter) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setCompanyFilter("");
                setPriorityFilter("");
              }}
              data-testid="button-clear-filters"
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {contactsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium" data-testid="text-empty-state">No contacts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add contacts manually or import from a CSV file.
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button variant="outline" onClick={() => setShowCaseImport(true)} data-testid="button-import-case-empty">
                <FolderOpen /> Import from Case
              </Button>
              <Button variant="outline" onClick={() => setShowCSVDialog(true)} data-testid="button-import-csv-empty">
                <Upload /> Import CSV
              </Button>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-contact-empty">
                <Plus /> Add Contact
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Last News</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => {
                const initials = [contact.firstName?.[0], contact.lastName?.[0]]
                  .filter(Boolean)
                  .join("")
                  .toUpperCase() || "?";

                return (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedContact(contact)}
                    data-testid={`row-contact-${contact.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-name-${contact.id}`}>
                            {contact.fullName}
                          </p>
                          {contact.email && (
                            <p className="text-xs text-muted-foreground">{contact.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`text-company-${contact.id}`}>
                        {contact.company || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-title-${contact.id}`}>
                        {contact.jobTitle || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <PriorityStars
                        value={contact.priorityLevel}
                        onChange={(val) => {
                          priorityMutation.mutate({ id: contact.id, priorityLevel: val });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.slice(0, 3).map((tag, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="no-default-active-elevate text-xs"
                              data-testid={`badge-tag-${contact.id}-${i}`}
                            >
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {contact.tags && contact.tags.length > 3 && (
                          <Badge variant="outline" className="no-default-active-elevate text-xs">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" data-testid={`text-last-scan-${contact.id}`}>
                        {contact.lastNewsScanAt
                          ? new Date(contact.lastNewsScanAt).toLocaleDateString()
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContact(contact);
                            setShowEditDialog(true);
                          }}
                          data-testid={`button-edit-${contact.id}`}
                        >
                          <Edit2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this contact?")) {
                              deleteMutation.mutate(contact.id);
                            }
                          }}
                          data-testid={`button-delete-${contact.id}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {total > pageSize && (
          <div className="flex items-center justify-between gap-2 p-3 border-t flex-wrap">
            <p className="text-sm text-muted-foreground" data-testid="text-page-info">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                data-testid="button-page-prev"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
                data-testid="button-page-next"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ContactFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {}}
      />

      {showEditDialog && editingContact && !selectedContact && (
        <ContactFormDialog
          open={showEditDialog}
          onOpenChange={(v) => {
            setShowEditDialog(v);
            if (!v) setEditingContact(null);
          }}
          contact={editingContact}
          onSuccess={() => setEditingContact(null)}
        />
      )}

      <CSVUploadDialog open={showCSVDialog} onOpenChange={setShowCSVDialog} />
      <CaseImportDialog open={showCaseImport} onOpenChange={setShowCaseImport} />
    </div>
  );
}
