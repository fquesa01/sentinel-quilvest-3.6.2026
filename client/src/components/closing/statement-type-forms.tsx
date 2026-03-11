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
  side: string;
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
  const sources = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const uses = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");
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
            onAdd={() => onAddItem?.("source", { side: "source" })}
          />
        </div>
        <div className="space-y-3">
          <SectionBlock
            title="Uses of Funds"
            icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
            items={uses}
            onAdd={() => onAddItem?.("use", { side: "use" })}
          />
        </div>
      </div>
    </div>
  );
}

export function FundsFlowForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const incoming = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const outgoing = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");
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
            onAdd={() => onAddItem?.("incoming", { side: "source" })}
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
            onAdd={() => onAddItem?.("outgoing", { side: "use" })}
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
  const relinquished = lineItems.filter(li => li.hudSection === "relinquished" || (li.side === "source" && !li.hudSection));
  const replacement = lineItems.filter(li => li.hudSection === "replacement" || (li.side === "use" && !li.hudSection));
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
          onAdd={() => onAddItem?.("relinquished", { hudSection: "relinquished", side: "source" })}
        />
        <Separator />
        <SectionBlock
          title="Replacement Property Costs"
          icon={<Home className="h-4 w-4 text-blue-500" />}
          items={replacement}
          onAdd={() => onAddItem?.("replacement", { hudSection: "replacement", side: "use" })}
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
  const summaryItems = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit" || li.hudSection === "summary");
  const allocations = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit" || li.hudSection === "allocation");

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
            onAdd={() => onAddItem?.("summary", { side: "source", hudSection: "summary" })}
          />
        </div>
        <div className="space-y-3">
          <SectionBlock
            title="Allocations"
            icon={<Layers className="h-4 w-4 text-blue-500" />}
            items={allocations}
            onAdd={() => onAddItem?.("allocation", { side: "use", hudSection: "allocation" })}
          />
        </div>
      </div>
    </div>
  );
}

export function LenderFundingForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const loanProceeds = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const disbursements = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");
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
          onAdd={() => onAddItem?.("proceeds", { side: "source" })}
        />
        <SectionBlock
          title="Disbursements"
          icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
          items={disbursements}
          onAdd={() => onAddItem?.("disbursement", { side: "use" })}
        />
      </div>
    </div>
  );
}

export function CashSettlementForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const receipts = lineItems.filter(li => li.side === "source" || li.side === "buyer_credit" || li.side === "seller_credit");
  const payments = lineItems.filter(li => li.side === "use" || li.side === "buyer_debit" || li.side === "seller_debit");
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
          onAdd={() => onAddItem?.("receipt", { side: "source" })}
        />
        <SectionBlock
          title="Payments"
          icon={<ArrowDownRight className="h-4 w-4 text-red-500" />}
          items={payments}
          onAdd={() => onAddItem?.("payment", { side: "use" })}
        />
      </div>
    </div>
  );
}

export function ConstructionSourcesUsesForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const hardCosts = lineItems.filter(li => li.hudSection === "hard_costs" || li.altaCategory === "hard_costs");
  const softCosts = lineItems.filter(li => li.hudSection === "soft_costs" || li.altaCategory === "soft_costs");
  const interestReserves = lineItems.filter(li => li.hudSection === "interest_reserve" || li.altaCategory === "interest_reserve");
  const developerFees = lineItems.filter(li => li.hudSection === "developer_fees" || li.altaCategory === "developer_fees");
  const contingency = lineItems.filter(li => li.hudSection === "contingency" || li.altaCategory === "contingency");
  const sources = lineItems.filter(li => li.side === "source" && !li.hudSection && !li.altaCategory);
  const totalCosts = sumItems(hardCosts) + sumItems(softCosts) + sumItems(interestReserves) + sumItems(developerFees) + sumItems(contingency);
  const totalSources = sumItems(sources);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Construction Sources & Uses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Project Cost</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-const-total-cost">{formatCurrency(totalCosts.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Sources</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-const-total-sources">{formatCurrency(totalSources.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Variance</Label>
              <p className={`text-sm font-mono font-bold ${Math.abs(totalSources - totalCosts) < 0.01 ? "text-green-500" : "text-red-500"}`} data-testid="text-const-variance">
                {formatCurrency((totalSources - totalCosts).toString())}
                {Math.abs(totalSources - totalCosts) < 0.01 && <Badge variant="outline" className="ml-2 text-green-500">Balanced</Badge>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Uses of Funds</h3>
        <SectionBlock title="Hard Costs" icon={<Building2 className="h-4 w-4 text-blue-500" />} items={hardCosts}
          onAdd={() => onAddItem?.("hard_costs", { hudSection: "hard_costs", side: "use" })} />
        <Separator />
        <SectionBlock title="Soft Costs" icon={<FileText className="h-4 w-4 text-purple-500" />} items={softCosts}
          onAdd={() => onAddItem?.("soft_costs", { hudSection: "soft_costs", side: "use" })} />
        <Separator />
        <SectionBlock title="Interest Reserves" icon={<Percent className="h-4 w-4 text-amber-500" />} items={interestReserves}
          onAdd={() => onAddItem?.("interest_reserve", { hudSection: "interest_reserve", side: "use" })} />
        <Separator />
        <SectionBlock title="Developer Fees" icon={<DollarSign className="h-4 w-4 text-teal-500" />} items={developerFees}
          onAdd={() => onAddItem?.("developer_fees", { hudSection: "developer_fees", side: "use" })} />
        <Separator />
        <SectionBlock title="Contingency" icon={<Scale className="h-4 w-4 text-orange-500" />} items={contingency}
          onAdd={() => onAddItem?.("contingency", { hudSection: "contingency", side: "use" })} />
      </div>

      <Separator />
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Sources of Funds</h3>
        <SectionBlock title="Funding Sources" icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} items={sources}
          onAdd={() => onAddItem?.("source", { side: "source" })} />
      </div>
    </div>
  );
}

