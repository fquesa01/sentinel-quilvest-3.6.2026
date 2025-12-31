import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search, Mail, MessageSquare, Phone, Calendar, Filter, Download, Tag, Share2 } from "lucide-react";
import { format } from "date-fns";
import type { Communication, Employee, VendorContact } from "@shared/schema";

type PersonType = "employee" | "vendor";

export default function PersonToPersonCommunications() {
  const params = useParams<{ type: PersonType; personId: string; contactType: PersonType; contactId: string }>();
  const personType = params.type!;
  const personId = params.personId!;
  const contactType = params.contactType!;
  const contactId = params.contactId!;

  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "document">("list");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const { data: person } = useQuery<Employee | VendorContact>({
    queryKey: personType === "employee" ? ["/api/employees", personId] : ["/api/vendor-contacts", personId],
  });

  const { data: contact } = useQuery<Employee | VendorContact>({
    queryKey: contactType === "employee" ? ["/api/employees", contactId] : ["/api/vendor-contacts", contactId],
    enabled: !!contactId && !!contactType,
  });

  const { data: allCommunications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
  });

  const personName = person ? `${person.firstName} ${person.lastName}` : "Loading...";
  const contactName = contact ? `${contact.firstName} ${contact.lastName}` : "Loading...";

  const filteredCommunications = useMemo(() => {
    return allCommunications.filter((comm) => {
      const recipients = (comm.recipients as string[]) || [];
      const matchesPeople =
        (comm.sender === personName && recipients.includes(contactName)) ||
        (comm.sender === contactName && recipients.includes(personName));

      if (!matchesPeople) return false;

      if (methodFilter !== "all" && comm.communicationType !== methodFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          comm.subject?.toLowerCase().includes(query) ||
          comm.body?.toLowerCase().includes(query) ||
          comm.sender?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allCommunications, personName, contactName, methodFilter, searchQuery]);

  const selectedDoc = selectedDocId ? filteredCommunications.find((c) => c.id === selectedDocId) : null;

  const methods = useMemo(() => {
    const methodSet = new Set(allCommunications.map((c) => c.communicationType));
    return Array.from(methodSet).sort();
  }, [allCommunications]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCommunications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCommunications.map((c) => c.id)));
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case "email":
        return Mail;
      case "sms":
        return Phone;
      case "teams":
      case "slack":
      case "whatsapp":
        return MessageSquare;
      default:
        return MessageSquare;
    }
  };

  const getMethodBadgeVariant = (method: string) => {
    switch (method?.toLowerCase()) {
      case "email":
        return "default";
      case "sms":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getComplianceScoreColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-600 dark:text-green-500";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getRiskLevelBadgeVariant = (riskLevel: string | null) => {
    switch (riskLevel?.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/monitoring/profile/${personType}/${personId}`}>
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Communications Between
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="default">{personName}</Badge>
            <span className="text-muted-foreground">↔</span>
            <Badge variant="outline">{contactName}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {filteredCommunications.length} messages • {selectedIds.size} selected
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <TabsList>
                    <TabsTrigger value="list" data-testid="tab-list-view">
                      List View
                    </TabsTrigger>
                    <TabsTrigger value="document" data-testid="tab-document-view" disabled={!selectedDocId}>
                      Document View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" data-testid="button-tag">
                      <Tag className="w-4 h-4 mr-2" />
                      Tag ({selectedIds.size})
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-export">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" data-testid="button-share">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {viewMode === "list" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages by subject or body..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-48" data-testid="select-method-filter">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {methods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading communications...</div>
              ) : filteredCommunications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No communications found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredCommunications.length && filteredCommunications.length > 0}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Compliance</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommunications.map((comm) => {
                      const MethodIcon = getMethodIcon(comm.communicationType);
                      return (
                        <TableRow
                          key={comm.id}
                          className={selectedIds.has(comm.id) ? "bg-muted/50" : ""}
                          data-testid={`row-comm-${comm.id}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(comm.id)}
                              onCheckedChange={() => toggleSelection(comm.id)}
                              data-testid={`checkbox-${comm.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{format(new Date(comm.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant={getMethodBadgeVariant(comm.communicationType)}>
                              <MethodIcon className="w-3 h-3 mr-1" />
                              {comm.communicationType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{comm.sender}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {searchQuery ? highlightText(comm.subject || "No subject", searchQuery) : comm.subject || "No subject"}
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${getComplianceScoreColor(comm.complianceScore)}`}>
                              {comm.complianceScore || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {comm.riskLevel && (
                              <Badge variant={getRiskLevelBadgeVariant(comm.riskLevel)}>{comm.riskLevel}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDocId(comm.id);
                                setViewMode("document");
                              }}
                              data-testid={`button-view-${comm.id}`}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {viewMode === "document" && selectedDoc && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedDoc.subject || "No subject"}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getMethodBadgeVariant(selectedDoc.communicationType)}>
                        {selectedDoc.communicationType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(selectedDoc.timestamp), "MMMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode("list");
                      setSelectedDocId(null);
                    }}
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to List
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">From</p>
                    <p className="font-medium">{selectedDoc.sender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">To</p>
                    <p className="font-medium">{((selectedDoc.recipients as string[]) || []).join(", ") || "—"}</p>
                  </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap p-4 border rounded-lg bg-card" data-testid="document-body">
                    {searchQuery ? highlightText(selectedDoc.body || "No content", searchQuery) : selectedDoc.body || "No content"}
                  </div>
                </div>

                {selectedDoc.attachmentIds && selectedDoc.attachmentIds.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Attachments ({selectedDoc.attachmentIds.length})</h3>
                    <div className="space-y-2">
                      {selectedDoc.attachmentIds.map((attachmentId: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{attachmentId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compliance Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Compliance Score</span>
                    <span className={`text-2xl font-bold ${getComplianceScoreColor(selectedDoc.complianceScore)}`}>
                      {selectedDoc.complianceScore || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    {selectedDoc.riskLevel && (
                      <Badge variant={getRiskLevelBadgeVariant(selectedDoc.riskLevel)}>{selectedDoc.riskLevel}</Badge>
                    )}
                  </div>
                  {selectedDoc.aiComplianceAnalysis && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">AI Analysis</p>
                      <p className="text-sm">{selectedDoc.aiComplianceAnalysis}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Document Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-add-tag">
                    <Tag className="w-4 h-4 mr-2" />
                    Add Tags
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-export-doc">
                    <Download className="w-4 h-4 mr-2" />
                    Export Document
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="button-share-doc">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share with Investigators
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
