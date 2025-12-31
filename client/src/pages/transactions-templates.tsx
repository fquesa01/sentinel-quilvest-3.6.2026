import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileStack,
  Search, 
  Eye,
  FileText,
  Building,
  Handshake,
  Landmark,
} from "lucide-react";
import type { DealTemplate } from "@shared/schema";

const transactionTypes = [
  { value: "all", label: "All Types" },
  { value: "real_estate", label: "Real Estate" },
  { value: "ma_asset", label: "M&A (Asset Purchase)" },
  { value: "ma_stock", label: "M&A (Stock Purchase)" },
  { value: "merger", label: "Merger" },
  { value: "investment", label: "Investment" },
  { value: "debt", label: "Debt Transaction" },
  { value: "jv", label: "Joint Venture" },
  { value: "franchise", label: "Franchise" },
  { value: "other", label: "Other" },
];

const typeIcons: Record<string, typeof Building> = {
  real_estate: Building,
  ma_asset: Handshake,
  ma_stock: Handshake,
  merger: Handshake,
  investment: Landmark,
  debt: Landmark,
  jv: Handshake,
  franchise: FileText,
  other: FileText,
};

export default function TransactionsTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: templates, isLoading } = useQuery<DealTemplate[]>({
    queryKey: ["/api/deal-templates"],
  });

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || template.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileStack className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Deal Templates</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileStack className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Deal Templates</h1>
            <p className="text-muted-foreground">Pre-built transaction checklists for common deal types</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-templates"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTemplates?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "No deal templates have been created yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map((template) => {
            const Icon = typeIcons[template.transactionType || 'other'] || FileText;
            return (
              <Card 
                key={template.id} 
                className="hover-elevate cursor-pointer transition-shadow"
                data-testid={`card-template-${template.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {template.isSystemTemplate && (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                          {template.isDefault && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2 mb-4">
                    {template.description || "No description available"}
                  </CardDescription>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>Version {template.version}</span>
                    <span>Used {template.usageCount || 0} times</span>
                  </div>

                  <Link href={`/transactions/deal-templates/${template.id}`} data-testid={`link-view-template-${template.id}`}>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      data-testid={`button-view-template-${template.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Checklist Items
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
