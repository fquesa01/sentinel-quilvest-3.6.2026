import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Building2,
  Smartphone,
  Laptop,
  Tablet,
  Folder,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  Employee,
  VendorContact,
  MonitoredDevice,
  FolderAccess,
  CommunicationStat,
  DataVolumeHistory,
  Case,
} from "@shared/schema";
import { CommunicationNetworkGraph } from "@/components/monitoring/communication-network-graph";
import { ActivityHeatmap } from "@/components/monitoring/activity-heatmap";
import { ChannelMixDonut } from "@/components/monitoring/channel-mix-donut";
import { BehaviorRadar } from "@/components/monitoring/behavior-radar";
import { TopicBubbles } from "@/components/monitoring/topic-bubbles";

type PersonType = "employee" | "vendor";

export default function MonitoringProfile() {
  const params = useParams<{ type: PersonType; id: string }>();
  const personType = params.type!;
  const personId = params.id!;

  const { data: person, isLoading: loadingPerson } = useQuery<Employee | VendorContact>({
    queryKey: personType === "employee" ? ["/api/employees", personId] : ["/api/vendor-contacts", personId],
  });

  const { data: devices = [], isLoading: loadingDevices } = useQuery<MonitoredDevice[]>({
    queryKey: ["/api/monitored-devices", personType, personId],
  });

  const { data: folders = [], isLoading: loadingFolders } = useQuery<FolderAccess[]>({
    queryKey: ["/api/folder-access", personType, personId],
  });

  const { data: communicationStats = [], isLoading: loadingComms } = useQuery<CommunicationStat[]>({
    queryKey: ["/api/communication-stats", personId],
  });

  const { data: dataVolumeHistory = [], isLoading: loadingVolume } = useQuery<DataVolumeHistory[]>({
    queryKey: ["/api/data-volume-history", personType, personId],
  });

  const { data: allCases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: allVendorContacts = [] } = useQuery<VendorContact[]>({
    queryKey: ["/api/vendor-contacts"],
  });

  if (loadingPerson) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-muted-foreground">Person not found</div>
        </div>
      </div>
    );
  }

  const displayName = `${person.firstName} ${person.lastName}`;
  const companyName = personType === "vendor" ? (person as VendorContact).companyName : "—";
  const departmentOrType =
    personType === "employee" ? (person as Employee).department : (person as VendorContact).vendorType;

  const getRiskBadgeVariant = (riskLevel: string | null) => {
    switch (riskLevel) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getComplianceColor = (score: number | null) => {
    if (!score) return "text-gray-500";
    if (score >= 90) return "text-green-600 dark:text-green-500";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "smartphone":
        return Smartphone;
      case "laptop":
        return Laptop;
      case "tablet":
        return Tablet;
      default:
        return Smartphone;
    }
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-600 dark:text-green-500";
      case "inactive":
        return "text-gray-500";
      case "suspended":
        return "text-red-600 dark:text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "onedrive":
      case "sharepoint":
        return Folder;
      case "google drive":
      case "google_drive":
        return Folder;
      case "employee_agreements":
        return FileText;
      default:
        return Folder;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
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

  const volumeChartData = dataVolumeHistory
    .filter((item: DataVolumeHistory) => item.date && !isNaN(new Date(item.date).getTime()))
    .sort((a: DataVolumeHistory, b: DataVolumeHistory) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((item: DataVolumeHistory) => ({
      month: format(new Date(item.date), "MMM yyyy"),
      volume: item.volumeGb,
    }));

  // Transform communication stats to include contact information
  const topContacts = communicationStats
    .map((stat: CommunicationStat) => {
      // Determine which personId is the contact (not the current person)
      const contactPersonId = stat.personId1 === personId ? stat.personId2 : stat.personId1;
      
      // Try to find in employees first, then vendors
      const employeeContact = allEmployees.find(e => e.id === contactPersonId);
      const vendorContact = allVendorContacts.find(v => v.id === contactPersonId);
      
      const contact = employeeContact || vendorContact;
      const contactType: PersonType = employeeContact ? "employee" : "vendor";
      const contactName = contact ? `${contact.firstName} ${contact.lastName}` : "Unknown Contact";
      
      return {
        ...stat,
        contactPersonId,
        contactPersonType: contactType,
        contactName,
      };
    })
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 10);

  const relatedCases = allCases.filter(
    (c: Case) =>
      c.employeeName?.toLowerCase().includes(displayName.toLowerCase()) ||
      c.description?.toLowerCase().includes(displayName.toLowerCase())
  );

  const totalMessages = communicationStats.reduce((sum: number, stat: CommunicationStat) => sum + stat.messageCount, 0);
  const totalDataVolume = dataVolumeHistory.reduce((sum: number, item: DataVolumeHistory) => sum + item.volumeGb, 0);

  // Calculate channel mix
  const emailMessages = communicationStats.filter(s => s.method.toLowerCase() === "email").reduce((sum, s) => sum + s.messageCount, 0);
  const teamsMessages = communicationStats.filter(s => s.method.toLowerCase() === "teams").reduce((sum, s) => sum + s.messageCount, 0);
  const smsMessages = communicationStats.filter(s => s.method.toLowerCase() === "sms").reduce((sum, s) => sum + s.messageCount, 0);
  const externalMessages = totalMessages - emailMessages - teamsMessages - smsMessages;

  const emailPercent = totalMessages > 0 ? Math.round((emailMessages / totalMessages) * 100) : 0;
  const teamsPercent = totalMessages > 0 ? Math.round((teamsMessages / totalMessages) * 100) : 0;
  const smsPercent = totalMessages > 0 ? Math.round((smsMessages / totalMessages) * 100) : 0;
  const externalPercent = 100 - emailPercent - teamsPercent - smsPercent;

  // Generate activity heatmap data (last 42 days)
  const today = new Date();
  const heatmapData = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (41 - i));
    const intensity = Math.floor(Math.random() * 120);
    return {
      date: format(date, "MMM d"),
      value: intensity,
      flagged: intensity > 100,
    };
  });

  // Sample behavior metrics (in production, calculate from actual data)
  const employeeMetrics = {
    afterHours: 0.65,
    externalComms: Math.min(externalPercent / 100, 1),
    riskKeywords: person.riskLevel === "high" ? 0.75 : person.riskLevel === "medium" ? 0.5 : 0.3,
    attachments: 0.55,
    offChannel: externalPercent / 200,
  };

  const averageMetrics = {
    afterHours: 0.35,
    externalComms: 0.40,
    riskKeywords: 0.30,
    attachments: 0.45,
    offChannel: 0.25,
  };

  // Communication topics (sample data)
  const topics = [
    { name: "Sales", size: 45, color: "hsl(var(--primary))" },
    { name: "Invoices", size: 28, color: "hsl(217, 91%, 60%)" },
    { name: "Vendor", size: 22, color: "hsl(142, 71%, 45%)" },
    { name: "HR", size: 18, color: "hsl(48, 96%, 53%)" },
    { name: "Personal", size: 12, color: "hsl(0, 72%, 51%)" },
  ];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/monitoring/directory">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {person.firstName[0]}
                    {person.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-2xl" data-testid="text-person-name">
                      {displayName}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={personType === "employee" ? "default" : "outline"}>
                        {personType === "employee" ? <User className="w-3 h-3 mr-1" /> : <Building2 className="w-3 h-3 mr-1" />}
                        {personType === "employee" ? "Employee" : "Vendor"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{departmentOrType}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={getRiskBadgeVariant(person.riskLevel)} data-testid="badge-risk-level">
                  {person.riskLevel || "Unknown"} Risk
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium" data-testid="text-email">
                    {person.email}
                  </p>
                </div>
                {personType === "employee" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Employee Number</p>
                    <p className="font-medium">{(person as Employee).employeeNumber}</p>
                  </div>
                )}
                {personType === "vendor" && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{companyName}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{devices.length}</p>
                  <p className="text-sm text-muted-foreground">Devices</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{folders.length}</p>
                  <p className="text-sm text-muted-foreground">Folders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{totalMessages.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${((person.complianceScore || 0) / 100) * 351.86} 351.86`}
                      className={getComplianceColor(person.complianceScore)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${getComplianceColor(person.complianceScore)}`} data-testid="text-compliance-score">
                      {person.complianceScore || 0}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Based on {totalMessages.toLocaleString()} communications analyzed across {totalDataVolume.toFixed(1)} GB
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="insights" data-testid="tab-insights">
              Insights
            </TabsTrigger>
            <TabsTrigger value="devices" data-testid="tab-devices">
              Devices ({devices.length})
            </TabsTrigger>
            <TabsTrigger value="folders" data-testid="tab-folders">
              Folders ({folders.length})
            </TabsTrigger>
            <TabsTrigger value="volume" data-testid="tab-volume">
              Data Volume
            </TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">
              Communications
            </TabsTrigger>
            <TabsTrigger value="investigations" data-testid="tab-investigations">
              Investigations ({relatedCases.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Network Graph */}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Network</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Top contacts by message volume
                  </p>
                </CardHeader>
                <CardContent>
                  {topContacts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No communication data available
                    </div>
                  ) : (
                    <CommunicationNetworkGraph
                      centerName={displayName}
                      totalMessages={totalMessages}
                      topContacts={topContacts}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Behavior Radar */}
              <Card>
                <CardHeader>
                  <CardTitle>Behavior vs Company Average</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Risk indicators compared to peers
                  </p>
                </CardHeader>
                <CardContent>
                  <BehaviorRadar
                    employeeMetrics={employeeMetrics}
                    averageMetrics={averageMetrics}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Heatmap + Channel Mix */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Daily communication patterns over the past 6 weeks
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ActivityHeatmap data={heatmapData} />
                  
                  <div className="pt-6 border-t">
                    <h3 className="text-sm font-semibold mb-4">Channel Mix</h3>
                    <ChannelMixDonut
                      emailPercent={emailPercent}
                      teamsPercent={teamsPercent}
                      smsPercent={smsPercent}
                      externalPercent={externalPercent}
                    />
                    
                    {externalPercent > 20 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                              High External Exposure
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                              {externalPercent}% of communications through external/unapproved channels
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Topics + Risk Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Topics</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Primary discussion themes
                  </p>
                </CardHeader>
                <CardContent>
                  <TopicBubbles topics={topics} />
                  
                  <div className="mt-6 pt-6 border-t space-y-3">
                    <h3 className="text-sm font-semibold">Risk Indicators</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">After-Hours Activity</p>
                        <p className="text-lg font-semibold mt-1">
                          {Math.round(employeeMetrics.afterHours * 100)}%
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Risk Keywords</p>
                        <p className="text-lg font-semibold mt-1">
                          {Math.round(employeeMetrics.riskKeywords * 100)}%
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">External Contacts</p>
                        <p className="text-lg font-semibold mt-1">
                          {Math.round(employeeMetrics.externalComms * 100)}%
                        </p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Off-Channel Use</p>
                        <p className="text-lg font-semibold mt-1">
                          {Math.round(employeeMetrics.offChannel * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Communication Volume</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalMessages >= 1000 ? "High" : totalMessages >= 500 ? "Moderate" : "Low"} activity with {totalMessages.toLocaleString()} total messages
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    {person.riskLevel === "high" || person.riskLevel === "critical" ? (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">Risk Level</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {person.riskLevel === "high" || person.riskLevel === "critical"
                          ? "Elevated risk indicators detected"
                          : "Standard monitoring recommended"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Primary Channel</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {emailPercent > 50 ? "Email" : teamsPercent > 30 ? "Teams" : "Mixed channels"} - {Math.max(emailPercent, teamsPercent, smsPercent, externalPercent)}% usage
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monitored Devices</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDevices ? (
                  <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
                ) : devices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No devices found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device: MonitoredDevice) => {
                        const DeviceIcon = getDeviceIcon(device.deviceType);
                        return (
                          <TableRow key={device.id} data-testid={`row-device-${device.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{device.deviceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{device.platform || "—"}</TableCell>
                            <TableCell className="font-mono text-sm">{device.serialNumber || "—"}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${getDeviceStatusColor(device.status)}`}>{device.status}</span>
                            </TableCell>
                            <TableCell>{device.lastSyncDate ? format(new Date(device.lastSyncDate), "MMM d, yyyy h:mm a") : "Never"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enterprise Folder Access</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingFolders ? (
                  <div className="text-center py-8 text-muted-foreground">Loading folders...</div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No folder access found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>Folder Name</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Last Accessed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {folders.map((folder: FolderAccess) => {
                        const PlatformIcon = getPlatformIcon(folder.platform);
                        return (
                          <TableRow key={folder.id} data-testid={`row-folder-${folder.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PlatformIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{folder.platform}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{folder.folderPath.split('/').pop() || folder.folderPath}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{folder.folderPath}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{folder.permissions}</Badge>
                            </TableCell>
                            <TableCell>
                              {folder.lastAccessDate ? format(new Date(folder.lastAccessDate), "MMM d, yyyy") : "Never"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="volume" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Volume Timeline</CardTitle>
                <p className="text-sm text-muted-foreground">Communication data generated over the past 12 months</p>
              </CardHeader>
              <CardContent>
                {loadingVolume ? (
                  <div className="text-center py-8 text-muted-foreground">Loading data volume...</div>
                ) : volumeChartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No data volume history found</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={volumeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" label={{ value: "GB", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} name="Data Volume (GB)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Communication Network</CardTitle>
                <p className="text-sm text-muted-foreground">Top contacts by message volume</p>
              </CardHeader>
              <CardContent>
                {loadingComms ? (
                  <div className="text-center py-8 text-muted-foreground">Loading communications...</div>
                ) : topContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No communication data found</div>
                ) : (
                  <div className="space-y-3">
                    {topContacts.map((stat: any) => {
                      const MethodIcon = getMethodIcon(stat.method);
                      return (
                        <div
                          key={stat.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2"
                          data-testid={`comm-stat-${stat.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <MethodIcon className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{stat.contactName}</p>
                              <p className="text-sm text-muted-foreground">via {stat.method}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">{stat.messageCount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">messages</p>
                            </div>
                            <Link href={`/monitoring/communications/${personType}/${personId}/${stat.contactPersonType}/${stat.contactPersonId}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-messages-${stat.id}`}>
                                View
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investigations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Investigation History</CardTitle>
              </CardHeader>
              <CardContent>
                {relatedCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No related investigations found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatedCases.map((caseItem: Case) => (
                        <TableRow key={caseItem.id} data-testid={`row-case-${caseItem.id}`}>
                          <TableCell className="font-mono text-sm">{caseItem.caseNumber}</TableCell>
                          <TableCell className="font-medium">{caseItem.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{caseItem.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={caseItem.priority === "high" ? "destructive" : "default"}>{caseItem.priority}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(caseItem.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Link href={`/cases/${caseItem.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-case-${caseItem.id}`}>
                                View Case
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
