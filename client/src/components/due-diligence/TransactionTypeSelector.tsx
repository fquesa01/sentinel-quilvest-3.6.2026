import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Check, Building, Wallet, ArrowLeftRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionType {
  id: string;
  name: string;
  description: string;
  category: string;
  displayOrder: number;
}

interface TransactionTypeSelectorProps {
  selectedTypeId: string | null;
  onSelect: (type: TransactionType) => void;
}

const categoryIcons: Record<string, any> = {
  equity: Building,
  debt: Wallet,
  hybrid: ArrowLeftRight,
  asset: FileText
};

const categoryLabels: Record<string, string> = {
  equity: "Equity Transactions",
  debt: "Debt Transactions",
  hybrid: "Hybrid Instruments",
  asset: "Asset Transactions"
};

export function TransactionTypeSelector({ selectedTypeId, onSelect }: TransactionTypeSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    equity: true,
    debt: true,
    hybrid: false,
    asset: false
  });

  const { data, isLoading } = useQuery<{ transactionTypes: TransactionType[], grouped: Record<string, TransactionType[]> }>({
    queryKey: ["/api/due-diligence/transaction-types"]
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (isLoading) {
    return (
      <Card data-testid="card-transaction-types-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Transaction Type
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const grouped = data?.grouped || {};
  const categories = ["equity", "debt", "hybrid", "asset"].filter(c => grouped[c]?.length > 0);

  return (
    <Card data-testid="card-transaction-types">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Transaction Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedTypeId || ""} className="space-y-2">
          {categories.map(category => {
            const Icon = categoryIcons[category];
            const isExpanded = expandedCategories[category];
            const types = grouped[category] || [];
            const selectedInCategory = types.some(t => t.id === selectedTypeId);

            return (
              <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger 
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-md hover-elevate transition-colors",
                    selectedInCategory && "bg-primary/10"
                  )}
                  data-testid={`button-category-${category}`}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{categoryLabels[category]}</span>
                    <Badge variant="secondary" className="ml-2">{types.length}</Badge>
                  </div>
                  {selectedInCategory && <Check className="h-4 w-4 text-primary" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                  {types.map(type => (
                    <div
                      key={type.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md cursor-pointer hover-elevate transition-colors",
                        selectedTypeId === type.id && "bg-primary/10 ring-1 ring-primary/20"
                      )}
                      onClick={() => onSelect(type)}
                      data-testid={`option-transaction-${type.id}`}
                    >
                      <RadioGroupItem value={type.id} id={type.id} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={type.id} className="font-medium cursor-pointer">
                          {type.name}
                        </Label>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
