import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  Home,
  Shield,
  Users,
  GraduationCap,
  Scale,
  Radio,
  TrendingUp,
  FileSearch,
  Folder,
  Database,
  Eye,
  Settings,
  ClipboardList,
  Flag,
  Mail,
  MailPlus,
  Siren,
  Briefcase,
  Upload,
  Package,
  ChevronDown,
  Activity,
  UserCog,
  Brain,
  MessageSquare,
  Flame,
  Handshake,
  FileStack,
  Lock,
  CheckSquare,
  FileScan,
  HelpCircle,
  LineChart,
  Search,
  FileCheck,
  Mic,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvaChat } from "@/components/ava-chat";
import { useQuery } from "@tanstack/react-query";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
  showBadge?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Extract current case ID from URL if viewing a case (e.g., /cases/abc-123)
  const currentCaseId = location.match(/^\/cases\/([^/?]+)/)?.[1] || null;

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: !!user && ["admin", "compliance_officer", "attorney", "external_counsel", "auditor"].includes(user.role || ""),
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count || 0;

  // Track which sections are expanded
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "intake": true,
    "investigations": true,
    "business": true,
    "discovery": true,
    "analytics": true,
    "knowledge": true,
    "administration": false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Menu sections - Clients pinned first, then Litigation
  const menuSections: MenuSection[] = [
    {
      title: "Clients",
      defaultOpen: true,
      items: [
        {
          title: "All Clients",
          url: "/clients",
          icon: Building2,
          roles: ["admin", "compliance_officer", "attorney", "external_counsel"],
        },
        {
          title: "Client Intelligence",
          url: "/business-intelligence",
          icon: Briefcase,
          roles: ["admin", "attorney", "external_counsel", "auditor"],
        },
      ],
    },
    {
      title: "Litigation",
      defaultOpen: true,
      items: [
        {
          title: "Cases",
          url: "/cases",
          icon: Folder,
          roles: ["admin", "compliance_officer", "attorney", "auditor"],
        },
        {
          title: "Interviews",
          url: "/interviews",
          icon: Calendar,
          roles: ["admin", "compliance_officer", "attorney"],
        },
        {
          title: "Forms & Templates",
          url: "/litigation-templates",
          icon: FileText,
          roles: ["admin", "compliance_officer", "attorney", "external_counsel"],
        },
        {
          title: "Document Sets",
          url: "/document-sets",
          icon: Folder,
          roles: ["admin", "attorney", "compliance_officer", "external_counsel", "auditor"],
        },
      ],
    },
    {
      title: "Transactions",
      defaultOpen: true,
      items: [
        {
          title: "Transaction List",
          url: "/transactions/deals",
          icon: Handshake,
          roles: ["admin", "attorney", "external_counsel"],
        },
        {
          title: "Deal Templates",
          url: "/transactions/templates",
          icon: FileStack,
          roles: ["admin", "attorney", "external_counsel"],
        },
        {
          title: "Request Lists (DRL)",
          url: "/transactions/request-lists",
          icon: ClipboardList,
          roles: ["admin", "attorney", "external_counsel"],
        },
        {
          title: "Data Rooms",
          url: "/transactions/data-rooms",
          icon: Database,
          roles: ["admin", "attorney", "external_counsel", "compliance_officer"],
        },
        {
          title: "Deal Pipeline",
          url: "/pe/deals",
          icon: TrendingUp,
          roles: ["admin", "attorney", "external_counsel"],
        },
        {
          title: "Due Diligence Reports",
          url: "/pe/deal-intelligence",
          icon: FileScan,
          roles: ["admin", "attorney", "external_counsel"],
        },
      ],
    },
    {
      title: "Discovery & Productions",
      defaultOpen: true,
      items: [
        {
          title: "Doc Review",
          url: "/document-review",
          icon: Eye,
          roles: ["admin", "attorney", "compliance_officer"],
        },
        {
          title: "Sharing Documents",
          url: "/ediscovery",
          icon: FileSearch,
          roles: ["admin", "attorney", "compliance_officer"],
        },
        {
          title: "Discovery Reports",
          url: "/reports/discovery",
          icon: FileText,
          roles: ["admin", "attorney", "compliance_officer", "external_counsel", "auditor"],
        },
        {
          title: "Privilege Review",
          url: "/privilege-review",
          icon: Shield,
          roles: ["admin", "attorney", "external_counsel"],
        },
        {
          title: "Privilege Log",
          url: "/privilege-log",
          icon: Scale,
          roles: ["admin", "attorney", "external_counsel", "compliance_officer"],
        },
      ],
    },
    {
      title: "Analytics & Intelligence",
      defaultOpen: true,
      items: [
        {
          title: "Communication Analytics",
          url: "/communication-analytics",
          icon: BarChart3,
          roles: ["admin", "compliance_officer", "attorney", "auditor"],
        },
        {
          title: "Issue Heatmap",
          url: "/issue-heatmap",
          icon: Flame,
          roles: ["admin", "compliance_officer", "attorney", "auditor"],
        },
        {
          title: "Executive Analytics",
          url: "/executive-analytics",
          icon: TrendingUp,
          roles: ["admin", "compliance_officer"],
        },
        {
          title: "Management Analytics",
          url: "/management-analytics",
          icon: Brain,
          roles: ["admin"],
        },
      ],
    },
    {
      title: "Knowledge Center",
      defaultOpen: true,
      items: [
        {
          title: "Knowledge Base",
          url: "/knowledge-base",
          icon: BookOpen,
          roles: ["admin", "compliance_officer", "attorney", "auditor"],
        },
      ],
    },
    {
      title: "Administration",
      defaultOpen: false,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
          roles: ["admin", "compliance_officer", "attorney", "auditor", "employee", "vendor"],
        },
                {
          title: "Admin Dashboard",
          url: "/admin",
          icon: Settings,
          roles: ["admin", "compliance_officer"],
        },
        {
          title: "User Management",
          url: "/users",
          icon: Users,
          roles: ["admin"],
        },
                {
          title: "Role Management",
          url: "/roles",
          icon: UserCog,
          roles: ["admin"],
        },
      ],
    },
  ];

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const filterItemsByRole = (items: MenuItem[]) => {
    // During auth loading, hide all items to prevent showing admin-only sections
    if (!user || !user.role) return [];
    return items.filter(item => item.roles.includes(user.role));
  };

  const renderMenuItem = (item: MenuItem) => {
    // Modify URL for case-scoped pages when viewing a case
    let itemUrl = item.url;
    if (currentCaseId && item.url === "/document-review") {
      itemUrl = `/cases/${currentCaseId}/document-review`;
    }
    if (currentCaseId && item.url === "/interviews") {
      itemUrl = `/interviews?caseId=${currentCaseId}`;
    }
    if (currentCaseId && item.url === "/chat-review") {
      itemUrl = `/cases/${currentCaseId}/chat-review`;
    }
    if (currentCaseId && item.url === "/issue-heatmap") {
      itemUrl = `/cases/${currentCaseId}/issue-heatmap`;
    }
    
    const isActive = location === item.url || location.startsWith(item.url + "?");
    const showBadge = item.showBadge && item.title === "Mailbox" && unreadCount > 0;

    const linkContent = (
      <Link
        href={itemUrl}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
        }`}
        data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
        {showBadge && (
          <Badge
            variant="destructive"
            className="ml-auto text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center group-data-[collapsible=icon]:hidden"
            data-testid="badge-unread-mailbox"
          >
            {unreadCount}
          </Badge>
        )}
      </Link>
    );

    return (
      <SidebarMenuItem key={item.title}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {linkContent}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {item.title}
            </TooltipContent>
          </Tooltip>
        ) : (
          linkContent
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Shield className="h-6 w-6 text-sidebar-primary flex-shrink-0 cursor-pointer" data-testid="icon-logo" />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Sentinel Counsel LLP</TooltipContent>
            </Tooltip>
          ) : (
            <Shield className="h-6 w-6 text-sidebar-primary flex-shrink-0" data-testid="icon-logo" />
          )}
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight uppercase" data-testid="text-app-name">
              Sentinel
            </span>
            <span className="text-xs tracking-wider text-sidebar-foreground/70" data-testid="text-app-subtitle">
              COUNSEL LLP
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* Pinned Emma section - always at very top */}
        <SidebarGroup className="py-2 px-3">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full"><AvaChat /></div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Speak to Navigate or Create</TooltipContent>
            </Tooltip>
          ) : (
            <div className="w-full"><AvaChat /></div>
          )}
        </SidebarGroup>
        {/* Pinned My Queue section - always at top */}
        {user && ["admin", "attorney", "external_counsel"].includes(user.role || "") && (
          <SidebarGroup className="py-2">
            <SidebarMenu>
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/my-queue"
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                          location === "/my-queue" || location.startsWith("/my-queue?")
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground"
                        }`}
                        data-testid="link-nav-my-queue"
                      >
                        <Scale className="h-4 w-4 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">My Queue</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>My Queue</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    href="/my-queue"
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                      location === "/my-queue" || location.startsWith("/my-queue?")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground"
                    }`}
                    data-testid="link-nav-my-queue"
                  >
                    <Scale className="h-4 w-4 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">My Queue</span>
                  </Link>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/ambient-intelligence"
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                          location === "/ambient-intelligence" || location.startsWith("/ambient-intelligence/")
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground"
                        }`}
                        data-testid="link-nav-ambient-intelligence"
                      >
                        <Mic className="h-4 w-4 flex-shrink-0 ambient-nav-icon" />
                        <span className="group-data-[collapsible=icon]:hidden">Ambient Intelligence</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Ambient Intelligence</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    href="/ambient-intelligence"
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                      location === "/ambient-intelligence" || location.startsWith("/ambient-intelligence/")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground"
                    }`}
                    data-testid="link-nav-ambient-intelligence"
                  >
                    <Mic className="h-4 w-4 flex-shrink-0 ambient-nav-icon" />
                    <span className="group-data-[collapsible=icon]:hidden">Ambient Intelligence</span>
                  </Link>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/privileged-research"
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                          location === "/privileged-research" || location.startsWith("/privileged-research/")
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground"
                        }`}
                        data-testid="link-nav-privileged-research"
                      >
                        <Lock className="h-4 w-4 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">Privileged Research</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Privileged Research</TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    href="/privileged-research"
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover-elevate active-elevate-2 ${
                      location === "/privileged-research" || location.startsWith("/privileged-research/")
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground"
                    }`}
                    data-testid="link-nav-privileged-research"
                  >
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Privileged Research</span>
                  </Link>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
        
        {menuSections.map((section) => {
          const visibleItems = filterItemsByRole(section.items);
          if (visibleItems.length === 0) return null;

          const sectionKey = section.title.toLowerCase().split(" ")[0];
          const isOpen = openSections[sectionKey] ?? section.defaultOpen ?? true;

          return (
            <SidebarGroup key={section.title}>
              <Collapsible open={isOpen} onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [sectionKey]: open }))}>
                <CollapsibleTrigger 
                  className="w-full group-data-[collapsible=icon]:hidden"
                  data-testid={`button-toggle-${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <div className="flex items-center justify-between px-3 py-2 hover-elevate active-elevate-2 rounded-md">
                    <span className="sidebar-section-header">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform text-sidebar-foreground/60 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="data-[state=closed]:hidden group-data-[collapsible=icon]:!block">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map(renderMenuItem)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-2 group-data-[collapsible=icon]:justify-center">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 flex-shrink-0 cursor-pointer" data-testid="avatar-user">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Avatar className="h-8 w-8 flex-shrink-0" data-testid="avatar-user">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize" data-testid="text-user-role">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start group-data-[collapsible=icon]:hidden"
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
