import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  LayoutDashboard, 
  Bookmark, 
  History, 
  Search, 
  FileText, 
  MessageSquare, 
  Clock, 
  ChevronRight,
  Star,
  Pin,
  Trash2,
  ExternalLink,
  Folder,
  Play,
  Filter,
  AlertTriangle,
  CheckCircle,
  Flag,
  MoreHorizontal,
  Sparkles,
  Brain,
  TrendingUp,
  Users,
  RefreshCw,
  Lightbulb,
  Target,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Bookmark as BookmarkType, UserActivity, SavedSearch, Case } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MyQueue() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bookmarkFilter, setBookmarkFilter] = useState<string>("all");

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<BookmarkType[]>({
    queryKey: ["/api/bookmarks", undefined],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ["/api/user-activity"],
  });

  const { data: savedSearches, isLoading: searchesLoading } = useQuery<SavedSearch[]>({
    queryKey: ["/api/saved-searches", undefined],
  });

  // AI Intelligence Features
  const { data: aiDigest, isLoading: digestLoading, refetch: refetchDigest } = useQuery<{
    summary: string;
    caseDigests: Array<{
      caseId: string;
      caseName: string;
      caseNumber: string;
      status: string;
      newDocuments: number;
      newChats: number;
      alertCount: number;
      criticalAlerts: number;
      summary: string;
      hasActivity: boolean;
    }>;
    inactiveCases: Array<{ caseId: string; caseName: string }>;
    generatedAt: string;
    stats: {
      totalDocuments: number;
      totalAlerts: number;
      criticalAlerts: number;
      activeCases: number;
    };
  }>({
    queryKey: ["/api/ai/smart-digest", undefined],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: aiInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<{
    insights: Array<{
      id: string;
      type: string;
      icon: string;
      title: string;
      description: string;
      actionLabel: string;
      actionUrl: string;
      count: number;
    }>;
    aiRecommendation: string;
    stats: {
      total: number;
      critical: number;
      high: number;
      pending: number;
      reviewed: number;
    };
    generatedAt: string;
  }>({
    queryKey: ["/api/ai/insights", undefined],
    staleTime: 5 * 60 * 1000,
  });

  const { data: attentionRadar, isLoading: radarLoading, refetch: refetchRadar } = useQuery<{
    teamActivity: Array<{
      userId: string;
      userName: string;
      role: string;
      activityScore: number;
      documentViews: number;
      chatViews: number;
      searches: number;
      activeCases: number;
      lastActive: string | null;
      isActive: boolean;
    }>;
    documentsNeedingAttention: Array<{
      alertId: string;
      communicationId: string;
      severity: string;
      violationType: string;
      createdAt: string;
      ageInHours: number;
    }>;
    metrics: {
      activeTeamMembers: number;
      totalTeamMembers: number;
      totalDocumentViews: number;
      avgActivityScore: number;
      pendingCriticalItems: number;
    };
    generatedAt: string;
  }>({
    queryKey: ["/api/ai/attention-radar", undefined],
    staleTime: 5 * 60 * 1000,
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bookmarks/${id}`);
    },
    onSuccess: () => {
      // Invalidate and immediately refetch all bookmark queries
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"], refetchType: 'all' });
      toast({ title: "Bookmark removed" });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      await apiRequest("PATCH", `/api/bookmarks/${id}`, { isPinned: !isPinned });
    },
    onSuccess: () => {
      // Invalidate and immediately refetch all bookmark queries
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"], refetchType: 'all' });
    },
  });

  const handleBookmarkClick = (bookmark: BookmarkType) => {
    if (!bookmark.caseId) {
      toast({
        title: "Cannot navigate",
        description: "This bookmark is not associated with a case",
        variant: "destructive",
      });
      return;
    }
    
    if (bookmark.bookmarkType === "chat_message" && bookmark.chatMessageId) {
      setLocation(`/cases/${bookmark.caseId}/chat-review?id=${bookmark.chatMessageId}`);
    } else if (bookmark.communicationId) {
      setLocation(`/cases/${bookmark.caseId}/document-review?id=${bookmark.communicationId}`);
    } else {
      setLocation(`/cases/${bookmark.caseId}/document-review`);
    }
  };

  const getBookmarkIcon = (type: string) => {
    switch (type) {
      case "document":
      case "page":
      case "paragraph":
      case "quote":
        return <FileText className="h-4 w-4" />;
      case "chat_message":
        return <MessageSquare className="h-4 w-4" />;
      case "audio_timestamp":
      case "video_timestamp":
        return <Play className="h-4 w-4" />;
      default:
        return <Bookmark className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "document_view":
        return <FileText className="h-4 w-4" />;
      case "chat_view":
        return <MessageSquare className="h-4 w-4" />;
      case "search":
        return <Search className="h-4 w-4" />;
      case "case_view":
        return <Folder className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getColorClass = (color: string | null) => {
    switch (color) {
      case "red": return "bg-red-500/20 text-red-600 dark:text-red-400";
      case "yellow": return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "green": return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "purple": return "bg-purple-500/20 text-purple-600 dark:text-purple-400";
      case "orange": return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
      default: return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
    }
  };

  const filteredBookmarks = bookmarks?.filter(b => {
    if (bookmarkFilter === "all") return true;
    if (bookmarkFilter === "pinned") return b.isPinned;
    return b.bookmarkType === bookmarkFilter;
  }) || [];


  const renderPageHeader = () => (
    <div className="border-b p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">My Queue</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Your personal command center for case work
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPageContent = () => (
    <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">Continue Where You Left Off</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Resume your recent work</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {activityLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-sm text-muted-foreground">Loading...</p>
                      </div>
                    ) : !recentActivity || recentActivity.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Clock className="h-8 w-8 mb-2" />
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs">Your recently viewed items will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentActivity.slice(0, 5).map((activity) => (
                          <div
                            key={activity.id}
                            onClick={() => setLocation(activity.url)}
                            className="flex items-center justify-between p-3 rounded-lg hover-elevate bg-muted/50 cursor-pointer"
                            data-testid={`activity-${activity.id}`}
                          >
                            <div className="flex items-center gap-3">
                              {getActivityIcon(activity.activityType)}
                              <div>
                                <p className="font-medium text-sm truncate max-w-[200px]">{activity.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {activity.subtitle || formatDistanceToNow(new Date(activity.accessedAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-lg">Bookmarks</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={bookmarkFilter} onValueChange={setBookmarkFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-bookmark-filter">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bookmarks</SelectItem>
                        <SelectItem value="pinned">Pinned</SelectItem>
                        <SelectItem value="document">Documents</SelectItem>
                        <SelectItem value="page">Pages</SelectItem>
                        <SelectItem value="paragraph">Paragraphs</SelectItem>
                        <SelectItem value="chat_message">Chat Messages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription>Quick access to important content you've saved</CardDescription>
              </CardHeader>
              <CardContent>
                {bookmarksLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">Loading bookmarks...</p>
                  </div>
                ) : filteredBookmarks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Bookmark className="h-8 w-8 mb-2" />
                    <p className="text-sm">No bookmarks yet</p>
                    <p className="text-xs">Bookmark important documents and passages while reviewing</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredBookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className={`relative p-3 rounded-lg border hover-elevate cursor-pointer ${bookmark.isPinned ? 'ring-1 ring-primary/30' : ''}`}
                        data-testid={`bookmark-${bookmark.id}`}
                        onClick={() => handleBookmarkClick(bookmark)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <div className={`p-1.5 rounded ${getColorClass(bookmark.color)}`}>
                              {getBookmarkIcon(bookmark.bookmarkType)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{bookmark.title}</p>
                              {bookmark.excerpt && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  "{bookmark.excerpt}"
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {bookmark.bookmarkType.replace("_", " ")}
                                </Badge>
                                {bookmark.isPinned && (
                                  <Pin className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => togglePinMutation.mutate({ id: bookmark.id, isPinned: !!bookmark.isPinned })}
                              >
                                <Pin className="h-4 w-4 mr-2" />
                                {bookmark.isPinned ? "Unpin" : "Pin to top"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteBookmarkMutation.mutate(bookmark.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-lg">Saved Searches</CardTitle>
                  </div>
                </div>
                <CardDescription>Quickly re-run your saved search queries</CardDescription>
              </CardHeader>
              <CardContent>
                {searchesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">Loading saved searches...</p>
                  </div>
                ) : !savedSearches || savedSearches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Search className="h-8 w-8 mb-2" />
                    <p className="text-sm">No saved searches</p>
                    <p className="text-xs">Save your frequently used search queries in Document Review</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {savedSearches.slice(0, 6).map((search) => (
                      <Link
                        key={search.id}
                        href={`/document-review?savedSearchId=${search.id}`}
                        className="block"
                      >
                        <div
                          className="p-3 rounded-lg border hover-elevate cursor-pointer"
                          data-testid={`saved-search-${search.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <Search className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{search.searchName}</p>
                              {search.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {search.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {search.resultCount || 0} results
                                </Badge>
                                {search.lastRunAt && (
                                  <span>
                                    Last run {formatDistanceToNow(new Date(search.lastRunAt), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                              <Play className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {savedSearches && savedSearches.length > 6 && (
                  <div className="mt-4 text-center">
                    <Link href="/document-review">
                      <Button variant="outline" size="sm">
                        View all {savedSearches.length} saved searches
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-ai-intelligence">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-violet-500" />
                    <CardTitle className="text-lg">AI Intelligence Hub</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      refetchDigest();
                      refetchInsights();
                      refetchRadar();
                      toast({ title: "Refreshing AI insights..." });
                    }}
                    data-testid="button-refresh-ai"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <CardDescription>AI-powered insights and team activity analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="digest" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="digest" data-testid="tab-ai-digest">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Smart Digest
                    </TabsTrigger>
                    <TabsTrigger value="insights" data-testid="tab-ai-insights">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Insights
                    </TabsTrigger>
                    <TabsTrigger value="radar" data-testid="tab-ai-radar">
                      <Activity className="h-4 w-4 mr-2" />
                      Team Radar
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="digest" className="mt-4">
                    {digestLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Generating digest...</span>
                      </div>
                    ) : aiDigest ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
                          <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-violet-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">Daily Summary</p>
                              <p className="text-sm text-muted-foreground mt-1">{aiDigest.summary}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Generated {formatDistanceToNow(new Date(aiDigest.generatedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {aiDigest.stats && (
                          <div className="grid grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{aiDigest.stats.activeCases}</p>
                              <p className="text-xs text-muted-foreground">Active Cases</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{aiDigest.stats.totalDocuments}</p>
                              <p className="text-xs text-muted-foreground">New Docs</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{aiDigest.stats.totalAlerts}</p>
                              <p className="text-xs text-muted-foreground">Total Alerts</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold text-red-500">{aiDigest.stats.criticalAlerts}</p>
                              <p className="text-xs text-muted-foreground">Critical</p>
                            </div>
                          </div>
                        )}

                        {aiDigest.caseDigests && aiDigest.caseDigests.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Case Activity</h4>
                            {aiDigest.caseDigests.map((digest) => (
                              <Link
                                key={digest.caseId}
                                href={`/cases/${digest.caseId}`}
                                className="block"
                              >
                                <div 
                                  className="p-3 rounded-lg border hover-elevate cursor-pointer"
                                  data-testid={`digest-case-${digest.caseId}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm truncate">{digest.caseName}</p>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {digest.caseNumber}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {digest.summary}
                                      </p>
                                      <div className="flex items-center gap-3 mt-2">
                                        {digest.newDocuments > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            <FileText className="h-3 w-3 mr-1" />
                                            {digest.newDocuments} docs
                                          </Badge>
                                        )}
                                        {digest.newChats > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            <MessageSquare className="h-3 w-3 mr-1" />
                                            {digest.newChats} chats
                                          </Badge>
                                        )}
                                        {digest.criticalAlerts > 0 && (
                                          <Badge variant="destructive" className="text-xs">
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            {digest.criticalAlerts} critical
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {(!aiDigest.caseDigests || aiDigest.caseDigests.length === 0) && (
                          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm">No new activity in the last 24 hours</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mb-2" />
                        <p className="text-sm">Unable to generate digest</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="insights" className="mt-4">
                    {insightsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Analyzing alerts...</span>
                      </div>
                    ) : aiInsights ? (
                      <div className="space-y-4">
                        {aiInsights.aiRecommendation && (
                          <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                              <div>
                                <p className="font-medium text-sm">AI Recommendation</p>
                                <p className="text-sm text-muted-foreground mt-1">{aiInsights.aiRecommendation}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {aiInsights.stats && (
                          <div className="grid grid-cols-5 gap-3">
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-xl font-bold">{aiInsights.stats.total}</p>
                              <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-xl font-bold text-red-500">{aiInsights.stats.critical}</p>
                              <p className="text-xs text-muted-foreground">Critical</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-xl font-bold text-orange-500">{aiInsights.stats.high}</p>
                              <p className="text-xs text-muted-foreground">High</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-xl font-bold text-yellow-500">{aiInsights.stats.pending}</p>
                              <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-xl font-bold text-green-500">{aiInsights.stats.reviewed}</p>
                              <p className="text-xs text-muted-foreground">Reviewed</p>
                            </div>
                          </div>
                        )}

                        {aiInsights.insights && aiInsights.insights.length > 0 ? (
                          <div className="space-y-3">
                            {aiInsights.insights.map((insight) => (
                              <Link
                                key={insight.id}
                                href={insight.actionUrl}
                                className="block"
                              >
                                <div 
                                  className={`p-3 rounded-lg border hover-elevate cursor-pointer ${
                                    insight.type === 'critical' ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30' :
                                    insight.type === 'warning' ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30' :
                                    ''
                                  }`}
                                  data-testid={`insight-${insight.id}`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                      {insight.type === 'critical' ? (
                                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                      ) : insight.type === 'warning' ? (
                                        <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                                      ) : (
                                        <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                                      )}
                                      <div>
                                        <p className="font-medium text-sm">{insight.title}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Badge variant="outline">{insight.count}</Badge>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mb-2" />
                            <p className="text-sm">No actionable insights at this time</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Lightbulb className="h-8 w-8 mb-2" />
                        <p className="text-sm">Unable to generate insights</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="radar" className="mt-4">
                    {radarLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Analyzing team activity...</span>
                      </div>
                    ) : attentionRadar ? (
                      <div className="space-y-4">
                        {attentionRadar.metrics && (
                          <div className="grid grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{attentionRadar.metrics.activeTeamMembers}</p>
                              <p className="text-xs text-muted-foreground">Active Members</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{attentionRadar.metrics.totalDocumentViews}</p>
                              <p className="text-xs text-muted-foreground">Doc Views (7d)</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold">{attentionRadar.metrics.avgActivityScore}</p>
                              <p className="text-xs text-muted-foreground">Avg Activity</p>
                            </div>
                            <div className="p-3 rounded-lg border text-center">
                              <p className="text-2xl font-bold text-red-500">{attentionRadar.metrics.pendingCriticalItems}</p>
                              <p className="text-xs text-muted-foreground">Needs Attention</p>
                            </div>
                          </div>
                        )}

                        {attentionRadar.documentsNeedingAttention && attentionRadar.documentsNeedingAttention.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Target className="h-4 w-4 text-red-500" />
                              Documents Needing Attention
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {attentionRadar.documentsNeedingAttention.slice(0, 6).map((doc) => (
                                <Link
                                  key={doc.alertId}
                                  href={`/alerts`}
                                  className="block"
                                >
                                  <div 
                                    className="p-2 rounded-lg border hover-elevate cursor-pointer"
                                    data-testid={`attention-doc-${doc.alertId}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Badge 
                                          variant={doc.severity === 'critical' ? 'destructive' : 'secondary'}
                                          className="text-xs shrink-0"
                                        >
                                          {doc.severity}
                                        </Badge>
                                        <span className="text-sm truncate">
                                          {doc.violationType.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {doc.ageInHours}h ago
                                      </span>
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {attentionRadar.teamActivity && attentionRadar.teamActivity.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Users className="h-4 w-4 text-blue-500" />
                              Team Activity (Last 7 Days)
                            </h4>
                            <div className="space-y-2">
                              {attentionRadar.teamActivity.slice(0, 5).map((member) => (
                                <div 
                                  key={member.userId}
                                  className="flex items-center gap-3 p-2 rounded-lg border"
                                  data-testid={`team-member-${member.userId}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate">{member.userName}</span>
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {member.role?.replace(/_/g, ' ') || 'User'}
                                      </Badge>
                                      {member.isActive && (
                                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                      <span>{member.documentViews} docs</span>
                                      <span>{member.chatViews} chats</span>
                                      <span>{member.searches} searches</span>
                                      <span>{member.activeCases} cases</span>
                                    </div>
                                  </div>
                                  <div className="w-24 shrink-0">
                                    <Progress value={Math.min((member.activityScore / 50) * 100, 100)} className="h-2" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!attentionRadar.teamActivity || attentionRadar.teamActivity.length === 0) && (
                          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                            <Users className="h-8 w-8 mb-2" />
                            <p className="text-sm">No team activity data available</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <Activity className="h-8 w-8 mb-2" />
                        <p className="text-sm">Unable to load team radar</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
    </ScrollArea>
  );

  return (
    <div className="flex flex-col h-screen">
      {renderPageHeader()}
      {renderPageContent()}
    </div>
  );
}
