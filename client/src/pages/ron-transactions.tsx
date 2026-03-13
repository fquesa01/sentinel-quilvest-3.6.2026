import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Stamp,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { RonTransaction } from "@shared/schema";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  pending_idv: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_idv: "Pending IDV",
  ready: "Ready",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

const typeLabels: Record<string, string> = {
  general_notarization: "General Notarization",
  real_estate_closing: "Real Estate Closing",
  loan_signing: "Loan Signing",
  power_of_attorney: "Power of Attorney",
  estate_planning: "Estate Planning",
  corporate_documents: "Corporate Documents",
  affidavit: "Affidavit",
  other: "Other",
};

export default function RonTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions, isLoading, isError } = useQuery<RonTransaction[]>({
    queryKey: ["/api/ron/transactions"],
  });

  const filtered = transactions?.filter((txn) => {
    const matchesSearch =
      !searchTerm ||
      (txn.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.jurisdiction || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive opacity-70" />
            <p className="font-medium text-destructive" data-testid="text-transactions-error">Failed to load transactions</p>
            <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="ron-transactions-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/ron/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-ron-transactions-title">
              Notarization Transactions
            </h1>
            <p className="text-muted-foreground">
              {filtered?.length ?? 0} transaction{(filtered?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Link href="/ron/transactions/new">
          <Button data-testid="button-create-transaction">
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-transactions"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((txn) => (
            <Link key={txn.id} href={`/ron/transactions/${txn.id}`}>
              <Card className="hover-elevate active-elevate-2 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Stamp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate" data-testid={`txn-title-${txn.id}`}>
                          {txn.title || "Untitled Transaction"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {txn.jurisdiction || "No jurisdiction"}
                          </span>
                          <span>
                            {typeLabels[txn.transactionType || ""] || txn.transactionType?.replace(/_/g, " ") || "General"}
                          </span>
                          {txn.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(txn.createdAt), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusColors[txn.status] || statusColors.draft}>
                      {statusLabels[txn.status] || txn.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Stamp className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No transactions found</p>
            <p className="text-sm mt-1">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first notarization transaction"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Link href="/ron/transactions/new">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="h-4 w-4 mr-2" />
                  New Transaction
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
