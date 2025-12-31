import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, BookOpen, GraduationCap, CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";

export default function PoliciesTrainingPage() {
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ["/api/policies"],
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["/api/training/courses"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/training/assignments/all"],
  });

  const { data: certifications, isLoading: certificationsLoading } = useQuery({
    queryKey: ["/api/certifications"],
  });

  const { data: attestations, isLoading: attestationsLoading } = useQuery({
    queryKey: ["/api/policy-attestations"],
  });

  const { data: metrics } = useQuery({
    queryKey: ["/api/training/compliance-metrics"],
  });

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      "code_of_conduct": "bg-blue-500",
      "data_privacy": "bg-purple-500",
      "security": "bg-red-500",
      "harassment": "bg-orange-500",
      "procurement": "bg-green-500",
      "vendor": "bg-cyan-500",
      "default": "bg-gray-500",
    };
    return colors[category] || colors.default;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Training & Compliance</h1>
        <p className="text-muted-foreground">
          Manage company policies, training materials, and track compliance for employees, vendors, and third parties
        </p>
      </div>

      {metrics && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.policies.totalPolicies}</div>
              <p className="text-xs text-muted-foreground">
                Active policies requiring attestation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.training.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.training.completedCount} of {metrics.training.totalEnrollments} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Attestations</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.policies.pendingAttestations}</div>
              <p className="text-xs text-muted-foreground">
                Policies awaiting acknowledgment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Training</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.training.overdueAssignments}</div>
              <p className="text-xs text-muted-foreground">
                Assignments past due date
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policies" data-testid="tab-policies">
            <FileText className="h-4 w-4 mr-2" />
            Policies & Handbooks
          </TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">
            <BookOpen className="h-4 w-4 mr-2" />
            Training Materials
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Compliance Tracking
          </TabsTrigger>
          <TabsTrigger value="certifications" data-testid="tab-certifications">
            <GraduationCap className="h-4 w-4 mr-2" />
            Certifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Company Policies & Handbooks</CardTitle>
                  <CardDescription>
                    Policies for staff, vendors, contractors, and procurement
                  </CardDescription>
                </div>
                <Button data-testid="button-create-policy">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {policiesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading policies...</div>
              ) : policies && policies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Attestations</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy: any) => (
                      <TableRow key={policy.id} data-testid={`policy-row-${policy.id}`}>
                        <TableCell className="font-medium">{policy.policyName}</TableCell>
                        <TableCell>
                          <Badge className={getCategoryBadgeColor(policy.policyCategory)}>
                            {policy.policyCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>{policy.version}</TableCell>
                        <TableCell>{format(new Date(policy.effectiveDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-muted-foreground">
                              {policy.totalAttestations} / {policy.totalAttestations + policy.pendingAttestations}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {policy.isCurrent === "true" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                              Current
                            </Badge>
                          ) : (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" data-testid={`button-view-policy-${policy.id}`}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No policies created yet</p>
                  <Button data-testid="button-create-first-policy">Create First Policy</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Materials</CardTitle>
                  <CardDescription>
                    Training docs, plans, videos, webinars, and seminars
                  </CardDescription>
                </div>
                <Button data-testid="button-create-training">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create Training
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading training courses...</div>
              ) : courses && courses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Enrollments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course: any) => (
                      <TableRow key={course.id} data-testid={`course-row-${course.id}`}>
                        <TableCell className="font-medium">{course.courseName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{course.courseType}</Badge>
                        </TableCell>
                        <TableCell>{course.durationMinutes} min</TableCell>
                        <TableCell>{course.enrollmentCount || 0}</TableCell>
                        <TableCell>
                          {course.isActive === "true" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" data-testid={`button-view-course-${course.id}`}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No training courses created yet</p>
                  <Button data-testid="button-create-first-training">Create First Training</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Tracking</CardTitle>
              <CardDescription>
                Track training and policy compliance for employees, vendors, and third parties
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
              ) : assignments && assignments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.slice(0, 50).map((assignment: any) => (
                      <TableRow key={assignment.id} data-testid={`assignment-row-${assignment.id}`}>
                        <TableCell>{assignment.userId.substring(0, 8)}...</TableCell>
                        <TableCell className="font-medium">{assignment.courseId.substring(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{assignment.assignmentReason}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(assignment.dueDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {assignment.status === "completed" ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : assignment.status === "overdue" ? (
                            <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {assignment.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.priority === "urgent" ? "destructive" : "outline"}>
                            {assignment.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No compliance tracking data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certifications & Completions</CardTitle>
              <CardDescription>
                View all training certifications and completion records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {certificationsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading certifications...</div>
              ) : certifications && certifications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.slice(0, 50).map((cert: any) => (
                      <TableRow key={cert.id} data-testid={`cert-row-${cert.id}`}>
                        <TableCell>{cert.userId.substring(0, 8)}...</TableCell>
                        <TableCell className="font-medium">{cert.certificationName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{cert.certificationType}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(cert.issuedDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          {cert.expiryDate ? format(new Date(cert.expiryDate), "MMM d, yyyy") : "No expiry"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              cert.renewalStatus === "valid"
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : cert.renewalStatus === "expired"
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                            }
                          >
                            {cert.renewalStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No certifications issued yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
