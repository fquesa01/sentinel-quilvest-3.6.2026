import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Video, 
  Search, 
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  TrendingUp,
  Shield,
  Activity,
  Globe,
  Share2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  SiLinkedin, 
  SiInstagram, 
  SiFacebook, 
  SiX, 
  SiTiktok, 
  SiYoutube, 
  SiReddit,
  SiSnapchat,
  SiWhatsapp,
  SiTelegram
} from "react-icons/si";
import { Communication } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface CommunicationStats {
  total: number;
  email: number;
  chat: number;
  sms: number;
  voice: number;
  web: number;
  social: number;
  flagged: number;
  cleared: number;
  last24h: number;
}

export default function CommunicationsPage() {
  const [selectedTab, setSelectedTab] = useState("live");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statsExpanded, setStatsExpanded] = useState(false);

  const { data: communications, isLoading: commsLoading } = useQuery<Communication[]>({
    queryKey: ["/api/communications"],
    refetchInterval: 5000, // Refresh every 5 seconds for "real-time" feel
  });

  const filteredCommunications = communications?.filter((comm) => {
    const commType = (comm.communicationType || "").toLowerCase();
    const source = (comm.sourceType || "").toLowerCase();
    
    const matchesType = typeFilter === "all" || 
      commType === typeFilter.toLowerCase() ||
      commType.includes(typeFilter.toLowerCase()) ||
      (typeFilter === "web" && source.includes("web")) ||
      (typeFilter === "social" && source.includes("social_"));
      
    const matchesSearch = 
      comm.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comm.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const stats: CommunicationStats = {
    total: communications?.length || 0,
    email: communications?.filter(c => {
      const type = (c.communicationType || "").toLowerCase();
      const source = (c.sourceType || "").toLowerCase();
      return type === "email" || type.includes("email") || source.includes("email");
    }).length || 0,
    chat: communications?.filter(c => {
      const type = (c.communicationType || "").toLowerCase();
      const source = (c.sourceType || "").toLowerCase();
      return type.includes("slack") || type.includes("teams") || type.includes("chat") || source.includes("chat");
    }).length || 0,
    sms: communications?.filter(c => {
      const type = (c.communicationType || "").toLowerCase();
      const source = (c.sourceType || "").toLowerCase();
      return type === "sms" || type.includes("sms") || source.includes("sms");
    }).length || 0,
    voice: communications?.filter(c => {
      const type = (c.communicationType || "").toLowerCase();
      return type === "voice" || type.includes("voice");
    }).length || 0,
    web: communications?.filter(c => {
      const source = (c.sourceType || "").toLowerCase();
      return source.includes("web_history") || source.includes("web");
    }).length || 0,
    social: communications?.filter(c => {
      const source = (c.sourceType || "").toLowerCase();
      return source.includes("social_");
    }).length || 0,
    flagged: communications?.filter(c => c.legalHold === "active" || c.legalHold === "pending").length || 0,
    cleared: communications?.filter(c => c.legalHold === "none").length || 0,
    last24h: communications?.filter(c => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(c.timestamp) > dayAgo;
    }).length || 0,
  };

  const getCommunicationIcon = (comm: Communication) => {
    const type = (comm.communicationType || "").toLowerCase();
    const source = (comm.sourceType || "").toLowerCase();
    
    // Social media sources
    if (source === "social_linkedin") return <SiLinkedin className="h-4 w-4" />;
    if (source === "social_instagram") return <SiInstagram className="h-4 w-4" />;
    if (source === "social_facebook") return <SiFacebook className="h-4 w-4" />;
    if (source === "social_twitter") return <SiX className="h-4 w-4" />;
    if (source === "social_tiktok") return <SiTiktok className="h-4 w-4" />;
    if (source === "social_youtube") return <SiYoutube className="h-4 w-4" />;
    if (source === "social_reddit") return <SiReddit className="h-4 w-4" />;
    if (source === "social_snapchat") return <SiSnapchat className="h-4 w-4" />;
    if (source === "social_whatsapp") return <SiWhatsapp className="h-4 w-4" />;
    if (source === "social_telegram") return <SiTelegram className="h-4 w-4" />;
    if (source === "social_other" || source.includes("social_")) return <Share2 className="h-4 w-4" />;
    
    // Web history
    if (source === "web_history" || source.includes("web")) return <Globe className="h-4 w-4" />;
    
    // Traditional sources
    if (type === "email" || source.includes("email")) return <Mail className="h-4 w-4" />;
    if (type.includes("slack") || type.includes("teams") || type.includes("chat") || source.includes("chat")) return <MessageSquare className="h-4 w-4" />;
    if (type === "sms" || source.includes("sms")) return <Phone className="h-4 w-4" />;
    if (type === "voice") return <Video className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  const getCommunicationTypeBadge = (type: string) => {
    if (type === "email") return "default";
    if (type.includes("slack") || type.includes("teams")) return "secondary";
    if (type === "sms") return "outline";
    return "default";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-6 border-b border-border stagger-1">
        <Collapsible open={statsExpanded} onOpenChange={setStatsExpanded}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-communications">
                Real-Time Communications Monitoring
              </h1>
              {statsExpanded && (
                <p className="text-muted-foreground mt-1">
                  Monitor email, chat, SMS, voice, web history, and social media communications in real-time across all integrated platforms
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3 animate-pulse text-green-600" />
                Live
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-toggle-stats">
                  {statsExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide Stats
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show Stats
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-4 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-email">{stats.email}</div>
              <p className="text-xs text-muted-foreground">Messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-chat">{stats.chat}</div>
              <p className="text-xs text-muted-foreground">Messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SMS</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-sms">{stats.sms}</div>
              <p className="text-xs text-muted-foreground">Messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voice</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-voice">{stats.voice}</div>
              <p className="text-xs text-muted-foreground">Recordings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Web</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-web">{stats.web}</div>
              <p className="text-xs text-muted-foreground">History</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Social</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-social">{stats.social}</div>
              <p className="text-xs text-muted-foreground">Posts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24h</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-last24h">{stats.last24h}</div>
              <p className="text-xs text-muted-foreground">Recent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-flagged">{stats.flagged}</div>
              <p className="text-xs text-muted-foreground">Violations</p>
            </CardContent>
          </Card>
        </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start" data-testid="tabs-communications">
            <TabsTrigger value="live" data-testid="tab-live">
              <Radio className="h-4 w-4 mr-2" />
              Live Feed
            </TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search">
              <Search className="h-4 w-4 mr-2" />
              Search & Filter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="flex-1 overflow-auto mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Communication Stream</CardTitle>
                <CardDescription>
                  Real-time feed of monitored communications across all channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {commsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading communications...</div>
                  </div>
                ) : filteredCommunications && filteredCommunications.length > 0 ? (
                  filteredCommunications
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 50)
                    .map((comm) => (
                      <Link key={comm.id} href={`/communications/${comm.id}`}>
                        <Card className="hover-elevate cursor-pointer" data-testid={`comm-${comm.id}`}>
                          <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getCommunicationIcon(comm)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{comm.subject}</CardTitle>
                                  <Badge variant={getCommunicationTypeBadge(comm.communicationType)}>
                                    {comm.communicationType}
                                  </Badge>
                                  {comm.legalHold === "active" && (
                                    <Badge variant="destructive">Legal Hold</Badge>
                                  )}
                                </div>
                                <CardDescription className="mt-1">
                                  From: <strong>{comm.sender}</strong> •{" "}
                                  {formatDistanceToNow(new Date(comm.timestamp), { addSuffix: true })}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {comm.legalHold === "active" ? (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm line-clamp-2">{comm.body}</p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Recipients: {Array.isArray(comm.recipients) ? comm.recipients.length : 1}
                            </span>
                            {comm.sourceType && (
                              <Badge variant="outline" className="text-xs">
                                {comm.sourceType}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      </Link>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No communications yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Communications will appear here as they are monitored in real-time
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="flex-1 overflow-auto mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Search & Filter Communications</CardTitle>
                <CardDescription>
                  Filter and search through monitored communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by subject, sender, or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-communications"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48" data-testid="select-type-filter">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                      <SelectItem value="teams">Teams</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="voice">Voice</SelectItem>
                      <SelectItem value="web">Web History</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {commsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-muted-foreground">Loading communications...</div>
                    </div>
                  ) : filteredCommunications && filteredCommunications.length > 0 ? (
                    filteredCommunications.map((comm) => (
                      <Card key={comm.id} className="hover-elevate">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getCommunicationIcon(comm)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{comm.subject}</CardTitle>
                                  <Badge variant={getCommunicationTypeBadge(comm.communicationType)}>
                                    {comm.communicationType}
                                  </Badge>
                                </div>
                                <CardDescription className="mt-1">
                                  From: <strong>{comm.sender}</strong> •{" "}
                                  {formatDistanceToNow(new Date(comm.timestamp), { addSuffix: true })}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{comm.body}</p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No results found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
