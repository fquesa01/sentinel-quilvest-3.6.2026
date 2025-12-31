import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, Plus, Search, ArrowLeft, Shield, Clock } from "lucide-react";
import { Link } from "wouter";
import type { GrcControl } from "@shared/schema";

const controlTypes = ["preventive", "detective", "corrective", "directive"];
const controlCategories = ["technical", "administrative", "physical", "managerial"];
const effectivenessOptions = ["not_tested", "ineffective", "partially_effective", "largely_effective", "fully_effective"];
const automationLevels = ["manual", "semi_automated", "fully_automated"];
const testingFrequencies = ["continuous", "daily", "weekly", "monthly", "quarterly", "annually"];

const effectivenessLabels: Record<string, string> = {
  not_tested: "Not Tested",
  ineffective: "Ineffective",
  partially_effective: "Partially Effective",
  largely_effective: "Largely Effective",
  fully_effective: "Fully Effective",
};

export default function GrcControls() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newControl, setNewControl] = useState({
    controlId: "",
    controlTitle: "",
    controlDescription: "",
    controlType: "preventive",
    controlCategory: "technical",
    automationLevel: "manual",
    controlOwner: "",
    testingFrequency: "quarterly",
    implementationStatus: "planned",
    effectiveness: "not_tested",
  });

  const { data: controls, isLoading } = useQuery<GrcControl[]>({
    queryKey: ["/api/grc/controls"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/grc/controls", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grc/controls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grc/dashboard"] });
      setIsCreateDialogOpen(false);
      setNewControl({
        controlId: "",
        controlTitle: "",
        controlDescription: "",
        controlType: "preventive",
        controlCategory: "technical",
        automationLevel: "manual",
        controlOwner: "",
        testingFrequency: "quarterly",
        implementationStatus: "planned",
        effectiveness: "not_tested",
      });
      toast({ title: "Control created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create control", variant: "destructive" });
    },
  });

  const filteredControls = controls?.filter((control) => {
    const matchesSearch =
      control.controlTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.controlDescription?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || control.effectiveness === statusFilter;
    const matchesType = typeFilter === "all" || control.controlType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getEffectivenessColor = (effectiveness: string) => {
    switch (effectiveness) {
      case "fully_effective":
      case "largely_effective":
        return "default";
      case "ineffective":
        return "destructive";
      case "partially_effective":
        return "secondary";
      case "not_tested":
      default:
        return "outline";
    }
  };

  const handleCreateControl = () => {
    createMutation.mutate(newControl);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/grc">
              <Button variant="ghost" size="icon" data-testid="button-back-grc">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="heading-controls">Controls Management</h1>
              <p className="text-muted-foreground text-sm">
                Design, implement, and monitor internal controls
              </p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-control">
                <Plus className="h-4 w-4 mr-2" />
                Add Control
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Control</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Control ID</Label>
                    <Input
                      value={newControl.controlId}
                      onChange={(e) => setNewControl({ ...newControl, controlId: e.target.value })}
                      placeholder="e.g., AC-001"
                      data-testid="input-control-id"
                    />
                  </div>
                  <div>
                    <Label>Control Name</Label>
                    <Input
                      value={newControl.controlTitle}
                      onChange={(e) => setNewControl({ ...newControl, controlTitle: e.target.value })}
                      placeholder="Enter control name"
                      data-testid="input-control-name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newControl.controlDescription}
                    onChange={(e) => setNewControl({ ...newControl, controlDescription: e.target.value })}
                    placeholder="Describe the control"
                    data-testid="input-control-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Control Type</Label>
                    <Select
                      value={newControl.controlType}
                      onValueChange={(v) => setNewControl({ ...newControl, controlType: v })}
                    >
                      <SelectTrigger data-testid="select-control-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {controlTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newControl.controlCategory}
                      onValueChange={(v) => setNewControl({ ...newControl, controlCategory: v })}
                    >
                      <SelectTrigger data-testid="select-control-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {controlCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Automation Level</Label>
                    <Select
                      value={newControl.automationLevel}
                      onValueChange={(v) => setNewControl({ ...newControl, automationLevel: v })}
                    >
                      <SelectTrigger data-testid="select-automation-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {automationLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Owner</Label>
                    <Input
                      value={newControl.controlOwner}
                      onChange={(e) => setNewControl({ ...newControl, controlOwner: e.target.value })}
                      placeholder="Control owner"
                      data-testid="input-control-owner"
                    />
                  </div>
                  <div>
                    <Label>Testing Frequency</Label>
                    <Select
                      value={newControl.testingFrequency}
                      onValueChange={(v) => setNewControl({ ...newControl, testingFrequency: v })}
                    >
                      <SelectTrigger data-testid="select-testing-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {testingFrequencies.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreateControl}
                  disabled={!newControl.controlTitle || !newControl.controlId || createMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-control"
                >
                  Create Control
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search controls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-controls"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Effectiveness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Effectiveness</SelectItem>
              {effectivenessOptions.map((eff) => (
                <SelectItem key={eff} value={eff}>
                  {effectivenessLabels[eff]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40" data-testid="select-type-filter">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {controlTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {filteredControls?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Controls Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Click 'Add Control' to create your first control"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredControls?.map((control) => (
              <Card key={control.id} className="hover-elevate" data-testid={`card-control-${control.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{control.controlId}</Badge>
                        <CardTitle className="text-lg">{control.controlTitle}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {control.controlDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getEffectivenessColor(control.effectiveness)}>
                        {control.effectiveness.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                      <Badge variant="outline">
                        {control.controlType.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm flex-wrap">
                    {control.automationLevel && (
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Automation:</span>{" "}
                        <span className="font-medium">
                          {control.automationLevel.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                    {control.testingFrequency && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Testing:</span>{" "}
                        <span className="font-medium">
                          {control.testingFrequency.replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                      </div>
                    )}
                    {control.controlOwner && (
                      <div>
                        <span className="text-muted-foreground">Owner:</span>{" "}
                        <span className="font-medium">{control.controlOwner}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
