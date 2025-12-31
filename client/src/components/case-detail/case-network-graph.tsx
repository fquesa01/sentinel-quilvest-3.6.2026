import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ForceGraph2D from "react-force-graph-2d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Users,
  Mail,
  Network,
  RefreshCw,
  Info,
  X,
  Search,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkNode {
  id: string;
  email: string;
  name: string;
  domain: string | null;
  sentCount: number;
  receivedCount: number;
  totalMessages: number;
  isInternal: boolean;
  normalizedSize: number;
  x?: number;
  y?: number;
}

interface NetworkEdge {
  source: string | NetworkNode;
  target: string | NetworkNode;
  weight: number;
  normalizedWeight: number;
  messages: string[];
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    totalCommunications: number;
    internalDomains: string[];
  };
}

interface CaseNetworkGraphProps {
  caseId: string;
  onNodeClick?: (node: NetworkNode) => void;
}

export function CaseNetworkGraph({ caseId, onNodeClick }: CaseNetworkGraphProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [minMessages, setMinMessages] = useState(2);
  const [maxNodes, setMaxNodes] = useState(30);
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLabels, setShowLabels] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Fetch network data
  const { data: networkData, isLoading, refetch } = useQuery<NetworkData>({
    queryKey: ["/api/cases", caseId, "communications", "network", { minMessages, sourceType: sourceTypeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        minMessages: minMessages.toString(),
        ...(sourceTypeFilter !== "all" && { sourceType: sourceTypeFilter }),
      });
      const response = await fetch(`/api/cases/${caseId}/communications/network?${params}`);
      if (!response.ok) throw new Error("Failed to fetch network data");
      return response.json();
    },
  });

  // Clear selection when filters change to avoid stale focus state
  useEffect(() => {
    setSelectedNode(null);
  }, [minMessages, maxNodes, sourceTypeFilter, caseId]);


  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 500),
        });
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Full graph data (all nodes up to maxNodes limit)
  const fullGraphData = useMemo(() => {
    if (!networkData) return { nodes: [], links: [] };

    // Sort nodes by total messages and limit
    const sortedNodes = [...networkData.nodes]
      .sort((a, b) => b.totalMessages - a.totalMessages)
      .slice(0, maxNodes);
    
    const nodeIds = new Set(sortedNodes.map(n => n.id));

    // Filter edges to only include connections between visible nodes
    const filteredEdges = networkData.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return {
      nodes: sortedNodes.map((node) => ({
        ...node,
        val: 5 + node.normalizedSize * 25,
      })),
      links: filteredEdges.map((edge) => ({
        ...edge,
        value: edge.normalizedWeight,
      })),
    };
  }, [networkData, maxNodes]);

  // Clear selection if the selected node is no longer in the visible top-N slice
  useEffect(() => {
    if (selectedNode && fullGraphData.nodes.length > 0) {
      const nodeStillVisible = fullGraphData.nodes.some((n: any) => n.id === selectedNode.id);
      if (!nodeStillVisible) {
        setSelectedNode(null);
      }
    }
  }, [fullGraphData.nodes, selectedNode]);

  // Get connected node IDs for focused view
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    
    const connected = new Set<string>();
    connected.add(selectedNode.id);
    
    fullGraphData.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (sourceId === selectedNode.id) connected.add(targetId);
      if (targetId === selectedNode.id) connected.add(sourceId);
    });
    
    return connected;
  }, [selectedNode, fullGraphData.links]);

  // Filtered graph data - show only selected node's network when focused
  const graphData = useMemo(() => {
    if (!selectedNode) return fullGraphData;

    // Filter to only connected nodes
    const filteredNodes = fullGraphData.nodes.filter((node: any) => 
      connectedNodeIds.has(node.id)
    );

    // Filter to only links involving the selected node
    const filteredLinks = fullGraphData.links.filter((link: any) => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === selectedNode.id || targetId === selectedNode.id;
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [fullGraphData, selectedNode, connectedNodeIds]);

  // Get top contacts for selected node
  const topContacts = useMemo(() => {
    if (!selectedNode || !networkData) return [];
    
    const contacts: { node: NetworkNode; messageCount: number }[] = [];
    
    networkData.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      if (sourceId === selectedNode.id) {
        const targetNode = networkData.nodes.find(n => n.id === targetId);
        if (targetNode) {
          contacts.push({ node: targetNode, messageCount: edge.messages.length });
        }
      }
      if (targetId === selectedNode.id) {
        const sourceNode = networkData.nodes.find(n => n.id === sourceId);
        if (sourceNode) {
          contacts.push({ node: sourceNode, messageCount: edge.messages.length });
        }
      }
    });
    
    return contacts.sort((a, b) => b.messageCount - a.messageCount).slice(0, 5);
  }, [selectedNode, networkData]);

  // Get set of searchable node IDs from full graph (not filtered by selection)
  const searchableNodeIds = useMemo(() => {
    return new Set(fullGraphData.nodes.map((n: any) => n.id));
  }, [fullGraphData.nodes]);

  // Search nodes from the full graph data (allows searching when focused)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !networkData) return [];
    const query = searchQuery.toLowerCase();
    return networkData.nodes
      .filter(n => 
        searchableNodeIds.has(n.id) && // Only search nodes in the top-N slice
        (n.name.toLowerCase().includes(query) || 
         n.email.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [searchQuery, networkData, searchableNodeIds]);

  // Determine if a node's label should be shown based on zoom level
  const shouldShowLabel = useCallback((node: any) => {
    if (showLabels) return true;
    if (selectedNode?.id === node.id) return true;
    if (hoveredNode?.id === node.id) return true;
    
    // Zoom-based label reveal: show top nodes when zoomed in
    if (currentZoom > 1.5) {
      // At higher zoom, show labels for nodes with more messages
      return node.totalMessages > 50;
    }
    if (currentZoom > 2.5) {
      return node.totalMessages > 20;
    }
    if (currentZoom > 4) {
      return true;
    }
    
    return false;
  }, [showLabels, selectedNode, hoveredNode, currentZoom]);

  // Node color based on internal/external status and selection state
  const getNodeColor = useCallback((node: NetworkNode) => {
    const baseColor = node.isInternal ? "hsl(212, 95%, 55%)" : "hsl(25, 90%, 55%)";
    
    // Selected node gets primary color
    if (selectedNode?.id === node.id) return "hsl(var(--primary))";
    // Hovered node gets accent color
    if (hoveredNode?.id === node.id) return "hsl(var(--accent))";
    
    return baseColor;
  }, [selectedNode, hoveredNode]);

  // Custom node rendering
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = Math.max(10 / globalScale, 2.5);
    ctx.font = `${fontSize}px Inter, sans-serif`;

    const size = node.val || 8;
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();

    // Draw border for selected/hovered
    if (isSelected || isHovered) {
      ctx.strokeStyle = "hsl(var(--foreground))";
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }

    // Draw label based on conditions
    const showLabel = shouldShowLabel(node);
    if (showLabel) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Add subtle background for readability
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;
      const padding = 2 / globalScale;
      
      ctx.fillStyle = "hsla(var(--background), 0.85)";
      ctx.fillRect(
        node.x - textWidth / 2 - padding,
        node.y + size + padding,
        textWidth + padding * 2,
        textHeight + padding * 2
      );
      
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.fillText(label, node.x, node.y + size + fontSize);
    }
  }, [selectedNode, hoveredNode, getNodeColor, shouldShowLabel]);

  // Link styling - simpler now since non-connected links are filtered out
  const getLinkColor = useCallback(() => {
    // When focused, all visible links are primary connections
    if (selectedNode) return "hsl(var(--primary) / 0.6)";
    return "hsl(var(--muted-foreground) / 0.3)";
  }, [selectedNode]);

  const getLinkWidth = useCallback((link: any) => {
    // Thicker links when focused to emphasize connections
    if (selectedNode) return 2 + link.value * 4;
    return 1 + link.value * 3;
  }, [selectedNode]);

  // Handle node click
  const handleNodeClick = useCallback((node: NetworkNode) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      if (onNodeClick) {
        onNodeClick(node);
      }
      // Center view on node
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(2, 500);
      }
    }
  }, [onNodeClick, selectedNode]);

  // Focus on a node from search
  const focusOnNode = useCallback((node: NetworkNode) => {
    setSearchQuery("");
    setSelectedNode(node);
    
    // Find the node in the graph
    const graphNode = graphData.nodes.find((n: any) => n.id === node.id);
    if (graphNode && graphRef.current) {
      graphRef.current.centerAt(graphNode.x, graphNode.y, 500);
      graphRef.current.zoom(2.5, 500);
    }
  }, [graphData.nodes]);

  // Zoom controls
  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  const handleFitView = () => {
    setSelectedNode(null);
    graphRef.current?.zoomToFit(500, 50);
  };

  // Track zoom level
  const handleZoom = useCallback((transform: { k: number }) => {
    setCurrentZoom(transform.k);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Building network graph...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!networkData || networkData.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <Network className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No communication data available</p>
            <p className="text-sm text-muted-foreground">
              Upload communications to see the network visualization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 h-full" data-testid="network-graph-container">
      {/* Main graph area */}
      <Card className="flex flex-col flex-1 min-w-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Communication Network</CardTitle>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Find person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-40 pl-7 text-sm"
                data-testid="input-network-search"
              />
              {searchResults.length > 0 && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-20 overflow-hidden">
                  {searchResults.map(node => (
                    <button
                      key={node.id}
                      className="w-full px-3 py-2 text-left text-sm hover-elevate flex items-center justify-between"
                      onClick={() => focusOnNode(node)}
                      data-testid={`search-result-${node.id}`}
                    >
                      <div>
                        <div className="font-medium">{node.name}</div>
                        <div className="text-xs text-muted-foreground">{node.email}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {node.totalMessages}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Show All button - appears when focused on a node */}
            {selectedNode && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="gap-1"
                data-testid="button-show-all"
              >
                <Users className="h-3.5 w-3.5" />
                Show All
              </Button>
            )}

            {/* Stats badges */}
            <Badge variant="secondary" className="gap-1 hidden sm:flex">
              <Users className="h-3 w-3" />
              {graphData.nodes.length}/{fullGraphData.nodes.length}
            </Badge>

            {/* Toggle labels */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showLabels ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowLabels(!showLabels)}
                  className="gap-1"
                  data-testid="button-toggle-labels"
                >
                  {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Labels</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLabels ? "Hide all labels" : "Show all labels"}</TooltipContent>
            </Tooltip>

            {/* Filter popover */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" data-testid="button-network-filters">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Show Top People</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[maxNodes]}
                        onValueChange={([val]) => setMaxNodes(val)}
                        min={10}
                        max={100}
                        step={5}
                        className="flex-1"
                        data-testid="slider-max-nodes"
                      />
                      <span className="text-sm w-8 text-center">{maxNodes}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Display top {maxNodes} people by message volume
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Minimum Messages</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[minMessages]}
                        onValueChange={([val]) => setMinMessages(val)}
                        min={1}
                        max={50}
                        step={1}
                        className="flex-1"
                        data-testid="slider-min-messages"
                      />
                      <span className="text-sm w-8 text-center">{minMessages}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Filter people with at least {minMessages} message(s)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Source Type</Label>
                    <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                      <SelectTrigger data-testid="select-source-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="m365">Microsoft 365</SelectItem>
                        <SelectItem value="gmail">Gmail</SelectItem>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="teams">Teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    className="w-full"
                    data-testid="button-apply-filters"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Zoom controls */}
            <div className="flex items-center border rounded-md">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8" data-testid="button-zoom-out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8" data-testid="button-zoom-in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleFitView} className="h-8 w-8" data-testid="button-fit-view">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset View</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 relative p-0" ref={containerRef}>
          {/* Legend / Status indicator */}
          <div className="absolute top-2 left-2 z-10 bg-background/90 rounded-md p-2 border text-xs space-y-1">
            {selectedNode ? (
              <>
                <div className="font-medium text-primary">Focused View</div>
                <div className="text-muted-foreground">
                  Showing {selectedNode.name}'s connections
                </div>
                <div className="pt-1 border-t mt-1 text-muted-foreground">
                  {connectedNodeIds.size - 1} contact{connectedNodeIds.size !== 2 ? 's' : ''}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(212, 95%, 55%)" }} />
                  <span>Internal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(25, 90%, 55%)" }} />
                  <span>External</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t mt-1">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Click person to focus</span>
                </div>
              </>
            )}
          </div>

          {/* Zoom hint - only show when not focused */}
          {!selectedNode && !showLabels && currentZoom < 1.5 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-background/90 rounded-md px-3 py-1.5 border text-xs text-muted-foreground">
              Zoom in to reveal names, or enable Labels
            </div>
          )}

          {/* Force-directed graph */}
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height - 60}
            graphData={graphData}
            nodeId="id"
            nodeLabel={(node: any) => `${node.name}\n${node.totalMessages} messages`}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val || 8, 0, 2 * Math.PI);
              ctx.fill();
            }}
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkDirectionalParticles={0}
            onNodeClick={(node: any) => handleNodeClick(node as NetworkNode)}
            onNodeHover={(node: any) => setHoveredNode(node as NetworkNode | null)}
            onZoom={handleZoom}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            enableNodeDrag={true}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        </CardContent>
      </Card>

      {/* Right side details panel */}
      <Card className={cn(
        "w-72 flex-shrink-0 transition-all duration-300",
        selectedNode ? "opacity-100" : "opacity-50"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Person Details</span>
            {selectedNode && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedNode(null)}
                data-testid="button-close-details"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedNode ? (
            <div className="space-y-4">
              {/* Selected person info */}
              <div>
                <h4 className="font-medium text-sm">{selectedNode.name}</h4>
                <p className="text-xs text-muted-foreground break-all">{selectedNode.email}</p>
                <Badge 
                  variant={selectedNode.isInternal ? "default" : "secondary"} 
                  className="mt-2"
                >
                  {selectedNode.isInternal ? "Internal" : "External"}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-lg font-semibold">{selectedNode.sentCount}</div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-lg font-semibold">{selectedNode.receivedCount}</div>
                  <div className="text-xs text-muted-foreground">Received</div>
                </div>
              </div>

              {/* Domain */}
              {selectedNode.domain && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Domain:</span>
                  <span className="ml-1 font-medium">{selectedNode.domain}</span>
                </div>
              )}

              {/* Top contacts */}
              {topContacts.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">TOP CONTACTS</h5>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {topContacts.map(({ node, messageCount }) => (
                        <button
                          key={node.id}
                          className="w-full flex items-center gap-2 p-2 rounded-md text-left text-sm hover-elevate"
                          onClick={() => focusOnNode(node)}
                          data-testid={`contact-${node.id}`}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: node.isInternal
                                ? "hsl(212, 95%, 55%)"
                                : "hsl(25, 90%, 55%)",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{node.name}</div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {messageCount}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Click on a person in the graph to see their details and connections</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
