import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, ArrowRight } from "lucide-react";

interface ProrationCalculatorProps {
  closingDate?: string;
  onApply?: (data: {
    itemName: string;
    annualAmount: string;
    periodStartDate: string;
    periodEndDate: string;
    prorateDate: string;
    method: string;
  }) => void;
}

export function ProrationCalculator({ closingDate, onApply }: ProrationCalculatorProps) {
  const [itemName, setItemName] = useState("Property Taxes");
  const [annualAmount, setAnnualAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [prorateDate, setProrateDate] = useState(closingDate || "");
  const [method, setMethod] = useState("calendar_day");

  const computed = useMemo(() => {
    const annual = parseFloat(annualAmount.replace(/[,$\s]/g, "")) || 0;
    if (!annual || !periodStart || !periodEnd || !prorateDate) {
      return null;
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const prorate = new Date(prorateDate);

    const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyRate = annual / (method === "calendar_day" ? 365 : 360);
    const rawSellerDays = Math.ceil((prorate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const sellerDays = Math.max(0, Math.min(rawSellerDays, daysInPeriod));
    const buyerDays = Math.max(0, daysInPeriod - sellerDays);

    return {
      dailyRate: dailyRate.toFixed(4),
      sellerDays,
      buyerDays,
      daysInPeriod,
      sellerShare: (dailyRate * sellerDays).toFixed(2),
      buyerShare: (dailyRate * buyerDays).toFixed(2),
    };
  }, [annualAmount, periodStart, periodEnd, prorateDate, method]);

  const presets = [
    { name: "Property Taxes", start: "01-01", end: "12-31" },
    { name: "HOA Dues", start: "01-01", end: "12-31" },
    { name: "Insurance", start: "", end: "" },
    { name: "Rent", start: "01-01", end: "01-31" },
  ];

  function applyPreset(preset: typeof presets[0]) {
    setItemName(preset.name);
    if (preset.start && prorateDate) {
      const year = prorateDate.substring(0, 4);
      setPeriodStart(`${year}-${preset.start}`);
      setPeriodEnd(`${year}-${preset.end}`);
    }
  }

  function formatCurrency(val: string): string {
    const n = parseFloat(val);
    if (isNaN(n)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" /> Proration Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <Badge
              key={preset.name}
              variant="outline"
              className="cursor-pointer hover-elevate"
              onClick={() => applyPreset(preset)}
              data-testid={`badge-preset-${preset.name.toLowerCase().replace(/\s/g, "-")}`}
            >
              {preset.name}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Item Name</Label>
            <Input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="e.g. Property Taxes"
              data-testid="input-calc-item-name"
            />
          </div>
          <div>
            <Label className="text-xs">Annual Amount</Label>
            <Input
              value={annualAmount}
              onChange={e => setAnnualAmount(e.target.value)}
              placeholder="e.g. 12,000"
              data-testid="input-calc-annual-amount"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Period Start</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              data-testid="input-calc-period-start"
            />
          </div>
          <div>
            <Label className="text-xs">Period End</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              data-testid="input-calc-period-end"
            />
          </div>
          <div>
            <Label className="text-xs">Prorate Date</Label>
            <Input
              type="date"
              value={prorateDate}
              onChange={e => setProrateDate(e.target.value)}
              data-testid="input-calc-prorate-date"
            />
          </div>
          <div>
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-calc-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar_day">365-Day</SelectItem>
                <SelectItem value="banker_day">360-Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {computed && (
          <div className="bg-muted/50 rounded-md p-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Daily Rate</p>
                <p className="font-mono font-medium" data-testid="text-calc-daily-rate">${computed.dailyRate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days in Period</p>
                <p className="font-mono font-medium" data-testid="text-calc-days-in-period">{computed.daysInPeriod}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Annual Amount</p>
                <p className="font-mono font-medium">{formatCurrency(annualAmount.replace(/[,$\s]/g, ""))}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex-1 text-center bg-red-500/10 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Seller Portion</p>
                <p className="text-lg font-bold font-mono text-red-500" data-testid="text-calc-seller-share">{formatCurrency(computed.sellerShare)}</p>
                <p className="text-xs text-muted-foreground">{computed.sellerDays} days</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-center bg-green-500/10 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-1">Buyer Portion</p>
                <p className="text-lg font-bold font-mono text-green-500" data-testid="text-calc-buyer-share">{formatCurrency(computed.buyerShare)}</p>
                <p className="text-xs text-muted-foreground">{computed.buyerDays} days</p>
              </div>
            </div>

            {onApply && (
              <button
                className="w-full text-sm text-primary hover:underline mt-2"
                onClick={() => onApply({
                  itemName,
                  annualAmount: annualAmount.replace(/[,$\s]/g, ""),
                  periodStartDate: periodStart,
                  periodEndDate: periodEnd,
                  prorateDate,
                  method,
                })}
                data-testid="button-calc-apply"
              >
                Add as proration item
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
