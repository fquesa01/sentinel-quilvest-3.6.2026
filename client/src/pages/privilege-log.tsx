import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  FileText,
  Trash2,
  Edit2,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PrivilegeLog = {
  id: string;
  caseId?: string;
  batesNumber?: string;
  documentType: string;
  documentId: string;
  documentDate: string;
  documentDescription: string;
  author: string;
  recipients?: string[];
  privilegeType: string;
  privilegeBasis: string;
  privilegeAssertion: string;
  isCounselDirected: string;
  isPartiallyPrivileged: string;
  redactionApplied: string;
  assertedBy: string;
  assertedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  exportedForLitigation: string;
  exportedAt?: string;
  notes?: string;
};

const privilegeTypeLabels: Record<string, string> = {
  attorney_client_privileged: "Attorney-Client Privileged",
  work_product: "Work Product",
  both: "Both Protections",
};

const privilegeBasisLabels: Record<string, string> = {
  upjohn_warning: "Upjohn Warning",
  in_re_kbr: "In re KBR Doctrine",
  attorney_work_product: "Attorney Work Product",
  counsel_directed_investigation: "Counsel-Directed Investigation",
  legal_advice_sought: "Legal Advice Sought",
  litigation_preparation: "Litigation Preparation",
};

export default function PrivilegeLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    documentType: "",
    documentId: "",
    documentDate: "",
    documentDescription: "",
    author: "",
    privilegeType: "attorney_client_privileged",
    privilegeBasis: "counsel_directed_investigation",
    privilegeAssertion: "",
  });
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery<PrivilegeLog[]>({
    queryKey: ["/api/privilege-logs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/privilege-logs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privilege-logs"] });
      toast({
        title: "Privilege Log Entry Created",
        description: "The privilege log entry has been added successfully.",
      });
      setCreateDialogOpen(false);
      setFormData({
        documentType: "",
        documentId: "",
        documentDate: "",
        documentDescription: "",
        author: "",
        privilegeType: "attorney_client_privileged",
        privilegeBasis: "counsel_directed_investigation",
        privilegeAssertion: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create privilege log entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/privilege-logs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/privilege-logs"] });
      toast({
        title: "Entry Deleted",
        description: "The privilege log entry has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete privilege log entry",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = () => {
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this privilege log entry?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportLog = () => {
    const csv = generateCSV(filteredLogs);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `privilege-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSV = (data: PrivilegeLog[]) => {
    const headers = [
      "Bates Number",
      "Document Type",
      "Document Date",
      "Description",
      "Author",
      "Recipients",
      "Privilege Type",
      "Privilege Basis",
      "Assertion",
    ];
    const rows = data.map((log) => [
      log.batesNumber || "",
      log.documentType,
      format(new Date(log.documentDate), "MM/dd/yyyy"),
      log.documentDescription,
      log.author,
      Array.isArray(log.recipients) ? log.recipients.join("; ") : "",
      privilegeTypeLabels[log.privilegeType] || log.privilegeType,
      privilegeBasisLabels[log.privilegeBasis] || log.privilegeBasis,
      log.privilegeAssertion,
    ]);

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  };

  const filteredLogs =
    logs?.filter(
      (log) =>
        log.documentDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.batesNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Privilege Log
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage privileged documents for eDiscovery production
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportLog} data-testid="button-export-log">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-entry">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, author, or Bates number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Badge variant="outline" className="text-base">
            {filteredLogs.length} Entries
          </Badge>
        </div>

        {!logs || logs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Privilege Log Entries</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your privilege log for eDiscovery production.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bates Number</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Privilege Type</TableHead>
                    <TableHead>Basis</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-mono text-sm">
                        {log.batesNumber || "—"}
                      </TableCell>
                      <TableCell className="capitalize">{log.documentType}</TableCell>
                      <TableCell>{format(new Date(log.documentDate), "MM/dd/yyyy")}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.documentDescription}
                      </TableCell>
                      <TableCell>{log.author}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {privilegeTypeLabels[log.privilegeType] || log.privilegeType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {privilegeBasisLabels[log.privilegeBasis] || log.privilegeBasis}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(log.id)}
                            data-testid={`button-delete-${log.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-create-entry">
          <DialogHeader>
            <DialogTitle>Add Privilege Log Entry</DialogTitle>
            <DialogDescription>
              Add a new privileged document to the eDiscovery privilege log
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Input
                  id="documentType"
                  placeholder="e.g., email, memo, report"
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  data-testid="input-document-type"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentId">Document ID</Label>
                <Input
                  id="documentId"
                  placeholder="Internal document identifier"
                  value={formData.documentId}
                  onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                  data-testid="input-document-id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentDate">Document Date</Label>
              <Input
                id="documentDate"
                type="date"
                value={formData.documentDate}
                onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                data-testid="input-document-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentDescription">Document Description</Label>
              <Textarea
                id="documentDescription"
                placeholder="Brief description for privilege log..."
                value={formData.documentDescription}
                onChange={(e) => setFormData({ ...formData, documentDescription: e.target.value })}
                rows={3}
                data-testid="textarea-document-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                placeholder="Document author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                data-testid="input-author"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="privilegeType">Privilege Type</Label>
                <Select
                  value={formData.privilegeType}
                  onValueChange={(value) => setFormData({ ...formData, privilegeType: value })}
                >
                  <SelectTrigger id="privilegeType" data-testid="select-privilege-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attorney_client_privileged">
                      Attorney-Client Privileged
                    </SelectItem>
                    <SelectItem value="work_product">Work Product</SelectItem>
                    <SelectItem value="both">Both Protections</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="privilegeBasis">Privilege Basis</Label>
                <Select
                  value={formData.privilegeBasis}
                  onValueChange={(value) => setFormData({ ...formData, privilegeBasis: value })}
                >
                  <SelectTrigger id="privilegeBasis" data-testid="select-privilege-basis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="counsel_directed_investigation">
                      Counsel-Directed Investigation
                    </SelectItem>
                    <SelectItem value="upjohn_warning">Upjohn Warning</SelectItem>
                    <SelectItem value="attorney_work_product">Attorney Work Product</SelectItem>
                    <SelectItem value="legal_advice_sought">Legal Advice Sought</SelectItem>
                    <SelectItem value="litigation_preparation">Litigation Preparation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="privilegeAssertion">Privilege Assertion</Label>
              <Textarea
                id="privilegeAssertion"
                placeholder="Detailed assertion explaining the basis for privilege..."
                value={formData.privilegeAssertion}
                onChange={(e) => setFormData({ ...formData, privilegeAssertion: e.target.value })}
                rows={4}
                data-testid="textarea-privilege-assertion"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
