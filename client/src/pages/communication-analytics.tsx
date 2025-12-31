import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Mail, MessageSquare, ArrowUp, ArrowDown, Paperclip, Users, Activity, TrendingUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface CommunicationSummary {
  participantId: string;
  displayName: string | null;
  channels: string[];
  sentCount: number;
  receivedCount: number;
  totalCount: number;
  percentOfTotal: number;
  firstActivityAt: Date | null;
  lastActivityAt: Date | null;
}

interface MatrixCell {
  total: number;
  email: number;
  chat: number;
}

interface CommunicationMatrix {
  participants: Array<{ id: string; displayName: string | null }>;
  matrix: MatrixCell[][];
  maxTotal: number;
}

interface TimelineEvent {
  id: string;
  channelType: "email" | "chat";
  channelSubtype: string;
  sentAt: string;
  senderDisplay: string;
  recipientsDisplay: string[];
  subjectOrPreview: string;
  hasAttachments: boolean;
  direction: "inbound" | "outbound" | "unknown";
}

export default function CommunicationAnalytics() {
  const [minMessages, setMinMessages] = useState<number>(1);
  const [channelFilter, setChannelFilter] = useState<"all" | "email" | "chat">("all");
  const [topN, setTopN] = useState<number>(10);

  const { data: summary, isLoading: summaryLoading } = useQuery<CommunicationSummary[]>({
    queryKey: ["/api/analytics/communication-summary", { min_messages: minMessages }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/communication-summary?min_messages=${minMessages}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: matrix, isLoading: matrixLoading } = useQuery<CommunicationMatrix>({
    queryKey: ["/api/analytics/communication-matrix", { top_n: topN }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/communication-matrix?top_n=${topN}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/analytics/timeline", { channel_type: channelFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/timeline?channel_type=${channelFilter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  const totalMessages = summary?.reduce((sum, p) => sum + p.totalCount, 0) || 0;
  const totalParticipants = summary?.length || 0;
  const uniqueChannels = new Set(summary?.flatMap(p => p.channels) || []).size;
  const lastActivity = summary?.reduce((latest, p) => {
    if (!p.lastActivityAt) return latest;
    const date = new Date(p.lastActivityAt);
    return !latest || date > latest ? date : latest;
  }, null as Date | null);

  const topCommunicators = summary?.slice(0, topN).map(p => ({
    name: p.displayName || p.participantId.substring(0, 30),
    total: p.totalCount,
    sent: p.sentCount,
    received: p.receivedCount,
  })) || [];

  const channelColors: Record<string, string> = {
    email: "hsl(var(--chart-1))",
    whatsapp: "hsl(var(--chart-2))",
    sms_ios: "hsl(var(--chart-3))",
    sms_android: "hsl(var(--chart-4))",
    chat: "hsl(var(--chart-5))",
  };

  const getChannelBadgeVariant = (channelSubtype: string) => {
    switch (channelSubtype) {
      case "email": return "default";
      case "whatsapp": return "secondary";
      case "sms_ios": return "outline";
      case "sms_android": return "outline";
      default: return "secondary";
    }
  };

  const getChannelIcon = (channelSubtype: string) => {
    switch (channelSubtype) {
      case "email": return <Mail className="h-3 w-3" />;
      case "whatsapp":
      case "sms_ios":
      case "sms_android":
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getChannelLabel = (channelSubtype: string) => {
    switch (channelSubtype) {
      case "email": return "Email";
      case "whatsapp": return "WhatsApp";
      case "sms_ios": return "iOS SMS";
      case "sms_android": return "Android SMS";
      default: return "Chat";
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="heading-analytics">Communication Analytics</h2>
          <p className="text-muted-foreground">
            Unified analytics across email and chat communications
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Channel Filter:</label>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as any)}>
            <SelectTrigger className="w-[180px]" data-testid="select-channel-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email Only</SelectItem>
              <SelectItem value="chat">Chat Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Min Messages:</label>
          <Select value={minMessages.toString()} onValueChange={(v) => setMinMessages(parseInt(v, 10))}>
            <SelectTrigger className="w-[120px]" data-testid="select-min-messages">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
              <SelectItem value="10">10+</SelectItem>
              <SelectItem value="25">25+</SelectItem>
              <SelectItem value="50">50+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Top Participants:</label>
          <Select value={topN.toString()} onValueChange={(v) => setTopN(parseInt(v, 10))}>
            <SelectTrigger className="w-[120px]" data-testid="select-top-n">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="15">Top 15</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-messages">{totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all channels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-participants">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              Unique communicators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Channels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-channels">{uniqueChannels}</div>
            <p className="text-xs text-muted-foreground">
              Communication types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-last-activity">
              {lastActivity ? format(lastActivity, "MMM d") : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent message
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Communicators</CardTitle>
            <CardDescription>Most active participants by message count</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : topCommunicators.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCommunicators} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={4}>
                    {topCommunicators.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={channelColors.email} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Heatmap</CardTitle>
            <CardDescription>Pairwise communication patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {matrixLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : matrix && matrix.participants.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: `auto repeat(${matrix.participants.length}, 1fr)`,
                  fontSize: "10px"
                }}>
                  <div></div>
                  {matrix.participants.map((p, i) => (
                    <div key={i} className="text-center font-medium p-1 truncate" title={p.displayName || p.id}>
                      {(p.displayName || p.id).substring(0, 10)}
                    </div>
                  ))}
                  
                  {matrix.participants.map((sender, rowIdx) => (
                    <>
                      <div key={`row-${rowIdx}`} className="font-medium p-1 truncate" title={sender.displayName || sender.id}>
                        {(sender.displayName || sender.id).substring(0, 10)}
                      </div>
                      {matrix.matrix[rowIdx].map((cell, colIdx) => {
                        const opacity = matrix.maxTotal > 0 ? cell.total / matrix.maxTotal : 0;
                        return (
                          <div
                            key={`cell-${rowIdx}-${colIdx}`}
                            className="border p-1 text-center rounded"
                            style={{
                              backgroundColor: `hsl(var(--primary) / ${opacity * 0.8})`,
                              minHeight: "30px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title={`${sender.displayName || sender.id} → ${matrix.participants[colIdx].displayName || matrix.participants[colIdx].id}: ${cell.total} total (${cell.email} email, ${cell.chat} chat)`}
                          >
                            {cell.total > 0 ? cell.total : ""}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Timeline</CardTitle>
          <CardDescription>Unified view of all communications</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Loading timeline...</p>
            </div>
          ) : timeline && timeline.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {timeline.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                    data-testid={`timeline-event-${event.id}`}
                  >
                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className="text-xs font-medium">
                        {format(new Date(event.sentAt), "MMM d")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(event.sentAt), "HH:mm")}
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getChannelBadgeVariant(event.channelSubtype)} className="gap-1">
                          {getChannelIcon(event.channelSubtype)}
                          {getChannelLabel(event.channelSubtype)}
                        </Badge>
                        
                        {event.direction !== "unknown" && (
                          <Badge variant="outline" className="gap-1">
                            {event.direction === "inbound" ? (
                              <>
                                <ArrowDown className="h-3 w-3" />
                                In
                              </>
                            ) : (
                              <>
                                <ArrowUp className="h-3 w-3" />
                                Out
                              </>
                            )}
                          </Badge>
                        )}
                        
                        {event.hasAttachments && (
                          <Badge variant="outline" className="gap-1">
                            <Paperclip className="h-3 w-3" />
                            Attachment
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">{event.senderDisplay}</span>
                        {event.recipientsDisplay.length > 0 && (
                          <>
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-muted-foreground">
                              {event.recipientsDisplay.slice(0, 3).join(", ")}
                              {event.recipientsDisplay.length > 3 && ` +${event.recipientsDisplay.length - 3} more`}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.subjectOrPreview}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No communications found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
