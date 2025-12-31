import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Shield, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const reportSchema = z.object({
  // Case Type & Channel
  incidentCategory: z.string().min(1, "Please select an incident category"),
  incidentSubcategory: z.string().optional(),
  intakeChannel: z.string().min(1, "Please select reporting channel"),
  
  // Incident Details
  incidentDescription: z.string().min(10, "Please provide at least 10 characters"),
  incidentDate: z.string().optional(),
  incidentTime: z.string().optional(),
  incidentLocation: z.string().optional(),
  
  // Involved Parties
  allegedViolators: z.string().optional(),
  witnesses: z.string().optional(),
  
  // Risk Assessment
  executiveInvolvement: z.enum(["yes", "no"]).default("no"),
  requiresConfidentiality: z.enum(["yes", "no"]).default("yes"),
  additionalMatters: z.enum(["yes", "no"]).default("no"),
  
  // Reporter Information
  isAnonymous: z.enum(["yes", "no"]).default("yes"),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional().or(z.literal("")),
  reporterPhone: z.string().optional(),
  wantUpdates: z.enum(["yes", "no"]).default("no"),
});

type ReportFormData = z.infer<typeof reportSchema>;

export default function WhistleblowerReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      incidentCategory: "",
      intakeChannel: "web",
      incidentDescription: "",
      executiveInvolvement: "no",
      requiresConfidentiality: "yes",
      additionalMatters: "no",
      isAnonymous: "yes",
      wantUpdates: "no",
    },
  });

  const isAnonymous = form.watch("isAnonymous") === "yes";
  const wantUpdates = form.watch("wantUpdates") === "yes";

  async function onSubmit(data: ReportFormData) {
    setIsSubmitting(true);
    try {
      // Prepare alleged violators and witnesses
      const allegedViolators = data.allegedViolators 
        ? data.allegedViolators.split("\n").map(line => ({ name: line.trim() }))
        : [];
      
      const witnesses = data.witnesses
        ? data.witnesses.split("\n").map(line => ({ name: line.trim() }))
        : [];

      // Prepare incident date/time
      let incidentDate = null;
      if (data.incidentDate && data.incidentTime) {
        incidentDate = new Date(`${data.incidentDate}T${data.incidentTime}`);
      } else if (data.incidentDate) {
        incidentDate = new Date(data.incidentDate);
      }

      const reportData = {
        isAnonymous: data.isAnonymous === "yes" ? "true" : "false",
        intakeChannel: data.intakeChannel,
        incidentCategory: data.incidentCategory,
        incidentSubcategory: data.incidentSubcategory,
        incidentDescription: data.incidentDescription,
        incidentDate: incidentDate?.toISOString(),
        incidentLocation: data.incidentLocation,
        allegedViolators: JSON.stringify(allegedViolators),
        witnesses: JSON.stringify(witnesses),
        requiresConfidentiality: data.requiresConfidentiality === "yes" ? "true" : "false",
        severity: data.executiveInvolvement === "yes" ? "high" : "medium",
        // Reporter info (only if not anonymous and wants updates)
        reporterName: !isAnonymous && wantUpdates ? data.reporterName : undefined,
        reporterEmail: !isAnonymous && wantUpdates ? data.reporterEmail : undefined,
        reporterPhone: !isAnonymous && wantUpdates ? data.reporterPhone : undefined,
      };

      const response = await apiRequest("POST", "/api/whistleblower/submit", reportData);
      const result = await response.json() as { reportNumber: string; accessCode?: string };
      console.log("[Whistleblower Submit] Received response:", result);

      if (result.reportNumber) {
        console.log("[Whistleblower Submit] Navigating to confirmation with reportNumber:", result.reportNumber);
        setLocation(`/report/confirmation?id=${result.reportNumber}${result.accessCode ? `&accessCode=${result.accessCode}` : ''}`);
      } else {
        console.error("[Whistleblower Submit] No reportNumber in response!");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit report. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Whistleblower Hotline</h1>
              <p className="text-muted-foreground">Sentinel Counsel LLP - Confidential Reporting</p>
            </div>
          </div>
          
          <Alert className="bg-muted">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your report will be handled with strict confidentiality. You can choose to remain anonymous.
              All reports are protected under applicable whistleblower protection laws.
            </AlertDescription>
          </Alert>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Case Type */}
            <Card>
              <CardHeader>
                <CardTitle>New Case</CardTitle>
                <CardDescription>* Indicates mandatory field</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="incidentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>* Issue Category:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-incident-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="human_resources">Human Resources / Employee Relations</SelectItem>
                          <SelectItem value="fraud">Fraud / Financial Misconduct</SelectItem>
                          <SelectItem value="harassment">Harassment / Discrimination</SelectItem>
                          <SelectItem value="safety">Safety Violations</SelectItem>
                          <SelectItem value="ethics">Ethics / Conflicts of Interest</SelectItem>
                          <SelectItem value="retaliation">Retaliation</SelectItem>
                          <SelectItem value="data_breach">Data Breach / Privacy</SelectItem>
                          <SelectItem value="environmental">Environmental</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="intakeChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>* Reporting Channel:</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-intake-channel">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="web">Web Submission</SelectItem>
                          <SelectItem value="phone">Phone Hotline</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                          <SelectItem value="mail">Mail</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentSubcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Type:</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Harassment, Sexual" {...field} data-testid="input-incident-subcategory" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Case Details */}
            <Card>
              <CardHeader>
                <CardTitle>Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incidentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Incident:</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-incident-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time:</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-incident-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="incidentLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location:</FormLabel>
                      <FormControl>
                        <Input placeholder="Where did the incident occur?" {...field} data-testid="input-incident-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidentDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>* Case Details:</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe the details of this incident. Please provide information such as what happened, who was involved, when did it happen, where did it happen, and any other related information."
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="textarea-incident-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allegedViolators"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Involved Parties:</FormLabel>
                      <FormDescription>
                        List names, titles, departments (one per line)
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="John Doe, Manager, Sales Department"
                          className="min-h-[80px] resize-none"
                          {...field}
                          data-testid="textarea-alleged-violators"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="witnesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Witnesses:</FormLabel>
                      <FormDescription>
                        List any witnesses (one per line)
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          placeholder="Jane Smith, Colleague"
                          className="min-h-[80px] resize-none"
                          {...field}
                          data-testid="textarea-witnesses"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalMatters"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Are there additional matters to be reviewed?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="additional-yes" data-testid="radio-additional-yes" />
                            <Label htmlFor="additional-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="additional-no" data-testid="radio-additional-no" />
                            <Label htmlFor="additional-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Risk and Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Risk and Priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="executiveInvolvement"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Executive Involvement?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="exec-yes" data-testid="radio-exec-yes" />
                            <Label htmlFor="exec-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="exec-no" data-testid="radio-exec-no" />
                            <Label htmlFor="exec-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Reporter */}
            <Card>
              <CardHeader>
                <CardTitle>Reporter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isAnonymous"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>* Would you like to remain anonymous?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="anon-yes" data-testid="radio-anonymous-yes" />
                            <Label htmlFor="anon-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="anon-no" data-testid="radio-anonymous-no" />
                            <Label htmlFor="anon-no">No</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isAnonymous && (
                  <FormField
                    control={form.control}
                    name="wantUpdates"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>* Would you like to receive updates?</FormLabel>
                        <FormDescription>
                          Select "Yes" to create an account and receive notifications on your case. You will still remain anonymous if you have not chosen to identify yourself.
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="updates-yes" data-testid="radio-updates-yes" />
                              <Label htmlFor="updates-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="updates-no" data-testid="radio-updates-no" />
                              <Label htmlFor="updates-no">No</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!isAnonymous && wantUpdates && (
                  <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                    <FormField
                      control={form.control}
                      name="reporterName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name:</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} data-testid="input-reporter-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reporterEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email:</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} data-testid="input-reporter-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reporterPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone:</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-reporter-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit-report">
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