export function ConstructionDrawForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const draws = lineItems.filter(li => li.hudSection === "draw" || li.altaCategory === "draw");
  const retainage = lineItems.filter(li => li.hudSection === "retainage" || li.altaCategory === "retainage");
  const changeOrders = lineItems.filter(li => li.hudSection === "change_order" || li.altaCategory === "change_order");
  const totalDrawn = sumItems(draws);
  const totalRetainage = sumItems(retainage);
  const loanAmt = parseFloat((closing.loanAmount || "0").replace(/[,$\s]/g, "")) || 0;
  const remaining = loanAmt - totalDrawn;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Construction Draw Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Commitment</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-draw-commitment">{formatCurrency(closing.loanAmount)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Drawn</Label>
              <p className="text-sm font-mono font-bold text-amber-500" data-testid="text-draw-total">{formatCurrency(totalDrawn.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Retainage Held</Label>
              <p className="text-sm font-mono font-bold text-orange-500" data-testid="text-draw-retainage">{formatCurrency(totalRetainage.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Remaining Balance</Label>
              <p className={`text-sm font-mono font-bold ${remaining >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-draw-remaining">
                {formatCurrency(remaining.toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock title="Draw Requests" icon={<ArrowDownRight className="h-4 w-4 text-blue-500" />} items={draws}
          onAdd={() => onAddItem?.("draw", { hudSection: "draw", side: "use" })} />
        <Separator />
        <SectionBlock title="Retainage" icon={<Scale className="h-4 w-4 text-orange-500" />} items={retainage}
          onAdd={() => onAddItem?.("retainage", { hudSection: "retainage", side: "use" })} />
        <Separator />
        <SectionBlock title="Change Orders" icon={<FileText className="h-4 w-4 text-purple-500" />} items={changeOrders}
          onAdd={() => onAddItem?.("change_order", { hudSection: "change_order", side: "use" })} />
      </div>
    </div>
  );
}

export function CMBSFundingMemoForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const seniorTranche = lineItems.filter(li => li.hudSection === "senior_tranche" || li.altaCategory === "senior_tranche");
  const mezzTranche = lineItems.filter(li => li.hudSection === "mezz_tranche" || li.altaCategory === "mezz_tranche");
  const prefEquity = lineItems.filter(li => li.hudSection === "pref_equity" || li.altaCategory === "pref_equity");
  const defeasance = lineItems.filter(li => li.hudSection === "defeasance" || li.altaCategory === "defeasance");
  const disbursements = lineItems.filter(li => li.side === "use" && !li.hudSection && !li.altaCategory);
  const totalFunding = sumItems(seniorTranche) + sumItems(mezzTranche) + sumItems(prefEquity);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> CMBS Funding Memo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Funding</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-cmbs-total">{formatCurrency(totalFunding.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Loan Amount</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-cmbs-loan">{formatCurrency(closing.loanAmount)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="text-sm font-medium" data-testid="text-cmbs-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Tranche Funding</h3>
        <SectionBlock title="Senior Tranche (A-Note)" icon={<Layers className="h-4 w-4 text-blue-500" />} items={seniorTranche}
          onAdd={() => onAddItem?.("senior_tranche", { hudSection: "senior_tranche", side: "source" })} />
        <Separator />
        <SectionBlock title="Mezzanine Tranche (B-Note)" icon={<Layers className="h-4 w-4 text-purple-500" />} items={mezzTranche}
          onAdd={() => onAddItem?.("mezz_tranche", { hudSection: "mezz_tranche", side: "source" })} />
        <Separator />
        <SectionBlock title="Preferred Equity" icon={<Layers className="h-4 w-4 text-teal-500" />} items={prefEquity}
          onAdd={() => onAddItem?.("pref_equity", { hudSection: "pref_equity", side: "source" })} />
        <Separator />
        <SectionBlock title="Defeasance / Yield Maintenance" icon={<Percent className="h-4 w-4 text-amber-500" />} items={defeasance}
          onAdd={() => onAddItem?.("defeasance", { hudSection: "defeasance", side: "use" })} />
      </div>

      <Separator />
      <SectionBlock title="Disbursements" icon={<ArrowDownRight className="h-4 w-4 text-red-500" />} items={disbursements}
        onAdd={() => onAddItem?.("disbursement", { side: "use" })} />
    </div>
  );
}

export function CapitalStackForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const seniorDebt = lineItems.filter(li => li.hudSection === "senior_debt" || li.altaCategory === "senior_debt");
  const mezzDebt = lineItems.filter(li => li.hudSection === "mezz_debt" || li.altaCategory === "mezz_debt");
  const prefEquity = lineItems.filter(li => li.hudSection === "pref_equity" || li.altaCategory === "pref_equity");
  const sponsorEquity = lineItems.filter(li => li.hudSection === "sponsor_equity" || li.altaCategory === "sponsor_equity");
  const totalStack = sumItems(seniorDebt) + sumItems(mezzDebt) + sumItems(prefEquity) + sumItems(sponsorEquity);
  const purchasePrice = parseFloat((closing.purchasePrice || "0").replace(/[,$\s]/g, "")) || 0;
  const ltv = purchasePrice > 0 ? ((sumItems(seniorDebt) / purchasePrice) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Capital Stack Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Capitalization</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-capstack-total">{formatCurrency(totalStack.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Purchase Price</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-capstack-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Senior LTV</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-capstack-ltv">{ltv.toFixed(1)}%</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Variance</Label>
              <p className={`text-sm font-mono font-bold ${Math.abs(totalStack - purchasePrice) < 0.01 ? "text-green-500" : "text-red-500"}`} data-testid="text-capstack-variance">
                {formatCurrency((totalStack - purchasePrice).toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock title="Senior Debt" icon={<Layers className="h-4 w-4 text-blue-500" />} items={seniorDebt}
          onAdd={() => onAddItem?.("senior_debt", { hudSection: "senior_debt", side: "source" })} />
        <Separator />
        <SectionBlock title="Mezzanine Debt" icon={<Layers className="h-4 w-4 text-purple-500" />} items={mezzDebt}
          onAdd={() => onAddItem?.("mezz_debt", { hudSection: "mezz_debt", side: "source" })} />
        <Separator />
        <SectionBlock title="Preferred Equity" icon={<Layers className="h-4 w-4 text-teal-500" />} items={prefEquity}
          onAdd={() => onAddItem?.("pref_equity", { hudSection: "pref_equity", side: "source" })} />
        <Separator />
        <SectionBlock title="Sponsor / Common Equity" icon={<DollarSign className="h-4 w-4 text-green-500" />} items={sponsorEquity}
          onAdd={() => onAddItem?.("sponsor_equity", { hudSection: "sponsor_equity", side: "source" })} />
      </div>
    </div>
  );
}

export function InvestorWaterfallForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const returnOfCapital = lineItems.filter(li => li.hudSection === "return_of_capital");
  const prefReturn = lineItems.filter(li => li.hudSection === "pref_return");
  const catchUp = lineItems.filter(li => li.hudSection === "catch_up");
  const promote = lineItems.filter(li => li.hudSection === "promote");
  const residualSplit = lineItems.filter(li => li.hudSection === "residual_split");
  const totalDistributed = sumItems(returnOfCapital) + sumItems(prefReturn) + sumItems(catchUp) + sumItems(promote) + sumItems(residualSplit);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Investor Distribution Waterfall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Distributed</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-waterfall-total">{formatCurrency(totalDistributed.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Purchase Price</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-waterfall-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Closing Date</Label>
              <p className="text-sm font-medium" data-testid="text-waterfall-date">{closing.closingDate || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Waterfall Tiers</h3>
        <SectionBlock title="Tier 1: Return of Capital" icon={<ArrowUpRight className="h-4 w-4 text-blue-500" />} items={returnOfCapital}
          onAdd={() => onAddItem?.("return_of_capital", { hudSection: "return_of_capital", side: "use" })} />
        <Separator />
        <SectionBlock title="Tier 2: Preferred Return" icon={<Percent className="h-4 w-4 text-teal-500" />} items={prefReturn}
          onAdd={() => onAddItem?.("pref_return", { hudSection: "pref_return", side: "use" })} />
        <Separator />
        <SectionBlock title="Tier 3: GP Catch-Up" icon={<ArrowUpRight className="h-4 w-4 text-purple-500" />} items={catchUp}
          onAdd={() => onAddItem?.("catch_up", { hudSection: "catch_up", side: "use" })} />
        <Separator />
        <SectionBlock title="Tier 4: Promote / Carried Interest" icon={<DollarSign className="h-4 w-4 text-amber-500" />} items={promote}
          onAdd={() => onAddItem?.("promote", { hudSection: "promote", side: "use" })} />
        <Separator />
        <SectionBlock title="Tier 5: Residual Split" icon={<Scale className="h-4 w-4 text-green-500" />} items={residualSplit}
          onAdd={() => onAddItem?.("residual_split", { hudSection: "residual_split", side: "use" })} />
      </div>
    </div>
  );
}

export function GroundLeaseForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const prepaidRent = lineItems.filter(li => li.hudSection === "prepaid_rent" || li.altaCategory === "prepaid_rent");
  const leaseholdFinancing = lineItems.filter(li => li.hudSection === "leasehold_financing" || li.altaCategory === "leasehold_financing");
  const leaseholdTaxes = lineItems.filter(li => li.hudSection === "leasehold_taxes" || li.altaCategory === "leasehold_taxes");
  const closingCosts = lineItems.filter(li => li.hudSection === "closing_costs" || li.altaCategory === "closing_costs");
  const deposits = lineItems.filter(li => li.side === "source" && !li.hudSection && !li.altaCategory);
  const totalCosts = sumItems(prepaidRent) + sumItems(leaseholdFinancing) + sumItems(leaseholdTaxes) + sumItems(closingCosts);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="h-4 w-4" /> Ground Lease Closing Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="text-sm font-medium" data-testid="text-gl-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Closing Costs</Label>
              <p className="text-sm font-mono font-bold text-red-500" data-testid="text-gl-costs">{formatCurrency(totalCosts.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Deposits / Sources</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-gl-sources">{formatCurrency(sumItems(deposits).toString())}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock title="Prepaid Rent" icon={<DollarSign className="h-4 w-4 text-blue-500" />} items={prepaidRent}
          onAdd={() => onAddItem?.("prepaid_rent", { hudSection: "prepaid_rent", side: "use" })} />
        <Separator />
        <SectionBlock title="Leasehold Financing" icon={<Building2 className="h-4 w-4 text-purple-500" />} items={leaseholdFinancing}
          onAdd={() => onAddItem?.("leasehold_financing", { hudSection: "leasehold_financing", side: "use" })} />
        <Separator />
        <SectionBlock title="Leasehold Taxes & Assessments" icon={<Percent className="h-4 w-4 text-amber-500" />} items={leaseholdTaxes}
          onAdd={() => onAddItem?.("leasehold_taxes", { hudSection: "leasehold_taxes", side: "use" })} />
        <Separator />
        <SectionBlock title="Closing Costs" icon={<FileText className="h-4 w-4 text-orange-500" />} items={closingCosts}
          onAdd={() => onAddItem?.("closing_costs", { hudSection: "closing_costs", side: "use" })} />
        <Separator />
        <SectionBlock title="Deposits & Funding" icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} items={deposits}
          onAdd={() => onAddItem?.("deposit", { side: "source" })} />
      </div>
    </div>
  );
}

export function MasterClosingForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const buyerCharges = lineItems.filter(li => li.side === "buyer_debit");
  const buyerCredits = lineItems.filter(li => li.side === "buyer_credit");
  const sellerCharges = lineItems.filter(li => li.side === "seller_debit");
  const sellerCredits = lineItems.filter(li => li.side === "seller_credit");
  const sources = lineItems.filter(li => li.side === "source");
  const uses = lineItems.filter(li => li.side === "use");
  const totalBuyerNet = sumItems(buyerCredits) - sumItems(buyerCharges);
  const totalSellerNet = sumItems(sellerCredits) - sumItems(sellerCharges);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Master Closing Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <p className="text-sm font-medium" data-testid="text-master-property">{closing.propertyAddress || "Not specified"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Purchase Price</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-master-price">{formatCurrency(closing.purchasePrice)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Buyer Net</Label>
              <p className={`text-sm font-mono font-bold ${totalBuyerNet >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-master-buyer-net">
                {formatCurrency(totalBuyerNet.toString())}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Seller Net</Label>
              <p className={`text-sm font-mono font-bold ${totalSellerNet >= 0 ? "text-green-500" : "text-red-500"}`} data-testid="text-master-seller-net">
                {formatCurrency(totalSellerNet.toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Buyer&apos;s Statement</h3>
          <SectionBlock title="Buyer Credits" icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} items={buyerCredits}
            onAdd={() => onAddItem?.("buyer_credit", { side: "buyer_credit" })} />
          <Separator />
          <SectionBlock title="Buyer Charges" icon={<ArrowDownRight className="h-4 w-4 text-red-500" />} items={buyerCharges}
            onAdd={() => onAddItem?.("buyer_debit", { side: "buyer_debit" })} />
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Seller&apos;s Statement</h3>
          <SectionBlock title="Seller Credits" icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} items={sellerCredits}
            onAdd={() => onAddItem?.("seller_credit", { side: "seller_credit" })} />
          <Separator />
          <SectionBlock title="Seller Charges" icon={<ArrowDownRight className="h-4 w-4 text-red-500" />} items={sellerCharges}
            onAdd={() => onAddItem?.("seller_debit", { side: "seller_debit" })} />
        </div>
      </div>

      <Separator />
      <div className="grid grid-cols-2 gap-6">
        <SectionBlock title="Sources" icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} items={sources}
          onAdd={() => onAddItem?.("source", { side: "source" })} />
        <SectionBlock title="Uses" icon={<ArrowDownRight className="h-4 w-4 text-red-500" />} items={uses}
          onAdd={() => onAddItem?.("use", { side: "use" })} />
      </div>
    </div>
  );
}

export function REITContributionForm({ closing, lineItems, onAddItem }: StatementFormProps) {
  const contributedAssets = lineItems.filter(li => li.hudSection === "contributed_assets" || li.altaCategory === "contributed_assets");
  const opUnits = lineItems.filter(li => li.hudSection === "op_units" || li.altaCategory === "op_units");
  const assumedLiabilities = lineItems.filter(li => li.hudSection === "assumed_liabilities" || li.altaCategory === "assumed_liabilities");
  const cashConsideration = lineItems.filter(li => li.hudSection === "cash_consideration" || li.altaCategory === "cash_consideration");
  const closingAdj = lineItems.filter(li => li.hudSection === "closing_adjustments" || li.altaCategory === "closing_adjustments");
  const totalAssets = sumItems(contributedAssets);
  const totalConsideration = sumItems(opUnits) + sumItems(cashConsideration);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4" /> REIT Contribution Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Contributed Asset Value</Label>
              <p className="text-sm font-mono font-bold" data-testid="text-reit-assets">{formatCurrency(totalAssets.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Consideration</Label>
              <p className="text-sm font-mono font-bold text-green-500" data-testid="text-reit-consideration">{formatCurrency(totalConsideration.toString())}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Variance</Label>
              <p className={`text-sm font-mono font-bold ${Math.abs(totalAssets - totalConsideration) < 0.01 ? "text-green-500" : "text-red-500"}`} data-testid="text-reit-variance">
                {formatCurrency((totalAssets - totalConsideration).toString())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <SectionBlock title="Contributed Assets" icon={<Building2 className="h-4 w-4 text-blue-500" />} items={contributedAssets}
          onAdd={() => onAddItem?.("contributed_assets", { hudSection: "contributed_assets", side: "source" })} />
        <Separator />
        <SectionBlock title="OP Units Issued" icon={<Layers className="h-4 w-4 text-purple-500" />} items={opUnits}
          onAdd={() => onAddItem?.("op_units", { hudSection: "op_units", side: "use" })} />
        <Separator />
        <SectionBlock title="Assumed Liabilities" icon={<CreditCard className="h-4 w-4 text-red-500" />} items={assumedLiabilities}
          onAdd={() => onAddItem?.("assumed_liabilities", { hudSection: "assumed_liabilities", side: "use" })} />
        <Separator />
        <SectionBlock title="Cash Consideration" icon={<DollarSign className="h-4 w-4 text-green-500" />} items={cashConsideration}
          onAdd={() => onAddItem?.("cash_consideration", { hudSection: "cash_consideration", side: "use" })} />
        <Separator />
        <SectionBlock title="Closing Adjustments" icon={<Scale className="h-4 w-4 text-amber-500" />} items={closingAdj}
          onAdd={() => onAddItem?.("closing_adjustments", { hudSection: "closing_adjustments", side: "use" })} />
      </div>
    </div>
  );
}

export function getStatementTypeForm(statementType: string): React.ComponentType<StatementFormProps> | null {
  switch (statementType) {
    case "closing_disclosure":
    case "seller_closing_disclosure":
      return ClosingDisclosureForm;
    case "hud1":
    case "hud1a":
      return Hud1Form;
    case "alta_combined":
    case "alta_buyer":
    case "alta_seller":
      return AltaForm;
    case "sources_and_uses":
      return SourcesUsesForm;
    case "construction_sources_uses":
      return ConstructionSourcesUsesForm;
    case "construction_draw":
      return ConstructionDrawForm;
    case "cmbs_funding_memo":
      return CMBSFundingMemoForm;
    case "capital_stack":
      return CapitalStackForm;
    case "investor_waterfall":
      return InvestorWaterfallForm;
    case "ground_lease_closing":
      return GroundLeaseForm;
    case "master_closing":
      return MasterClosingForm;
    case "funds_flow":
      return FundsFlowForm;
    case "1031_exchange":
    case "qi_statement":
      return Exchange1031Form;
    case "portfolio_settlement":
      return PortfolioForm;
    case "lender_funding":
      return LenderFundingForm;
    case "cash_settlement":
      return CashSettlementForm;
    default:
      return null;
  }
}
