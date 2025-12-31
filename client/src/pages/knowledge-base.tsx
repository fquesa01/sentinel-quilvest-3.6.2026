import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Search, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Regulation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export default function KnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: regulations, isLoading } = useQuery<Regulation[]>({
    queryKey: ["/api/regulations"],
  });

  const seedRegulations = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/regulations/seed", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to seed regulations");
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
      toast({
        title: "Regulations Seeded",
        description: `Successfully populated knowledge base with ${data.count} regulations including comprehensive FCPA and SOX frameworks.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed regulations",
        variant: "destructive",
      });
    },
  });

  const filteredRegulations = regulations?.filter((reg) => {
    const matchesSearch =
      !searchTerm ||
      reg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.citation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || reg.violationType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-knowledge-base">
            Regulatory Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            Searchable database of compliance regulations and guidance
          </p>
        </div>
        {user?.role === "admin" && (
          <Button
            onClick={() => seedRegulations.mutate()}
            disabled={seedRegulations.isPending || (regulations && regulations.length > 0)}
            data-testid="button-seed-regulations"
          >
            <Database className="h-4 w-4 mr-2" />
            {seedRegulations.isPending
              ? "Populating..."
              : regulations && regulations.length > 0
              ? "Knowledge Base Populated"
              : "Populate FCPA & SOX Knowledge Base"}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regulations by title, citation, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-regulations"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48" data-testid="select-type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="fcpa">FCPA</SelectItem>
                <SelectItem value="banking">Banking</SelectItem>
                <SelectItem value="antitrust">Antitrust</SelectItem>
                <SelectItem value="sec">SEC</SelectItem>
                <SelectItem value="sox">SOX</SelectItem>
                <SelectItem value="florida_specific">Florida Specific</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredRegulations || filteredRegulations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No regulations found</p>
              <p className="text-sm">
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Regulations will appear here when added"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRegulations.map((regulation) => (
                <Card key={regulation.id} className="hover-elevate" data-testid={`regulation-card-${regulation.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg" data-testid={`regulation-title-${regulation.id}`}>
                          {regulation.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {regulation.description}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="uppercase font-semibold tracking-wide"
                        data-testid={`regulation-type-${regulation.id}`}
                      >
                        {regulation.violationType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {regulation.citation && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Citation</p>
                          <p className="text-sm font-mono mt-1" data-testid={`regulation-citation-${regulation.id}`}>
                            {regulation.citation}
                          </p>
                        </div>
                      )}
                      {regulation.jurisdiction && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Jurisdiction</p>
                          <p className="text-sm capitalize mt-1" data-testid={`regulation-jurisdiction-${regulation.id}`}>
                            {regulation.jurisdiction}
                          </p>
                        </div>
                      )}
                      {regulation.effectiveDate && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Effective Date</p>
                          <p className="text-sm mt-1">
                            {new Date(regulation.effectiveDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Content</p>
                        <div className="bg-muted/50 p-4 rounded-md">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`regulation-content-${regulation.id}`}>
                            {regulation.content.length > 500
                              ? regulation.content.substring(0, 500) + "..."
                              : regulation.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
