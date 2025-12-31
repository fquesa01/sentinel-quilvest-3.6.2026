import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Mail, 
  Send, 
  Archive, 
  Star, 
  Trash2, 
  Search, 
  RefreshCw, 
  Plus, 
  Link2, 
  Inbox,
  FileText,
  AlertCircle,
  MoreHorizontal,
  Tag,
  Shield
} from "lucide-react";
import { SiGmail } from "react-icons/si";

type EmailAccount = {
  id: string;
  provider: string;
  email: string;
  displayName: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  syncError: string | null;
  createdAt: string;
};

type SyncedEmail = {
  id: string;
  accountId: string;
  externalId: string;
  threadId: string | null;
  conversationId: string | null;
  subject: string | null;
  snippet: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  fromAddress: string | null;
  fromName: string | null;
  toRecipients: { email: string; name: string }[];
  ccRecipients: { email: string; name: string }[];
  sentAt: string | null;
  receivedAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  folder: string;
  importance: string;
  matterId: string | null;
  privilegeStatus: string | null;
  stampApplied: boolean;
  createdAt: string;
};

type Case = {
  id: string;
  caseNumber: string;
  title: string;
};

type Folder = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

const folders: Folder[] = [
  { id: "inbox", name: "Inbox", icon: <Inbox className="h-4 w-4" /> },
  { id: "sent", name: "Sent", icon: <Send className="h-4 w-4" /> },
  { id: "drafts", name: "Drafts", icon: <FileText className="h-4 w-4" /> },
  { id: "starred", name: "Starred", icon: <Star className="h-4 w-4" /> },
  { id: "archive", name: "Archive", icon: <Archive className="h-4 w-4" /> },
  { id: "trash", name: "Trash", icon: <Trash2 className="h-4 w-4" /> },
];

