import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Home,
  DollarSign,
  Users,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  RefreshCw,
  Layers,
  CreditCard,
  Percent,
  Scale,
} from "lucide-react";

interface ClosingData {
  id: number;
  statementType: string;
  title: string;
  propertyAddress?: string | null;
  purchasePrice?: string | null;
  loanAmount?: string | null;
  earnestMoney?: string | null;
  closingDate?: string | null;
  [key: string]: any;
}

interface LineItem {
  id: number;
  description: string;
  amount: string;
  lineType: string;
  hudSection?: string | null;
  altaCategory?: string | null;
  cdSection?: string | null;
  paidBy?: string | null;
  paidTo?: string | null;
  [key: string]: any;
}

interface StatementFormProps {
  closing: ClosingData;
  lineItems: LineItem[];
  onAddItem?: (section: string, defaults?: Record<string, string>) => void;
}

function formatCurrency(val: string | null | undefined): string {
  const n = parseFloat((val || "0").replace(/[,$\s]/g, ""));
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function sumItems(items: LineItem[]): number {
  return items.reduce((sum, item) => {
    const v = parseFloat((item.amount || "0").replace(/[,$\s]/g, ""));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
}

function SectionBlock({ title, icon, items, color, onAdd }: {
  title: string;
  icon: React.ReactNode;
  items: LineItem[];
  color?: string;
  onAdd?: () => void;
}) {
  const total = sumItems(items);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <Badge variant="outline" className="text-xs">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm" data-testid={`text-section-total-${title.toLowerCase().replace(/\s/g, "-")}`}>
            {formatCurrency(total.toString())}
          </span>
          {onAdd && (
            <button className="text-xs text-primary hover:underline" onClick={onAdd} data-testid={`button-add-${title.toLowerCase().replace(/\s/g, "-")}`}>
              + Add
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">No items yet</p>
      ) : (
        <div className="pl-6 space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-muted/30 last:border-0">
              <span className="truncate" data-testid={`text-item-desc-${item.id}`}>{item.description}</span>
              <span className="font-mono shrink-0 ml-2" data-testid={`text-item-amount-${item.id}`}>{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClosingDisclosureForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const loanTerms = lineItems.filter(i => i.cdSection === "loan_terms");
  const projectedPayments = lineItems.filter(i => i.cdSection === "projected_payments");
  const closingCosts = lineItems.filter(i => i.cdSection === "closing_costs");
  const cashToClose = lineItems.filter(i => i.cdSection === "cash_to_close");
  const summaries = lineItems.filter(i => i.cdSection === "summaries");
  const other = lineItems.filter(i => !i.cdSection || !["loan_terms", "projected_payments", "closing_costs", "cash_to_close", "summaries"].includes(i.cdSection));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Closing Disclosure Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="text-sm font-medium" data-testid="text-cd-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sale Price</Label>
              <p className="text-sm font-mono font-medium" data-testid="text-cd-sale-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Loan Amount</Label>
              <p className="text-sm font-mono font-medium" data-testid="text-cd-loan">{formatCurrency(closing.loanAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock
          title="Loan Terms"
          icon={<CreditCard className="h-4 w-4 text-blue-500" />}
          items={loanTerms}
          onAdd={() => onAddItem?.("loan_terms", { cdSection: "loan_terms" })}
        />
        <Separator />
        <SectionBlock
          title="Projected Payments"
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          items={projectedPayments}
          onAdd={() => onAddItem?.("projected_payments", { cdSection: "projected_payments" })}
        />
        <Separator />
        <SectionBlock
          title="Closing Costs"
          icon={<Percent className="h-4 w-4 text-orange-500" />}
          items={closingCosts}
          onAdd={() => onAddItem?.("closing_costs", { cdSection: "closing_costs" })}
        />
        <Separator />
        <SectionBlock
          title="Cash to Close"
          icon={<DollarSign className="h-4 w-4 text-purple-500" />}
          items={cashToClose}
          onAdd={() => onAddItem?.("cash_to_close", { cdSection: "cash_to_close" })}
        />
        <Separator />
        <SectionBlock
          title="Summaries of Transactions"
          icon={<Scale className="h-4 w-4 text-indigo-500" />}
          items={summaries}
          onAdd={() => onAddItem?.("summaries", { cdSection: "summaries" })}
        />
        {other.length > 0 && (
          <>
            <Separator />
            <SectionBlock title="Other Items" icon={<FileText className="h-4 w-4" />} items={other} />
          </>
        )}
      </div>
    </div>
  );
}

export function Hud1Form({ closing, lineItems, onAddItem }: StatementFormProps) {
  const sectionConfig = [
    { num: "100", label: "Gross Amount Due from Borrower", icon: <DollarSign className="h-4 w-4 text-red-500" /> },
    { num: "200", label: "Amounts Paid By/on Behalf of Borrower", icon: <DollarSign className="h-4 w-4 text-green-500" /> },
    { num: "300", label: "Cash at Settlement From/To Borrower", icon: <DollarSign className="h-4 w-4 text-blue-500" /> },
    { num: "400", label: "Gross Amount Due to Seller", icon: <DollarSign className="h-4 w-4 text-amber-500" /> },
    { num: "500", label: "Reductions in Amount Due to Seller", icon: <ArrowDownRight className="h-4 w-4 text-orange-500" /> },
    { num: "600", label: "Cash at Settlement To/From Seller", icon: <DollarSign className="h-4 w-4 text-purple-500" /> },
    { num: "700", label: "Total Real Estate Broker Fees", icon: <Users className="h-4 w-4 text-teal-500" /> },
    { num: "800", label: "Items Payable in Connection with Loan", icon: <CreditCard className="h-4 w-4 text-indigo-500" /> },
    { num: "900", label: "Items Required by Lender to Be Paid in Advance", icon: <Percent className="h-4 w-4 text-pink-500" /> },
    { num: "1000", label: "Reserves Deposited with Lender", icon: <Building2 className="h-4 w-4 text-emerald-500" /> },
    { num: "1100", label: "Title Charges", icon: <FileText className="h-4 w-4 text-sky-500" /> },
    { num: "1200", label: "Government Recording and Transfer Charges", icon: <FileText className="h-4 w-4 text-violet-500" /> },
    { num: "1300", label: "Additional Settlement Charges", icon: <FileText className="h-4 w-4 text-gray-500" /> },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> HUD-1 Settlement Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Property Location</Label>
              <p className="text-sm font-medium" data-testid="text-hud-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contract Sales Price</Label>
              <p className="text-sm font-mono font-medium" data-testid="text-hud-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Settlement Date</Label>
              <p className="text-sm font-medium" data-testid="text-hud-date">{closing.closingDate || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">J. Borrower&apos;s Transaction</h3>
          {sectionConfig.filter((_, i) => i < 3).map(sec => {
            const items = lineItems.filter(li => li.hudSection === sec.num);
            return (
              <SectionBlock
                key={sec.num}
                title={`${sec.num}. ${sec.label}`}
                icon={sec.icon}
                items={items}
                onAdd={() => onAddItem?.(sec.num, { hudSection: sec.num })}
              />
            );
          })}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">K. Seller&apos;s Transaction</h3>
          {sectionConfig.filter((_, i) => i >= 3 && i < 6).map(sec => {
            const items = lineItems.filter(li => li.hudSection === sec.num);
            return (
              <SectionBlock
                key={sec.num}
                title={`${sec.num}. ${sec.label}`}
                icon={sec.icon}
                items={items}
                onAdd={() => onAddItem?.(sec.num, { hudSection: sec.num })}
              />
            );
          })}
        </div>
      </div>

      <Separator />
      <h3 className="text-sm font-semibold text-muted-foreground">L. Settlement Charges</h3>
      <div className="space-y-3">
        {sectionConfig.filter((_, i) => i >= 6).map(sec => {
          const items = lineItems.filter(li => li.hudSection === sec.num);
          return (
            <SectionBlock
              key={sec.num}
              title={`${sec.num}. ${sec.label}`}
              icon={sec.icon}
              items={items}
              onAdd={() => onAddItem?.(sec.num, { hudSection: sec.num })}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AltaForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const isCombo = closing.statementType === "alta_combined";
  const isBuyer = closing.statementType === "alta_buyer";

  const categories = [
    { key: "financial", label: "Financial", icon: <DollarSign className="h-4 w-4 text-green-500" /> },
    { key: "prorations", label: "Prorations & Adjustments", icon: <Percent className="h-4 w-4 text-blue-500" /> },
    { key: "commissions", label: "Commissions", icon: <Users className="h-4 w-4 text-teal-500" /> },
    { key: "title", label: "Title Charges", icon: <FileText className="h-4 w-4 text-indigo-500" /> },
    { key: "taxes", label: "Government & Taxes", icon: <Building2 className="h-4 w-4 text-amber-500" /> },
    { key: "payoffs", label: "Payoffs & Liens", icon: <CreditCard className="h-4 w-4 text-red-500" /> },
    { key: "escrows", label: "Escrow & Reserves", icon: <Scale className="h-4 w-4 text-purple-500" /> },
    { key: "other", label: "Other Charges", icon: <FileText className="h-4 w-4 text-gray-500" /> },
  ];

  function getAltaItems(cat: string) {
    return lineItems.filter(li => li.altaCategory === cat);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> ALTA Settlement Statement
            <Badge variant="outline" className="ml-2">
              {isCombo ? "Combined" : isBuyer ? "Buyer" : "Seller"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="text-sm font-medium" data-testid="text-alta-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sale Price</Label>
              <p className="text-sm font-mono font-medium" data-testid="text-alta-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Settlement Date</Label>
              <p className="text-sm font-medium" data-testid="text-alta-date">{closing.closingDate || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isCombo && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Buyer&apos;s Statement</h3>
            {categories.map(cat => {
              const items = getAltaItems(cat.key).filter(li => li.paidBy === "buyer");
              return (
                <SectionBlock
                  key={`buyer-${cat.key}`}
                  title={cat.label}
                  icon={cat.icon}
                  items={items}
                  onAdd={() => onAddItem?.(cat.key, { altaCategory: cat.key, paidBy: "buyer" })}
                />
              );
            })}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Seller&apos;s Statement</h3>
            {categories.map(cat => {
              const items = getAltaItems(cat.key).filter(li => li.paidBy === "seller");
              return (
                <SectionBlock
                  key={`seller-${cat.key}`}
                  title={cat.label}
                  icon={cat.icon}
                  items={items}
                  onAdd={() => onAddItem?.(cat.key, { altaCategory: cat.key, paidBy: "seller" })}
                />
              );
            })}
          </div>
        </div>
      )}

      {!isCombo && (
        <div className="space-y-4">
          {categories.map(cat => (
            <SectionBlock
              key={cat.key}
              title={cat.label}
              icon={cat.icon}
              items={getAltaItems(cat.key)}
              onAdd={() => onAddItem?.(cat.key, { altaCategory: cat.key })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SourcesUsesForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const sources = lineItems.filter(li => li.lineType === "source");
  const uses = lineItems.filter(li => li.lineType === "use");
  const totalSources = sumItems(sources);
  const totalUses = sumItems(uses);
  const difference = totalSources - totalUses;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Sources & Uses of Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Sources</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-su-total-sources">{formatCurrency(totalSources.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Uses</Label>
              <p className="text-sm font-mono font-bold text-red-500" data-testid="text-su-total-uses">{formatCurrency(totalUses.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Balance</Label>
              <p className={`text-sm font-mono font-bold ${Math.abs(difference) < 0.01 ? "text-green-500" : "text-red-500"}`} data-testid="text-su-balance">
                {formatCurrency(difference.toString())}
                {Math.abs(difference) < 0.01 && <Badge variant="outline" className="ml-2 text-green-500">Balanced</Badge>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <SectionBlock
            title="Sources of Funds"
            icon={<ArrowUpRight className="h-4 w-4 text-green-500" />}
            items={sources}
            onAdd={() => onAddItem?.("source", { lineType: "source" })}
          />
        </div>
        <div className="space-y-3">
          <SectionBlock
            title="Uses of Funds"
            icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
            items={uses}
            onAdd={() => onAddItem?.("use", { lineType: "use" })}
          />
        </div>
      </div>
    </div>
  );
}

export function FundsFlowForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const incoming = lineItems.filter(li => li.lineType === "source");
  const outgoing = lineItems.filter(li => li.lineType === "use");
  const totalIn = sumItems(incoming);
  const totalOut = sumItems(outgoing);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Funds Flow Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Incoming Wires</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-ff-incoming">{formatCurrency(totalIn.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Outgoing Wires</Label>
              <p className="text-sm font-mono font-bold text-red-500" data-testid="text-ff-outgoing">{formatCurrency(totalOut.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Net Flow</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-ff-net">{formatCurrency((totalIn - totalOut).toString())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <SectionBlock
            title="Incoming Wires"
            icon={<ArrowUpRight className="h-4 w-4 text-green-500" />}
            items={incoming}
            onAdd={() => onAddItem?.("incoming", { lineType: "source" })}
          />
          {incoming.map(item => (
            <div key={item.id} className="pl-6 text-xs text-muted-foreground">
              {item.paidBy && <span>From: {item.paidBy}</span>}
              {item.paidTo && <span className="ml-4">To: {item.paidTo}</span>}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <SectionBlock
            title="Outgoing Wires"
            icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
            items={outgoing}
            onAdd={() => onAddItem?.("outgoing", { lineType: "use" })}
          />
          {outgoing.map(item => (
            <div key={item.id} className="pl-6 text-xs text-muted-foreground">
              {item.paidBy && <span>From: {item.paidBy}</span>}
              {item.paidTo && <span className="ml-4">To: {item.paidTo}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Exchange1031Form({ closing, lineItems, onAddItem }: StatementFormProps) {
  const relinquished = lineItems.filter(li => li.hudSection === "relinquished" || li.lineType === "source");
  const replacement = lineItems.filter(li => li.hudSection === "replacement" || li.lineType === "use");
  const exchangeFunds = lineItems.filter(li => li.hudSection === "exchange_funds");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> 1031 Exchange Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Relinquished Property</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-1031-relinquished">{formatCurrency(sumItems(relinquished).toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Replacement Property</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-1031-replacement">{formatCurrency(sumItems(replacement).toString())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock
          title="Relinquished Property Proceeds"
          icon={<Home className="h-4 w-4 text-amber-500" />}
          items={relinquished}
          onAdd={() => onAddItem?.("relinquished", { hudSection: "relinquished", lineType: "source" })}
        />
        <Separator />
        <SectionBlock
          title="Replacement Property Costs"
          icon={<Home className="h-4 w-4 text-blue-500" />}
          items={replacement}
          onAdd={() => onAddItem?.("replacement", { hudSection: "replacement", lineType: "use" })}
        />
        <Separator />
        <SectionBlock
          title="Exchange Funds"
          icon={<RefreshCw className="h-4 w-4 text-green-500" />}
          items={exchangeFunds}
          onAdd={() => onAddItem?.("exchange_funds", { hudSection: "exchange_funds" })}
        />
      </div>
    </div>
  );
}

export function PortfolioForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const summaryItems = lineItems.filter(li => li.lineType === "source" || li.hudSection === "summary");
  const allocations = lineItems.filter(li => li.lineType === "use" || li.hudSection === "allocation");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Portfolio / Capital Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Capital</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-portfolio-total">{formatCurrency(sumItems(summaryItems).toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Allocated</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-portfolio-allocated">{formatCurrency(sumItems(allocations).toString())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <SectionBlock
            title="Capital Summary"
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            items={summaryItems}
            onAdd={() => onAddItem?.("summary", { lineType: "source", hudSection: "summary" })}
          />
        </div>
        <div className="space-y-3">
          <SectionBlock
            title="Allocations"
            icon={<Layers className="h-4 w-4 text-blue-500" />}
            items={allocations}
            onAdd={() => onAddItem?.("allocation", { lineType: "use", hudSection: "allocation" })}
          />
        </div>
      </div>
    </div>
  );
}

export function LenderFundingForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const loanProceeds = lineItems.filter(li => li.lineType === "source");
  const disbursements = lineItems.filter(li => li.lineType === "use");
  const totalProceeds = sumItems(loanProceeds);
  const totalDisbursed = sumItems(disbursements);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Lender Funding Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Loan Amount</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-lender-loan">{formatCurrency(closing.loanAmount)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Proceeds</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-lender-proceeds">{formatCurrency(totalProceeds.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Disbursed</Label>
              <p className="text-sm font-mono font-bold text-red-500" data-testid="text-lender-disbursed">{formatCurrency(totalDisbursed.toString())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <SectionBlock
          title="Loan Proceeds"
          icon={<ArrowUpRight className="h-4 w-4 text-green-500" />}
          items={loanProceeds}
          onAdd={() => onAddItem?.("proceeds", { lineType: "source" })}
        />
        <SectionBlock
          title="Disbursements"
          icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
          items={disbursements}
          onAdd={() => onAddItem?.("disbursement", { lineType: "use" })}
        />
      </div>
    </div>
  );
}

export function CashSettlementForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const receipts = lineItems.filter(li => li.lineType === "source");
  const payments = lineItems.filter(li => li.lineType === "use");
  const totalReceipts = sumItems(receipts);
  const totalPayments = sumItems(payments);
  const net = totalReceipts - totalPayments;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Cash Settlement Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Receipts</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-cash-receipts">{formatCurrency(totalReceipts.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Payments</Label>
              <p className="text-sm font-mono font-bold text-red-500" data-testid="text-cash-payments">{formatCurrency(totalPayments.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Net Settlement</Label>
              <p className={`text-sm font-mono font-bold ${net >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-cash-net">
                {formatCurrency(net.toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <SectionBlock
          title="Receipts"
          icon={<ArrowUpRight className="h-4 w-4 text-green-500" />}
          items={receipts}
          onAdd={() => onAddItem?.("receipt", { lineType: "source" })}
        />
        <SectionBlock
          title="Payments"
          icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
          items={payments}
          onAdd={() => onAddItem?.("payment", { lineType: "use" })}
        />
      </div>
    </div>
  );
}

export function getStatementTypeForm(statementType: string): React.ComponentType<StatementFormProps> | null {
  switch (statementType) {
    case "closing_disclosure":
      return ClosingDisclosureForm;
    case "hud1":
    case "hud1a":
      return Hud1Form;
    case "alta_combined":
    case "alta_buyer":
    case "alta_seller":
      return AltaForm;
    case "sources_uses":
      return SourcesUsesForm;
    case "funds_flow":
      return FundsFlowForm;
    case "exchange_1031":
      return Exchange1031Form;
    case "portfolio":
    case "capital_stack":
    case "investor_waterfall":
      return PortfolioForm;
    case "lender_funding":
      return LenderFundingForm;
    case "cash_settlement":
    case "commercial":
      return CashSettlementForm;
    default:
      return null;
  }
}
