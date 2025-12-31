import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileStack,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  Handshake,
  Landmark,
} from "lucide-react";
import type { DealTemplate, TemplateCategory, TemplateItem } from "@shared/schema";

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

const typeLabels: Record<string, string> = {
  real_estate: "Real Estate",
  ma_asset: "M&A (Asset Purchase)",
  ma_stock: "M&A (Stock Purchase)",
  merger: "Merger",
  investment: "Investment",
  debt: "Debt Transaction",
  jv: "Joint Venture",
  franchise: "Franchise",
  other: "Other",
};

interface TemplateDetails {
  template: DealTemplate;
  categories: TemplateCategory[];
  items: TemplateItem[];
}

export default function TransactionsDealTemplateDetail() {
  const { templateId } = useParams<{ templateId: string }>();

  const { data: templateDetails, isLoading } = useQuery<TemplateDetails>({
    queryKey: [`/api/deal-templates/${templateId}`],
    enabled: !!templateId,
  });

  const groupedItems = templateDetails?.items?.reduce((acc, item) => {
    const categoryId = item.categoryId || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(item);
    return acc;
  }, {} as Record<string, TemplateItem[]>) || {};

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!templateDetails) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Template not found</p>
            <p className="text-muted-foreground mb-4">
              The requested template could not be found.
            </p>
            <Link href="/transactions/templates" data-testid="link-back-to-templates">
              <Button variant="outline" data-testid="button-back-to-templates">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { template, categories, items } = templateDetails;
  const Icon = typeIcons[template.transactionType || 'other'] || FileText;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/transactions/templates" data-testid="link-breadcrumb-templates">
          <span className="hover:text-foreground cursor-pointer">
            Deal Templates
          </span>
        </Link>
        <span>/</span>
        <span className="text-foreground">{template.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions/templates" data-testid="link-back">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{template.name}</h1>
                {template.isSystemTemplate && (
                  <Badge variant="secondary">System Template</Badge>
                )}
                {template.isDefault && (
                  <Badge variant="outline">Default</Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {typeLabels[template.transactionType || 'other']} Template
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>{template.description || "No description available"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{categories.length}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">{items.length}</div>
              <div className="text-sm text-muted-foreground">Checklist Items</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-orange-600">
                {items.filter(i => i.isRequired).length}
              </div>
              <div className="text-sm text-muted-foreground">Required</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-red-600">
                {items.filter(i => i.isCritical).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>Version {template.version}</span>
            <span>Used {template.usageCount || 0} times</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Items by Category</CardTitle>
          <CardDescription>
            Review all checklist items organized by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={categories.map(c => c.id)}>
            {categories
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((category) => {
                const categoryItems = groupedItems[category.id] || [];
                const requiredCount = categoryItems.filter(i => i.isRequired).length;
                const criticalCount = categoryItems.filter(i => i.isCritical).length;

                return (
                  <AccordionItem key={category.id} value={category.id} data-testid={`accordion-category-${category.id}`}>
                    <AccordionTrigger className="hover:no-underline" data-testid={`accordion-trigger-${category.id}`}>
                      <div className="flex items-center gap-3 text-left flex-wrap">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: category.color || '#6366f1' }}
                        />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary">
                          {categoryItems.length} items
                        </Badge>
                        {requiredCount > 0 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {requiredCount} required
                          </Badge>
                        )}
                        {criticalCount > 0 && (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            {criticalCount} critical
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-6">
                        {categoryItems
                          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                          .map((item) => (
                            <div 
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                              data-testid={`item-${item.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {item.isRequired && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    Required
                                  </Badge>
                                )}
                                {item.isCritical && (
                                  <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Critical
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
