import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import {
  Search,
  ArrowLeft,
  Shield,
  MapPin,
  Calendar,
  Globe,
  Award,
  CheckCircle2,
  Clock,
  X,
  Plus,
  Mail,
  Copy,
  FileText,
  XCircle,
  Loader2,
  Link2,
  Wifi,
  WifiOff,
  CircleDot,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RonNotary, RonSession, RonNotaryDocument, RonNotaryInvitation } from "@shared/schema";

const stateOptions = ["FL", "TX", "VA", "CA", "NY", "AZ", "CO", "GA", "IL", "NJ", "OH", "PA"];
const languageOptions = ["English", "Spanish", "French", "Portuguese", "Mandarin", "Korean", "Japanese", "Vietnamese", "Arabic", "Russian", "German"];

const DOC_TYPE_LABELS: Record<string, string> = {
  commission_cert: "Commission Certificate",
  bond_cert: "Surety Bond",
  eo_insurance_cert: "E&O Insurance",
  training_cert: "Training Certificate",
  background_check: "Background Check",
  seal_image: "Seal Image",
  signature_image: "Signature Image",
  other: "Other",
};

export default function RonNotaries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [selectedNotary, setSelectedNotary] = useState<RonNotary | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<RonNotaryDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    commissionState: "",
    commissionNumber: "",
    commissionExpiration: "",
    languages: ["English"],
    notarizationType: "both",
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");

  const { data: notaries, isLoading } = useQuery<RonNotary[]>({
    queryKey: ["/api/ron/notaries"],
  });

  const { data: notaryDetail } = useQuery<RonNotary & { recentSessions?: RonSession[] }>({
    queryKey: ["/api/ron/notaries", selectedNotary?.id],
    enabled: !!selectedNotary,
  });

  const { data: notaryDocs } = useQuery<RonNotaryDocument[]>({
    queryKey: ["/api/ron/notaries", selectedNotary?.id, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/ron/notaries/${selectedNotary!.id}/documents`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedNotary,
  });

  const { data: invitations } = useQuery<RonNotaryInvitation[]>({
    queryKey: ["/api/ron/notary-invitations"],
  });

  const notarySessions = notaryDetail?.recentSessions ?? [];

  const addNotaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ron/notaries", {
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        email: addForm.email,
        phone: addForm.phone || null,
        commissionState: addForm.commissionState,
        commissionNumber: addForm.commissionNumber || null,
        commissionExpiration: addForm.commissionExpiration || null,
        languages: addForm.languages,
        status: "pending_onboarding",
        metadata: { notarizationType: addForm.notarizationType },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/notaries"] });
      setAddDialogOpen(false);
      setAddForm({ firstName: "", lastName: "", email: "", phone: "", commissionState: "", commissionNumber: "", commissionExpiration: "", languages: ["English"], notarizationType: "both" });
      toast({ title: "Notary Added", description: "New notary has been added to the directory." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ron/notary-invitations", { email: inviteEmail });
      return res.json();
    },
    onSuccess: (data: RonNotaryInvitation) => {
      const link = `${window.location.origin}/notary/onboard/${data.token}`;
      setGeneratedLink(link);
      queryClient.invalidateQueries({ queryKey: ["/api/ron/notary-invitations"] });
      toast({ title: "Invitation Created", description: "Share the link with the notary." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ docId, status, reason }: { docId: string; status: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/ron/notary-documents/${docId}/verify`, {
        status,
        rejectionReason: reason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ron/notaries", selectedNotary?.id, "documents"] });
      setVerifyDialogOpen(false);
      setSelectedDoc(null);
      setRejectionReason("");
      toast({ title: "Document Updated", description: "Document verification status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filtered = notaries?.filter((n) => {
    const matchesSearch =
      !searchTerm ||
      `${n.firstName} ${n.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.commissionNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || n.commissionState === stateFilter;

    const notaryLangs = Array.isArray(n.languages) ? (n.languages as string[]).map(l => l.toLowerCase()) : [];
    const matchesLanguage = languageFilter === "all" || notaryLangs.includes(languageFilter.toLowerCase());

    const isExpired = n.commissionExpiration && new Date(n.commissionExpiration) < new Date();
    const isActive = n.status === "active" && !isExpired;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && isActive) ||
      (availabilityFilter === "unavailable" && !isActive);

    return matchesSearch && matchesState && matchesLanguage && matchesAvailability;
  });

  const hasActiveFilters = stateFilter !== "all" || languageFilter !== "all" || availabilityFilter !== "all";

  const clearFilters = () => {
    setStateFilter("all");
    setLanguageFilter("all");
    setAvailabilityFilter("all");
    setSearchTerm("");
  };

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending" && new Date(inv.expiresAt) > new Date()) || [];

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Link copied to clipboard." });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-notaries-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/ron/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-notaries-title">
              Notary Directory
            </h1>
            <p className="text-muted-foreground">
              {filtered?.length ?? 0} notaries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setInviteDialogOpen(true)} data-testid="button-invite-notary">
            <Mail className="h-4 w-4 mr-2" />
            Invite Notary
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-notary">
            <Plus className="h-4 w-4 mr-2" />
            Add Notary
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, commission..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-notaries"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-state-filter">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {stateOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-language-filter">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languageOptions.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-availability-filter">
            <SelectValue placeholder="All Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-notary-filters">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 p-2 rounded border border-border text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {format(new Date(inv.expiresAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">Pending</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyLink(`${window.location.origin}/notary/onboard/${inv.token}`)}
                    data-testid={`button-copy-invite-${inv.id}`}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((notary) => {
            const isExpired = notary.commissionExpiration && new Date(notary.commissionExpiration) < new Date();
            const isActive = notary.status === "active" && !isExpired;
            return (
              <Card
                key={notary.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setSelectedNotary(notary)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium" data-testid={`notary-name-${notary.id}`}>
                        {notary.firstName} {notary.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {notary.commissionState}
                        </span>
                        {notary.commissionNumber && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> #{notary.commissionNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                      {(() => {
                        const avail = (notary as any).availabilityStatus || "offline";
                        const AvailIcon = avail === "available" ? Wifi : avail === "busy" ? CircleDot : WifiOff;
                        const availColor = avail === "available" ? "text-green-500" : avail === "busy" ? "text-yellow-500" : "text-gray-400";
                        return <AvailIcon className={`h-3 w-3 ${availColor}`} />;
                      })()}
                      <Badge className={
                        isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }>
                        {isExpired ? "Expired" : notary.status || "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    {notary.commissionExpiration && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Exp: {format(new Date(notary.commissionExpiration), "MMM d, yyyy")}
                      </span>
                    )}
                    {notary.languages && Array.isArray(notary.languages) && (notary.languages as string[]).length > 0 && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {(notary.languages as string[]).join(", ")}
                      </span>
                    )}
                  </div>
                  {notary.totalSessions !== undefined && notary.totalSessions !== null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {notary.totalSessions} sessions completed
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No notaries found</p>
            <p className="text-sm mt-1">
              {searchTerm || hasActiveFilters
                ? "Try adjusting your filters"
                : "No notaries registered in the system"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notary Detail Dialog */}
      <Dialog open={!!selectedNotary} onOpenChange={() => setSelectedNotary(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notary Profile</DialogTitle>
          </DialogHeader>
          {selectedNotary && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {selectedNotary.firstName} {selectedNotary.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedNotary.commissionState} &middot; Commission #{selectedNotary.commissionNumber || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={
                    selectedNotary.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  }>
                    {selectedNotary.status || "Active"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Availability</p>
                  {(() => {
                    const avail = (selectedNotary as any).availabilityStatus || "offline";
                    const AvailIcon = avail === "available" ? Wifi : avail === "busy" ? CircleDot : WifiOff;
                    const availColor = avail === "available" ? "text-green-500" : avail === "busy" ? "text-yellow-500" : "text-gray-400";
                    const label = avail === "available" ? "Available" : avail === "busy" ? "Busy" : "Offline";
                    return (
                      <span className="flex items-center gap-1 font-medium">
                        <AvailIcon className={`h-3 w-3 ${availColor}`} /> {label}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground">Commission State</p>
                  <p className="font-medium">{selectedNotary.commissionState}</p>
                </div>
                {selectedNotary.commissionExpiration && (
                  <div>
                    <p className="text-muted-foreground">Commission Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.commissionExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.bondExpiration && (
                  <div>
                    <p className="text-muted-foreground">Bond Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.bondExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.eoInsuranceExpiration && (
                  <div>
                    <p className="text-muted-foreground">E&O Insurance Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedNotary.eoInsuranceExpiration), "MMM d, yyyy")}
                    </p>
                  </div>
                )}
                {selectedNotary.languages && Array.isArray(selectedNotary.languages) && (
                  <div>
                    <p className="text-muted-foreground">Languages</p>
                    <p className="font-medium">{(selectedNotary.languages as string[]).join(", ")}</p>
                  </div>
                )}
                {selectedNotary.email && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedNotary.email}</p>
                  </div>
                )}
                {selectedNotary.totalSessions !== undefined && selectedNotary.totalSessions !== null && (
                  <div>
                    <p className="text-muted-foreground">Total Sessions</p>
                    <p className="font-medium">{selectedNotary.totalSessions}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="font-medium text-sm mb-3">Credential Documents</p>
                {notaryDocs && notaryDocs.length > 0 ? (
                  <div className="space-y-2">
                    {notaryDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</p>
                            {doc.fileName && (
                              <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              doc.verificationStatus === "verified"
                                ? "border-green-500 text-green-700 dark:text-green-400"
                                : doc.verificationStatus === "rejected"
                                ? "border-red-500 text-red-700 dark:text-red-400"
                                : ""
                            }`}
                          >
                            {doc.verificationStatus === "verified" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {doc.verificationStatus === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                            {doc.verificationStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                            {doc.verificationStatus}
                          </Badge>
                          {doc.verificationStatus === "pending" && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => verifyDocMutation.mutate({ docId: doc.id, status: "verified" })}
                                data-testid={`button-verify-doc-${doc.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSelectedDoc(doc); setVerifyDialogOpen(true); }}
                                data-testid={`button-reject-doc-${doc.id}`}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="font-medium text-sm mb-3">Session History</p>
                {notarySessions.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {notarySessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border text-sm">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{session.sessionType?.replace(/_/g, " ")} Session</p>
                          <p className="text-xs text-muted-foreground">
                            {session.scheduledStart
                              ? format(new Date(session.scheduledStart), "MMM d, yyyy h:mm a")
                              : "No date"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {session.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {session.status === "scheduled" && <Clock className="h-3 w-3 mr-1" />}
                          {session.status?.replace(/_/g, " ") || "Unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No session history available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Notary Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Notary</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addNotaryMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  data-testid="input-add-first-name"
                />
              </div>
              <div>
                <Label className="text-xs">Last Name *</Label>
                <Input
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  data-testid="input-add-last-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  data-testid="input-add-email"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  data-testid="input-add-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Commission State *</Label>
                <Select value={addForm.commissionState} onValueChange={(v) => setAddForm({ ...addForm, commissionState: v })}>
                  <SelectTrigger data-testid="select-add-commission-state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Commission Number</Label>
                <Input
                  value={addForm.commissionNumber}
                  onChange={(e) => setAddForm({ ...addForm, commissionNumber: e.target.value })}
                  data-testid="input-add-commission-number"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Commission Expiration</Label>
              <Input
                type="date"
                value={addForm.commissionExpiration}
                onChange={(e) => setAddForm({ ...addForm, commissionExpiration: e.target.value })}
                data-testid="input-add-commission-expiration"
              />
            </div>
            <div>
              <Label className="text-xs">Notarization Type</Label>
              <Select value={addForm.notarizationType} onValueChange={(v) => setAddForm({ ...addForm, notarizationType: v })}>
                <SelectTrigger data-testid="select-add-notarization-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person Only</SelectItem>
                  <SelectItem value="virtual">Virtual/RON Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Languages</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {languageOptions.map((lang) => (
                  <Badge
                    key={lang}
                    className={`cursor-pointer toggle-elevate ${addForm.languages.includes(lang) ? "toggle-elevated bg-primary text-primary-foreground" : ""}`}
                    variant={addForm.languages.includes(lang) ? "default" : "outline"}
                    onClick={() => setAddForm(prev => ({
                      ...prev,
                      languages: prev.languages.includes(lang) ? prev.languages.filter(l => l !== lang) : [...prev.languages, lang],
                    }))}
                    data-testid={`badge-add-lang-${lang.toLowerCase()}`}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addNotaryMutation.isPending || !addForm.firstName || !addForm.lastName || !addForm.email || !addForm.commissionState}
                data-testid="button-submit-add-notary"
              >
                {addNotaryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Notary
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Notary Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => { setInviteDialogOpen(open); if (!open) { setInviteEmail(""); setGeneratedLink(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Notary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the notary's email address to generate a unique credential submission link. The link expires after 7 days.
            </p>
            <div>
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setGeneratedLink(""); }}
                placeholder="notary@example.com"
                data-testid="input-invite-email"
              />
            </div>
            {!generatedLink ? (
              <Button
                className="w-full"
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !inviteEmail}
                data-testid="button-generate-invite"
              >
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Generate Invitation Link
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded border border-border bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Invitation Link</p>
                  <p className="text-xs font-mono break-all" data-testid="text-generated-link">{generatedLink}</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyLink(generatedLink)}
                  data-testid="button-copy-generated-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={(open) => { setVerifyDialogOpen(open); if (!open) { setSelectedDoc(null); setRejectionReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rejecting: <span className="font-medium text-foreground">{DOC_TYPE_LABELS[selectedDoc.documentType] || selectedDoc.documentType}</span>
              </p>
              <div>
                <Label className="text-xs">Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  className="resize-none"
                  data-testid="input-rejection-reason"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => verifyDocMutation.mutate({ docId: selectedDoc.id, status: "rejected", reason: rejectionReason })}
                  disabled={verifyDocMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {verifyDocMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reject Document
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
