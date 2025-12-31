import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  TestTube,
  Save,
  AlertCircle,
} from "lucide-react";

const ruleFormSchema = z.object({
  ruleName: z.string().min(3, "Rule name must be at least 3 characters"),
  ruleDescription: z.string().min(10, "Description must be at least 10 characters"),
  violationType: z.string().min(1, "Please select a violation type"),
  severity: z.enum(["critical", "high", "medium", "low"]),
  riskScore: z.number().min(1).max(100),
  keywords: z.array(z.string()).optional(),
  regexPatterns: z.array(z.string()).optional(),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

const STEPS = [
  { id: 1, title: "Basic Info", description: "Define rule basics" },
  { id: 2, title: "Conditions", description: "Set detection criteria" },
  { id: 3, title: "Test Rule", description: "Verify rule logic" },
];

export default function RuleBuilder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [regexPatterns, setRegexPatterns] = useState<string[]>([]);
  const [regexInput, setRegexInput] = useState("");
  const [numericThresholds, setNumericThresholds] = useState<any[]>([]);
  const [sampleText, setSampleText] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      ruleName: "",
      ruleDescription: "",
      violationType: "",
      severity: "medium",
      riskScore: 50,
      keywords: [],
      regexPatterns: [],
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/rules", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      toast({
        title: "Rule Created",
        description: "Custom rule created successfully",
      });
      navigate("/rules");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rule",
        variant: "destructive",
      });
    },
  });

  const testRuleMutation = useMutation({
    mutationFn: async (data: { rule: any; sampleText: string }) => {
      const response = await apiRequest("POST", "/api/rules/test", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to test rule",
        variant: "destructive",
      });
    },
  });

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const addRegexPattern = () => {
    if (regexInput.trim()) {
      try {
        new RegExp(regexInput.trim());
        setRegexPatterns([...regexPatterns, regexInput.trim()]);
        setRegexInput("");
      } catch (e) {
        toast({
          title: "Invalid Regex",
          description: "Please enter a valid regular expression",
          variant: "destructive",
        });
      }
    }
  };

  const removeRegexPattern = (pattern: string) => {
    setRegexPatterns(regexPatterns.filter((p) => p !== pattern));
  };

  const addNumericThreshold = () => {
    setNumericThresholds([
      ...numericThresholds,
      { field: "amount", operator: ">", value: 0 },
    ]);
  };

  const removeNumericThreshold = (index: number) => {
    setNumericThresholds(numericThresholds.filter((_, i) => i !== index));
  };

  const updateNumericThreshold = (index: number, field: string, value: any) => {
    const updated = [...numericThresholds];
    updated[index] = { ...updated[index], [field]: value };
    setNumericThresholds(updated);
  };

  const handleTestRule = () => {
    const values = form.getValues();
    const ruleToTest = {
      ...values,
      keywords,
      regexPatterns,
      numericThresholds,
    };
    testRuleMutation.mutate({ rule: ruleToTest, sampleText });
  };

  const onSubmit = (data: RuleFormValues) => {
    const finalData = {
      ...data,
      keywords,
      regexPatterns,
      numericThresholds,
    };
    createRuleMutation.mutate(finalData);
  };

  const nextStep = async () => {
    const isValid = await form.trigger();
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Create Custom Rule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build a custom compliance detection rule with no-code builder
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/rules")}
          data-testid="button-cancel"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground"
                        : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-border mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-auto">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground">
                  Define the basic properties of your custom rule
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="ruleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Vendor Payment Limit $10K"
                          {...field}
                          data-testid="input-rule-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A clear, descriptive name for this rule
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ruleDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this rule detects and why it's important..."
                          rows={4}
                          {...field}
                          data-testid="textarea-rule-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Explain what violations this rule will detect
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <SelectItem value="fcpa" data-testid="option-violation-fcpa">FCPA</SelectItem>
                            <SelectItem value="banking" data-testid="option-violation-banking">Banking</SelectItem>
                            <SelectItem value="antitrust" data-testid="option-violation-antitrust">Antitrust</SelectItem>
                            <SelectItem value="sec" data-testid="option-violation-sec">SEC</SelectItem>
                            <SelectItem value="sox" data-testid="option-violation-sox">SOX</SelectItem>
                            <SelectItem value="finra" data-testid="option-violation-finra">FINRA</SelectItem>
                            <SelectItem value="other_violation" data-testid="option-violation-other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-severity">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical" data-testid="option-severity-critical">Critical</SelectItem>
                            <SelectItem value="high" data-testid="option-severity-high">High</SelectItem>
                            <SelectItem value="medium" data-testid="option-severity-medium">Medium</SelectItem>
                            <SelectItem value="low" data-testid="option-severity-low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="riskScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Score (1-100)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={field.value}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 50 : parseInt(e.target.value, 10);
                            field.onChange(value);
                          }}
                          data-testid="input-risk-score"
                        />
                      </FormControl>
                      <FormDescription>
                        Base risk score for matches (1=low, 100=critical)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Conditions */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Keywords</h2>
                  <p className="text-sm text-muted-foreground">
                    Add keywords or phrases to detect in communications
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter keyword or phrase..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                      data-testid="input-keyword"
                    />
                    <Button
                      type="button"
                      onClick={addKeyword}
                      data-testid="button-add-keyword"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" data-testid={`badge-keyword-${idx}`}>
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-2 hover:text-destructive"
                          data-testid={`button-remove-keyword-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Numeric Thresholds</h2>
                  <p className="text-sm text-muted-foreground">
                    Set amount limits or count thresholds
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {numericThresholds.map((threshold, idx) => (
                    <div key={idx} className="flex gap-2 items-start" data-testid={`row-threshold-${idx}`}>
                      <Select
                        value={threshold.field}
                        onValueChange={(value) =>
                          updateNumericThreshold(idx, "field", value)
                        }
                      >
                        <SelectTrigger className="w-32" data-testid={`select-threshold-field-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount" data-testid={`option-field-amount-${idx}`}>Amount</SelectItem>
                          <SelectItem value="count" data-testid={`option-field-count-${idx}`}>Count</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={threshold.operator}
                        onValueChange={(value) =>
                          updateNumericThreshold(idx, "operator", value)
                        }
                      >
                        <SelectTrigger className="w-24" data-testid={`select-threshold-operator-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">" data-testid={`option-op-gt-${idx}`}>&gt;</SelectItem>
                          <SelectItem value="<" data-testid={`option-op-lt-${idx}`}>&lt;</SelectItem>
                          <SelectItem value=">=" data-testid={`option-op-gte-${idx}`}>&gt;=</SelectItem>
                          <SelectItem value="<=" data-testid={`option-op-lte-${idx}`}>&lt;=</SelectItem>
                          <SelectItem value="=" data-testid={`option-op-eq-${idx}`}>=</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={threshold.value}
                        onChange={(e) =>
                          updateNumericThreshold(idx, "value", parseFloat(e.target.value))
                        }
                        placeholder="Value"
                        data-testid={`input-threshold-value-${idx}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeNumericThreshold(idx)}
                        data-testid={`button-remove-threshold-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNumericThreshold}
                    data-testid="button-add-threshold"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Threshold
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Regex Patterns (Advanced)</h2>
                  <p className="text-sm text-muted-foreground">
                    Add custom regular expressions for complex matching
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter regex pattern..."
                      value={regexInput}
                      onChange={(e) => setRegexInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRegexPattern())}
                      data-testid="input-regex"
                    />
                    <Button
                      type="button"
                      onClick={addRegexPattern}
                      data-testid="button-add-regex"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {regexPatterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-muted rounded"
                        data-testid={`row-regex-${idx}`}
                      >
                        <code className="flex-1 text-sm">{pattern}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRegexPattern(pattern)}
                          data-testid={`button-remove-regex-${idx}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Test Rule */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Test Your Rule</h2>
                <p className="text-sm text-muted-foreground">
                  Test the rule against sample communication to verify it works correctly
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sample Communication</label>
                  <Textarea
                    placeholder="Paste sample email or message text here to test the rule..."
                    rows={6}
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    data-testid="textarea-sample-text"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleTestRule}
                  disabled={!sampleText || testRuleMutation.isPending}
                  data-testid="button-test-rule"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {testRuleMutation.isPending ? "Testing..." : "Test Rule"}
                </Button>

                {testResult && (
                  <div className="space-y-4 p-4 border rounded-lg" data-testid="div-test-results">
                    <div className="flex items-center gap-2">
                      {testResult.matched ? (
                        <Badge variant="destructive" data-testid="badge-test-matched">
                          Rule Triggered
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid="badge-test-no-match">
                          No Match
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        Confidence: {testResult.confidence}%
                      </span>
                    </div>

                    {testResult.explanation && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Explanation:</div>
                        <div className="text-muted-foreground" data-testid="text-test-explanation">
                          {testResult.explanation}
                        </div>
                      </div>
                    )}

                    {testResult.matches && testResult.matches.length > 0 && (
                      <div>
                        <div className="font-medium text-sm mb-2">Matches:</div>
                        <div className="space-y-2">
                          {testResult.matches.map((match: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-sm p-2 bg-muted rounded"
                              data-testid={`div-match-${idx}`}
                            >
                              <div className="font-medium capitalize">{match.type}</div>
                              <div className="text-muted-foreground">
                                {JSON.stringify(match, null, 2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {testResult && !testResult.matched && (
                  <div className="flex items-start gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800 dark:text-yellow-300">
                        Rule did not match
                      </div>
                      <div className="text-yellow-700 dark:text-yellow-400 mt-1">
                        Try adjusting your keywords, patterns, or thresholds and test again.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          data-testid="button-prev-step"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {STEPS.length}
        </div>

        {currentStep < STEPS.length ? (
          <Button onClick={nextStep} data-testid="button-next-step">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createRuleMutation.isPending}
            data-testid="button-save-rule"
          >
            <Save className="mr-2 h-4 w-4" />
            {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
          </Button>
        )}
      </div>
    </div>
  );
}
