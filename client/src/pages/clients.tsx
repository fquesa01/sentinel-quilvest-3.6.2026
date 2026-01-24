import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Building2,
  Plus,
  Search,
  LayoutGrid,
  LayoutList,
  Mail,
  Phone,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  Briefcase,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type Client = {
  id: string;
  companyName: string;
  clientType: string;
  industrySector: string | null;
  referredBy: string | null;
  retainerDate: string | null;
  retainerDocumentUrl: string | null;
  billingRate: string | null;
  feeArrangement: string | null;
  paymentTerms: string | null;
  retainerBalance: string | null;
  outstandingInvoices: string | null;
  lifetimeBilling: string | null;
  primaryAttorneyId: string | null;
  leadParalegalId: string | null;
  emailProvider: string | null;
  emailSearchDomain: string | null;
  lastContactDate: string | null;
  nextFollowUp: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ClientContact = {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  contactRole: string;
  title: string | null;
  email: string | null;
  officePhone: string | null;
  cellPhone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  communicationPreference: string | null;
  isPrimaryContact: boolean;
};

type ClientWithDetails = Client & {
  contacts: ClientContact[];
  cases: Array<{
    caseId: string;
    caseNumber: string;
    title: string;
    status: string;
    role: string;
  }>;
  primaryAttorney?: { id: string; firstName: string | null; lastName: string | null };
  leadParalegal?: { id: string; firstName: string | null; lastName: string | null };
};

const createClientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  clientType: z.string().default("corporation"),
  industrySector: z.string().optional(),
  referredBy: z.string().optional(),
  retainerDate: z.string().optional(),
  billingRate: z.string().optional(),
  feeArrangement: z.string().optional(),
  paymentTerms: z.string().optional(),
  emailProvider: z.string().default("gmail"),
  emailSearchDomain: z.string().optional(),
  notes: z.string().optional(),
});

const createContactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  contactRole: z.string().default("client"),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  officePhone: z.string().optional(),
  cellPhone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  communicationPreference: z.string().default("email"),
  isPrimaryContact: z.boolean().default(false),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;
type CreateContactFormData = z.infer<typeof createContactSchema>;

const clientTypeLabels: Record<string, string> = {
  individual: "Individual",
  corporation: "Corporation",
  llc: "LLC",
  partnership: "Partnership",
  government_entity: "Government Entity",
  nonprofit: "Nonprofit",
  trust: "Trust",
  estate: "Estate",
  other: "Other",
};

const contactRoleLabels: Record<string, string> = {
  client: "Client",
  representative: "Representative",
  general_counsel: "General Counsel",
  in_house_counsel: "In-House Counsel",
  cfo: "CFO",
  ceo: "CEO",
  other_executive: "Other Executive",
  assistant: "Assistant",
  other: "Other",
};

