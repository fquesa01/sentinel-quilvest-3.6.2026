import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  Award,
  FileText,
  AlertTriangle,
  BookOpen,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmployeeDashboardMetrics {
  pendingTrainingCount: number;
  completedTrainingCount: number;
  pendingPoliciesCount: number;
  attestedPoliciesCount: number;
  activeCertificationsCount: number;
  complianceScore: number;
}

interface TrainingAssignment {
  id: string;
  courseId: string;
  userId: string;
  assignedReason: string;
  dueDate: string;
  status: string;
  priority: string;
}

interface Policy {
  id: string;
  policyCategory: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  policyContent: string;
  isMandatory: string;
  requiresAttestation: string;
}

interface Certification {
  id: string;
  certificationType: string;
  certificationName: string;
  issuedDate: string;
  expiryDate: string;
  renewalStatus: string;
  certificateUrl: string;
}

export default function EmployeeDashboard() {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<EmployeeDashboardMetrics>({
    queryKey: ["/api/employee/dashboard"],
  });

  const { data: trainingAssignments, isLoading: trainingLoading } = useQuery<TrainingAssignment[]>({
    queryKey: ["/api/employee/training/assignments"],
  });

  const { data: pendingPolicies, isLoading: policiesLoading } = useQuery<Policy[]>({
    queryKey: ["/api/employee/policies/pending"],
  });

  const { data: certifications, isLoading: certsLoading } = useQuery<Certification[]>({
    queryKey: ["/api/employee/certifications"],
  });

  const attestPolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      return await apiRequest("POST", "/api/employee/policies/attest", {
        policyId,
        attestationMethod: "digital_signature",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/policies/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/dashboard"] });
      setPolicyDialogOpen(false);
      setSelectedPolicy(null);
      toast({
        title: "Policy Attested",
        description: "You have successfully acknowledged the policy.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAttestPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPolicyDialogOpen(true);
  };

  const confirmAttestation = () => {
    if (selectedPolicy) {
      attestPolicyMutation.mutate(selectedPolicy.id);
    }
  };

  if (metricsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-employee-dashboard">
            My Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your training, policies, and certifications
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-compliance-score">
              {metrics?.complianceScore || 0}%
            </div>
            <Progress value={metrics?.complianceScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Training</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-pending-training">
              {metrics?.pendingTrainingCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.completedTrainingCount || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-pending-policies">
              {metrics?.pendingPoliciesCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.attestedPoliciesCount || 0} attested
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="metric-certifications">
              {metrics?.activeCertificationsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valid certificates</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Training */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Training Assignments
          </CardTitle>
          <CardDescription>Complete these training modules by the due date</CardDescription>
        </CardHeader>
        <CardContent>
          {trainingLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : trainingAssignments && trainingAssignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingAssignments.map((assignment) => (
                  <TableRow key={assignment.id} data-testid={`training-row-${assignment.id}`}>
                    <TableCell className="font-medium">{assignment.courseId}</TableCell>
                    <TableCell className="capitalize">
                      {assignment.assignedReason?.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          assignment.priority === "urgent"
                            ? "destructive"
                            : assignment.priority === "high"
                            ? "default"
                            : "secondary"
                        }
                        data-testid={`badge-priority-${assignment.id}`}
                      >
                        {assignment.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assignment.dueDate ? format(new Date(assignment.dueDate), "MMM d, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-status-${assignment.id}`}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" data-testid={`button-start-training-${assignment.id}`}>
                        Start
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No pending training assignments</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policies Requiring Attestation
          </CardTitle>
          <CardDescription>Review and acknowledge these policies</CardDescription>
        </CardHeader>
        <CardContent>
          {policiesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : pendingPolicies && pendingPolicies.length > 0 ? (
            <div className="space-y-4">
              {pendingPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                  data-testid={`policy-${policy.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{policy.title}</h3>
                      <Badge variant="secondary">{policy.policyCategory?.replace(/_/g, " ")}</Badge>
                      {policy.isMandatory === "true" && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{policy.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Version {policy.version} • Effective{" "}
                      {format(new Date(policy.effectiveDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleAttestPolicy(policy)}
                    data-testid={`button-review-policy-${policy.id}`}
                  >
                    Review & Attest
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All policies acknowledged</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            My Certifications
          </CardTitle>
          <CardDescription>View your active compliance certifications</CardDescription>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : certifications && certifications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 border rounded-md hover-elevate"
                  data-testid={`cert-${cert.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{cert.certificationName}</h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {cert.certificationType?.replace(/_/g, " ")}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Issued: {format(new Date(cert.issuedDate), "MMM d, yyyy")}</p>
                        {cert.expiryDate && (
                          <p>Expires: {format(new Date(cert.expiryDate), "MMM d, yyyy")}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={cert.renewalStatus === "valid" ? "default" : "secondary"}
                      data-testid={`badge-cert-status-${cert.id}`}
                    >
                      {cert.renewalStatus}
                    </Badge>
                  </div>
                  {cert.certificateUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      data-testid={`button-download-cert-${cert.id}`}
                    >
                      Download Certificate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-2" />
              <p>No certifications yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Review Dialog */}
      <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.title}</DialogTitle>
            <DialogDescription>
              Please review the policy carefully before attesting
            </DialogDescription>
          </DialogHeader>
          {selectedPolicy && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Policy Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>{" "}
                    <span className="capitalize">
                      {selectedPolicy.policyCategory?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span> {selectedPolicy.version}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effective Date:</span>{" "}
                    {format(new Date(selectedPolicy.effectiveDate), "MMMM d, yyyy")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mandatory:</span>{" "}
                    {selectedPolicy.isMandatory === "true" ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedPolicy.description}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Policy Content</h4>
                <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {selectedPolicy.policyContent}
                </div>
              </div>
              <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm">
                  By clicking "I Acknowledge", you confirm that you have read and understood this
                  policy and agree to comply with its requirements.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPolicyDialogOpen(false)}
                  data-testid="button-cancel-attestation"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmAttestation}
                  disabled={attestPolicyMutation.isPending}
                  data-testid="button-confirm-attestation"
                >
                  {attestPolicyMutation.isPending ? "Processing..." : "I Acknowledge"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
