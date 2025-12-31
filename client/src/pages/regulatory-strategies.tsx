import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scale, CheckCircle2, XCircle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRegulatoryStrategySchema, type RegulatoryStrategy } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RegulatoryStrategies() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: strategies, isLoading } = useQuery<RegulatoryStrategy[]>({
    queryKey: ["/api/regulatory-strategies"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/regulatory-strategies", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-strategies"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Regulatory strategy created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/regulatory-strategies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulatory-strategies"] });
      toast({ title: "Success", description: "Regulatory strategy deleted" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertRegulatoryStrategySchema),
    defaultValues: {
      caseId: "",
      strategyType: "remediate_quiet",
      violationType: "fcpa_violation",
      regulatoryAgencies: [],
      selfDisclosureRecommendation: "pending_analysis",
      selfDisclosureRationale: "",
      riskAssessment: "",
      strategicRecommendations: "",
    },
  });

  const getRecommendationBadgeVariant = (rec: string) => {
    switch (rec) {
      case "recommend":
        return "default";
      case "do_not_recommend":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "recommend":
        return <CheckCircle2 className="h-4 w-4" />;
      case "do_not_recommend":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading regulatory strategies...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Regulatory Strategies</h1>
              <p className="text-sm text-muted-foreground">
                Decision tools for self-disclosure and regulatory engagement
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-strategy">
                <Plus className="h-4 w-4 mr-2" />
                Create Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Regulatory Strategy</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-case">
                              <SelectValue placeholder="Select case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cases?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strategyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-strategy-type">
                              <SelectValue placeholder="Select strategy type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="self_disclose">Self-Disclose</SelectItem>
                            <SelectItem value="remediate_quiet">Remediate Quietly</SelectItem>
                            <SelectItem value="monitor">Monitor</SelectItem>
                            <SelectItem value="escalate">Escalate</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="violationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Violation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-violation-type">
                              <SelectValue placeholder="Select violation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fcpa_violation">FCPA Violation</SelectItem>
                            <SelectItem value="antitrust">Antitrust</SelectItem>
                            <SelectItem value="off_channel_communication">Off-Channel Communication</SelectItem>
                            <SelectItem value="insider_trading">Insider Trading</SelectItem>
                            <SelectItem value="aml_banking">AML/Banking</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selfDisclosureRecommendation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Self-Disclosure Recommendation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-disclosure-recommendation">
                              <SelectValue placeholder="Select recommendation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="recommend">Recommend Self-Disclosure</SelectItem>
                            <SelectItem value="do_not_recommend">Do Not Recommend</SelectItem>
                            <SelectItem value="pending_analysis">Pending Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selfDisclosureRationale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Self-Disclosure Rationale</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Explain the rationale for self-disclosure decision..."
                            rows={3}
                            data-testid="textarea-rationale"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="riskAssessment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Assessment</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Assess regulatory, reputational, and financial risks..."
                            rows={3}
                            data-testid="textarea-risk-assessment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="strategicRecommendations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategic Recommendations</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Provide strategic recommendations for handling this matter..."
                            rows={3}
                            data-testid="textarea-recommendations"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-strategy">
                      {createMutation.isPending ? "Creating..." : "Create Strategy"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {strategies && strategies.length > 0 ? (
          <div className="grid gap-4">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className="hover-elevate" data-testid={`card-strategy-${strategy.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {strategy.strategyType.replace(/_/g, " ").toUpperCase()} Strategy
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {strategy.violationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getRecommendationBadgeVariant(strategy.selfDisclosureRecommendation || "pending_analysis")}>
                        <span className="flex items-center gap-1">
                          {getRecommendationIcon(strategy.selfDisclosureRecommendation || "pending_analysis")}
                          {(strategy.selfDisclosureRecommendation || "pending_analysis").replace(/_/g, " ")}
                        </span>
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(strategy.id)}
                        data-testid={`button-delete-${strategy.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {strategy.selfDisclosureRationale && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Self-Disclosure Rationale</h4>
                      <p className="text-sm text-muted-foreground">{strategy.selfDisclosureRationale}</p>
                    </div>
                  )}

                  {strategy.riskAssessment && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Risk Assessment
                      </h4>
                      <p className="text-sm text-muted-foreground">{strategy.riskAssessment}</p>
                    </div>
                  )}

                  {strategy.strategicRecommendations && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Strategic Recommendations</h4>
                      <p className="text-sm text-muted-foreground">{strategy.strategicRecommendations}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Clock className="h-4 w-4" />
                    Created {format(new Date(strategy.createdAt), "MMM d, yyyy")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Regulatory Strategies</h3>
              <p className="text-muted-foreground mb-4">
                Create a strategy to assess self-disclosure options and regulatory engagement.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Strategy
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