const commPrefLabels: Record<string, string> = {
  email: "Email",
  phone_call: "Phone Call",
  text: "Text",
  any: "Any",
};

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "tiles">("table");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      companyName: "",
      clientType: "corporation",
      industrySector: "",
      referredBy: "",
      retainerDate: "",
      billingRate: "",
      feeArrangement: "",
      paymentTerms: "",
      emailProvider: "gmail",
      emailSearchDomain: "",
      notes: "",
    },
  });

  const contactForm = useForm<CreateContactFormData>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      contactRole: "client",
      title: "",
      email: "",
      officePhone: "",
      cellPhone: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      communicationPreference: "email",
      isPrimaryContact: false,
    },
  });

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
  });

  const { data: clientDetails, isLoading: detailsLoading } = useQuery<ClientWithDetails>({
    queryKey: ["/api/clients", selectedClient?.id, "details"],
    queryFn: async () => {
      if (!selectedClient?.id) return null;
      const response = await fetch(`/api/clients/${selectedClient.id}`);
      if (!response.ok) throw new Error("Failed to fetch client details");
      return response.json();
    },
    enabled: !!selectedClient?.id && detailSheetOpen,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: CreateClientFormData) => {
      const response = await apiRequest("POST", "/api/clients", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Created",
        description: "New client has been added successfully",
      });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: CreateContactFormData) => {
      const response = await apiRequest("POST", `/api/clients/${selectedClient?.id}/contacts`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", selectedClient?.id, "details"] });
      toast({
        title: "Contact Added",
        description: "New contact has been added to the client",
      });
      setAddContactDialogOpen(false);
      contactForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Deleted",
        description: "Client has been removed",
      });
      setDetailSheetOpen(false);
      setSelectedClient(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  const openClientDetail = (client: Client) => {
    setSelectedClient(client as ClientWithDetails);
    setDetailSheetOpen(true);
  };

  const getEmailSearchUrl = (client: Client | ClientWithDetails) => {
    const searchDomain = client.emailSearchDomain || client.companyName.toLowerCase().replace(/\s+/g, "");
    if (client.emailProvider === "outlook") {
      return `https://outlook.office365.com/mail/search/from:${searchDomain}`;
    }
    return `https://mail.google.com/mail/u/0/#search/from:${searchDomain}`;
  };

  const filteredClients = clients || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="clients-page-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="clients-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Building2 className="h-6 w-6" />
            Clients
          </h1>
          <p className="text-muted-foreground">Manage your firm's clients and contacts</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-client">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "tiles")}>
          <TabsList>
            <TabsTrigger value="table" data-testid="button-view-table">
              <LayoutList className="h-4 w-4 mr-2" />
              Table
            </TabsTrigger>
            <TabsTrigger value="tiles" data-testid="button-view-tiles">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Tiles
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold" data-testid="text-no-clients">No Clients</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "No clients match your search criteria"
                : "Get started by adding your first client"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-first-client">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Retainer Date</TableHead>
                <TableHead>Billing Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => openClientDetail(client)}
                  data-testid={`row-client-${client.id}`}
                >
                  <TableCell className="font-medium" data-testid={`text-company-${client.id}`}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {client.companyName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {client.companyName}
                    </div>
                  </TableCell>
                  <TableCell>{clientTypeLabels[client.clientType] || client.clientType}</TableCell>
                  <TableCell>{client.industrySector || "-"}</TableCell>
                  <TableCell>
                    {client.retainerDate
                      ? format(new Date(client.retainerDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {client.billingRate ? `$${parseFloat(client.billingRate).toFixed(2)}/hr` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "secondary"}>
                      {client.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${client.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openClientDetail(client); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={getEmailSearchUrl(client)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <Mail className="h-4 w-4 mr-2" />
                            Search Emails
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover-elevate"
              onClick={() => openClientDetail(client)}
              data-testid={`card-client-${client.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {client.companyName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-company-tile-${client.id}`}>
                        {client.companyName}
                      </CardTitle>
                      <CardDescription>
                        {clientTypeLabels[client.clientType] || client.clientType}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={client.isActive ? "default" : "secondary"}>
                    {client.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.industrySector && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {client.industrySector}
                  </div>
                )}
                {client.retainerDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Retainer: {format(new Date(client.retainerDate), "MMM d, yyyy")}
                  </div>
                )}
                {client.billingRate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    ${parseFloat(client.billingRate).toFixed(2)}/hr
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-email-${client.id}`}
                >
                  <a href={getEmailSearchUrl(client)} target="_blank" rel="noopener noreferrer">
                    <Mail className="h-4 w-4 mr-1" />
                    Emails
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openClientDetail(client); }}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Enter the client's information to add them to your firm's roster.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createClientMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} data-testid="input-company-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-client-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(clientTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industrySector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry/Sector</FormLabel>
                      <FormControl>
                        <Input placeholder="Technology" {...field} data-testid="input-industry" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referred By</FormLabel>
                      <FormControl>
                        <Input placeholder="Referral source" {...field} data-testid="input-referred-by" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="retainerDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retainer Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-retainer-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Rate ($/hr)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="350.00" {...field} data-testid="input-billing-rate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feeArrangement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Arrangement</FormLabel>
                      <FormControl>
                        <Input placeholder="Hourly, Contingency, Flat Fee" {...field} data-testid="input-fee-arrangement" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input placeholder="Net 30" {...field} data-testid="input-payment-terms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-email-provider">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailSearchDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Search Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="acme.com" {...field} data-testid="input-email-domain" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about the client..." {...field} data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending} data-testid="button-submit-client">
                  {createClientMutation.isPending ? "Creating..." : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {selectedClient?.companyName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span data-testid="text-client-detail-name">{selectedClient?.companyName}</span>
                <Badge className="ml-2" variant={selectedClient?.isActive ? "default" : "secondary"}>
                  {selectedClient?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </SheetTitle>
            <SheetDescription>
              {selectedClient && clientTypeLabels[selectedClient.clientType]}
              {selectedClient?.industrySector && ` • ${selectedClient.industrySector}`}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild data-testid="button-search-emails">
                <a href={selectedClient ? getEmailSearchUrl(selectedClient) : "#"} target="_blank" rel="noopener noreferrer">
                  <Mail className="h-4 w-4 mr-2" />
                  Search All Emails
                </a>
              </Button>
              {selectedClient?.retainerDocumentUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={selectedClient.retainerDocumentUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="h-4 w-4 mr-2" />
                    View Retainer
                  </a>
                </Button>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Financial Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Billing Rate:</span>
                  <p className="font-medium">
                    {selectedClient?.billingRate ? `$${parseFloat(selectedClient.billingRate).toFixed(2)}/hr` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fee Arrangement:</span>
                  <p className="font-medium">{selectedClient?.feeArrangement || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Terms:</span>
                  <p className="font-medium">{selectedClient?.paymentTerms || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retainer Balance:</span>
                  <p className="font-medium">
                    {selectedClient?.retainerBalance ? `$${parseFloat(selectedClient.retainerBalance).toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Outstanding Invoices:</span>
                  <p className="font-medium">
                    {selectedClient?.outstandingInvoices ? `$${parseFloat(selectedClient.outstandingInvoices).toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lifetime Billing:</span>
                  <p className="font-medium">
                    {selectedClient?.lifetimeBilling ? `$${parseFloat(selectedClient.lifetimeBilling).toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Contacts</h3>
                <Button variant="outline" size="sm" onClick={() => setAddContactDialogOpen(true)} data-testid="button-add-contact">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
              {detailsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : clientDetails?.contacts && clientDetails.contacts.length > 0 ? (
                <div className="space-y-3">
                  {clientDetails.contacts.map((contact) => (
                    <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {contact.firstName[0]}{contact.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {contact.firstName} {contact.lastName}
                                {contact.isPrimaryContact && (
                                  <Badge variant="secondary" className="ml-2">Primary</Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {contactRoleLabels[contact.contactRole] || contact.contactRole}
                                {contact.title && ` • ${contact.title}`}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {commPrefLabels[contact.communicationPreference || "email"]}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                {contact.email}
                              </a>
                            </div>
                          )}
                          {contact.cellPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${contact.cellPhone}`}>{contact.cellPhone}</a>
                            </div>
                          )}
                          {contact.officePhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{contact.officePhone} (Office)</span>
                            </div>
                          )}
                          {(contact.address1 || contact.city) && (
                            <div className="flex items-center gap-2 col-span-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {[contact.address1, contact.address2, contact.city, contact.state, contact.zipCode]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No contacts added yet.</p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Cases</h3>
              {detailsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : clientDetails?.cases && clientDetails.cases.length > 0 ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Open Cases ({clientDetails.cases.filter(c => c.status !== "closed").length})
                    </p>
                    {clientDetails.cases.filter(c => c.status !== "closed").map((caseItem) => (
                      <Link key={caseItem.caseId} href={`/cases/${caseItem.caseId}`}>
                        <Card className="mb-2 cursor-pointer hover-elevate" data-testid={`link-case-${caseItem.caseId}`}>
                          <CardContent className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{caseItem.caseNumber}</p>
                              <p className="text-sm text-muted-foreground">{caseItem.title}</p>
                            </div>
                            <Badge>{caseItem.status}</Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                  {clientDetails.cases.filter(c => c.status === "closed").length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 mt-4">
                        Closed Cases ({clientDetails.cases.filter(c => c.status === "closed").length})
                      </p>
                      {clientDetails.cases.filter(c => c.status === "closed").map((caseItem) => (
                        <Link key={caseItem.caseId} href={`/cases/${caseItem.caseId}`}>
                          <Card className="mb-2 cursor-pointer hover-elevate opacity-70" data-testid={`link-closed-case-${caseItem.caseId}`}>
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{caseItem.caseNumber}</p>
                                <p className="text-sm text-muted-foreground">{caseItem.title}</p>
                              </div>
                              <Badge variant="secondary">{caseItem.status}</Badge>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No cases linked to this client.</p>
              )}
            </div>

            {selectedClient?.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              </>
            )}

            {user?.role === "admin" && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => selectedClient && deleteClientMutation.mutate(selectedClient.id)}
                    disabled={deleteClientMutation.isPending}
                    data-testid="button-delete-client"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleteClientMutation.isPending ? "Deleting..." : "Delete Client"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new contact for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>
          <Form {...contactForm}>
            <form onSubmit={contactForm.handleSubmit((data) => createContactMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-contact-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} data-testid="input-contact-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="contactRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(contactRoleLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Chief Executive Officer" {...field} data-testid="input-contact-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} data-testid="input-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="cellPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cell Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} data-testid="input-contact-cell" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="officePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Office Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 987-6543" {...field} data-testid="input-contact-office" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="communicationPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Contact Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-contact-preference">
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(commPrefLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="address1"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} data-testid="input-contact-address1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="address2"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address Line 2</FormLabel>
                      <FormControl>
                        <Input placeholder="Suite 100" {...field} data-testid="input-contact-address2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} data-testid="input-contact-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} data-testid="input-contact-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} data-testid="input-contact-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contactForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} data-testid="input-contact-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddContactDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createContactMutation.isPending} data-testid="button-submit-contact">
                  {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