export default function EmailIntegrationPage() {
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<EmailAccount[]>({
    queryKey: ["/api/email/accounts"],
  });

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const emailsQueryKey = ["/api/email/accounts", selectedAccountId, "messages", selectedFolder] as const;
  
  const { data: emails = [], isLoading: emailsLoading } = useQuery<SyncedEmail[]>({
    queryKey: emailsQueryKey,
    queryFn: async () => {
      if (!selectedAccountId) return [];
      const res = await fetch(`/api/email/accounts/${selectedAccountId}/messages?folder=${selectedFolder}`);
      if (!res.ok) throw new Error("Failed to fetch emails");
      return res.json();
    },
    enabled: !!selectedAccountId,
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const syncMutation = useMutation({
    mutationFn: async ({ accountId, fullSync }: { accountId: string; fullSync?: boolean }) => {
      return apiRequest(`/api/email/accounts/${accountId}/sync`, "POST", { fullSync });
    },
    onSuccess: () => {
      toast({ title: "Sync started", description: "Emails are being synced in the background." });
      queryClient.invalidateQueries({ queryKey: emailsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/email/accounts"] });
    },
    onError: (error: any) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ emailId, isStarred }: { emailId: string; isStarred: boolean }) => {
      return apiRequest(`/api/email/messages/${emailId}/star`, "PATCH", { isStarred });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailsQueryKey });
    },
  });

  const tagMutation = useMutation({
    mutationFn: async ({ emailId, matterId, privilegeStatus }: { emailId: string; matterId: string | null; privilegeStatus?: string }) => {
      return apiRequest(`/api/email/messages/${emailId}/matter`, "PATCH", { matterId, privilegeStatus });
    },
    onSuccess: () => {
      toast({ title: "Email tagged", description: "Matter association updated." });
      queryClient.invalidateQueries({ queryKey: emailsQueryKey });
      setIsTagDialogOpen(false);
    },
  });

  const getProviderIcon = (provider: string) => {
    if (provider === "microsoft") return (
      <svg className="h-4 w-4" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
        <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
        <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
        <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
      </svg>
    );
    if (provider === "google") return <SiGmail className="h-4 w-4 text-[#ea4335]" />;
    return <Mail className="h-4 w-4" />;
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const getPrivilegeBadge = (status: string | null) => {
    if (!status) return null;
    const colors: Record<string, string> = {
      attorney_client: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      work_product: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      standard: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return (
      <Badge className={colors[status] || colors.standard}>
        <Shield className="h-3 w-3 mr-1" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="flex h-full bg-background">
      <div className="w-56 border-r flex flex-col">
        <div className="p-4">
          <Button className="w-full gap-2" data-testid="button-compose-email">
            <Plus className="h-4 w-4" />
            Compose
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 py-1">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2 mb-1"
                onClick={() => setSelectedFolder(folder.id)}
                data-testid={`button-email-folder-${folder.id}`}
              >
                {folder.icon}
                {folder.name}
              </Button>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">Email Accounts</h4>
              <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6" data-testid="button-add-email-account">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Connect Email Account</DialogTitle>
                    <DialogDescription>
                      Connect your email account to sync messages and send emails directly from Sentinel Counsel.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={() => {
                        setIsConnectOpen(false);
                        const returnUrl = encodeURIComponent("/email-integration");
                        window.location.href = `/api/email/oauth/microsoft?returnUrl=${returnUrl}`;
                      }}
                      data-testid="button-oauth-microsoft"
                    >
                      <svg className="h-6 w-6" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                        <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                        <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                        <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                      </svg>
                      <div className="text-left">
                        <div className="font-medium">Microsoft 365</div>
                        <div className="text-xs text-muted-foreground">Outlook, Exchange Online</div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={() => {
                        setIsConnectOpen(false);
                        const returnUrl = encodeURIComponent("/email-integration");
                        window.location.href = `/api/email/oauth/google?returnUrl=${returnUrl}`;
                      }}
                      data-testid="button-oauth-google"
                    >
                      <SiGmail className="h-6 w-6 text-[#ea4335]" />
                      <div className="text-left">
                        <div className="font-medium">Google</div>
                        <div className="text-xs text-muted-foreground">Gmail, Google Workspace</div>
                      </div>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {accountsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-4">
                <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No accounts connected</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConnectOpen(true)}
                  data-testid="button-connect-first-account"
                >
                  Connect your first account
                </Button>
              </div>
            ) : (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                    selectedAccountId === account.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedAccountId(account.id)}
                  data-testid={`email-account-${account.id}`}
                >
                  {getProviderIcon(account.provider)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{account.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {account.syncStatus === "syncing" ? "Syncing..." : 
                        account.lastSyncAt ? `Synced ${formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true })}` : "Never synced"}
                    </div>
                  </div>
                  {account.syncStatus === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-emails"
            />
          </div>
          {selectedAccountId && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => syncMutation.mutate({ accountId: selectedAccountId })}
              disabled={syncMutation.isPending}
              data-testid="button-sync-emails"
            >
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {emailsLoading ? (
            <div className="p-2 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 rounded-lg border">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {selectedAccountId ? "No emails in this folder" : "Select an account to view emails"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {emails.filter(email => 
                !searchQuery || 
                email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                email.fromName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                email.fromAddress?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((email) => (
                <div
                  key={email.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEmailId === email.id ? "bg-accent border-accent-foreground/20" : 
                    !email.isRead ? "bg-accent/50" : "hover:bg-accent/30"
                  }`}
                  onClick={() => setSelectedEmailId(email.id)}
                  data-testid={`synced-email-${email.id}`}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs">
                        {getInitials(email.fromName, email.fromAddress)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!email.isRead ? "font-semibold" : ""}`}>
                          {email.fromName || email.fromAddress || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {email.receivedAt ? formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true }) : ""}
                        </span>
                      </div>
                      <div className={`text-sm truncate ${!email.isRead ? "font-medium" : "text-muted-foreground"}`}>
                        {email.subject || "(no subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {email.snippet}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {email.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        {email.matterId && <Link2 className="h-3 w-3 text-primary" />}
                        {email.privilegeStatus && (
                          <Shield className="h-3 w-3 text-purple-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedEmail ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="h-16 w-16 mb-4" />
            <p className="text-lg">Select an email to view</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold mb-2" data-testid="synced-email-subject">
                    {selectedEmail.subject || "(no subject)"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(selectedEmail.fromName, selectedEmail.fromAddress)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {selectedEmail.fromName || selectedEmail.fromAddress}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        to {selectedEmail.toRecipients?.map(r => r.name || r.email).join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedEmail.receivedAt ? format(new Date(selectedEmail.receivedAt), "PPpp") : ""}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => starMutation.mutate({ 
                      emailId: selectedEmail.id, 
                      isStarred: !selectedEmail.isStarred 
                    })}
                    data-testid="button-star-synced-email"
                  >
                    <Star className={`h-4 w-4 ${selectedEmail.isStarred ? "text-yellow-500 fill-yellow-500" : ""}`} />
                  </Button>
                  <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid="button-tag-synced-email">
                        <Tag className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tag Email</DialogTitle>
                        <DialogDescription>
                          Associate this email with a matter and set privilege status.
                        </DialogDescription>
                      </DialogHeader>
                      <TagEmailForm
                        email={selectedEmail}
                        cases={cases}
                        onSubmit={(matterId, privilegeStatus) => 
                          tagMutation.mutate({ emailId: selectedEmail.id, matterId, privilegeStatus })
                        }
                        isPending={tagMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button size="icon" variant="ghost" data-testid="button-more-email-options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {(selectedEmail.matterId || selectedEmail.privilegeStatus) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  {selectedEmail.matterId && (
                    <Badge variant="outline" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Matter: {cases.find(c => c.id === selectedEmail.matterId)?.caseNumber || selectedEmail.matterId}
                    </Badge>
                  )}
                  {getPrivilegeBadge(selectedEmail.privilegeStatus)}
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 p-6">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: selectedEmail.bodyHtml || selectedEmail.bodyText?.replace(/\n/g, "<br>") || "" 
                }}
                data-testid="synced-email-body"
              />
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2" data-testid="button-reply-email">
                  Reply
                </Button>
                <Button variant="outline" className="gap-2" data-testid="button-reply-all-email">
                  Reply All
                </Button>
                <Button variant="outline" className="gap-2" data-testid="button-forward-email">
                  Forward
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TagEmailForm({ 
  email, 
  cases, 
  onSubmit,
  isPending
}: { 
  email: SyncedEmail; 
  cases: Case[]; 
  onSubmit: (matterId: string | null, privilegeStatus?: string) => void;
  isPending: boolean;
}) {
  const [matterId, setMatterId] = useState<string>(email.matterId || "");
  const [privilegeStatus, setPrivilegeStatus] = useState<string>(email.privilegeStatus || "");

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Associated Matter</label>
        <Select value={matterId} onValueChange={setMatterId}>
          <SelectTrigger data-testid="select-email-matter">
            <SelectValue placeholder="Select a matter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Privilege Status</label>
        <Select value={privilegeStatus} onValueChange={setPrivilegeStatus}>
          <SelectTrigger data-testid="select-email-privilege">
            <SelectValue placeholder="Select privilege status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None</SelectItem>
            <SelectItem value="attorney_client">Attorney-Client Privilege</SelectItem>
            <SelectItem value="work_product">Work Product</SelectItem>
            <SelectItem value="standard">Standard Confidential</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        className="w-full" 
        onClick={() => onSubmit(matterId || null, privilegeStatus || undefined)}
        disabled={isPending}
        data-testid="button-save-email-tags"
      >
        {isPending ? "Saving..." : "Save Tags"}
      </Button>
    </div>
  );
}
