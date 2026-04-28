import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Users, FileText, ExternalLink } from "lucide-react";

interface ContactRef {
  contact: {
    id: string;
    fullName: string;
    company: string | null;
    jobTitle: string | null;
    email: string | null;
  };
  role: string;
  confidence: number;
}

interface KbEntry {
  id: string;
  title: string | null;
  documentType: string;
  summary: string | null;
  dealValue: string | null;
  dealDate: string | null;
  tags: string[] | null;
  companiesMentioned: string[] | null;
}

interface RelatedDeal {
  kbEntry: KbEntry;
  score: number;
  matchReasons: string[];
  contacts: ContactRef[];
}

interface OverlookedContact {
  contact: ContactRef["contact"];
  pastDeals: Array<{ kbEntryId: string; title: string | null; role: string }>;
}

interface ProfileLite {
  id: string;
  name: string;
}

interface RelatedContextResponse {
  data: {
    deal: {
      id: string;
      name: string;
      sector: string;
      subsector: string | null;
      geography: string;
      dealType: string;
      enterpriseValue: string | null;
    };
    profile: ProfileLite | null;
    relatedDeals: RelatedDeal[];
    overlookedContacts: OverlookedContact[];
    candidateCount: number;
  };
}

function formatDealValue(s: string | null) {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `$${n.toLocaleString()}`;
}

function formatDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

interface Props {
  dealId: string;
}

export function RelatedContextPanel({ dealId }: Props) {
  // profileId state: "auto" picks the highest-priority active profile;
  // "none" disables profile filtering; otherwise a specific profile UUID.
  const [profileId, setProfileId] = useState<string>("auto");

  const profilesQuery = useQuery<{ data: ProfileLite[] }>({
    queryKey: ["/api/deal-interest-profiles"],
  });

  const profileQuery = profileId === "none" ? "" : `?profileId=${encodeURIComponent(profileId)}`;
  const relatedQuery = useQuery<RelatedContextResponse>({
    queryKey: [`/api/relationship-intelligence/pe-deals/${dealId}/related-context${profileQuery}`],
  });

  const profiles = profilesQuery.data?.data ?? [];
  const data = relatedQuery.data?.data;

  return (
    <div className="space-y-4" data-testid="related-context-panel">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Related Past Deals & Contacts
              </CardTitle>
              <CardDescription>
                Past deals from your knowledge base that look like this one, plus the people who worked on them.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Filter by profile</span>
              <Select value={profileId} onValueChange={setProfileId}>
                <SelectTrigger className="w-[220px]" data-testid="select-profile">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (highest priority)</SelectItem>
                  <SelectItem value="none">No profile filter</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {data?.profile && (
            <p className="text-xs text-muted-foreground mt-2">
              Filtering with profile <span className="font-medium">{data.profile.name}</span>.
              Searched {data.candidateCount} prior deal-flavored entries.
            </p>
          )}
          {!data?.profile && data && (
            <p className="text-xs text-muted-foreground mt-2">
              No profile filter applied. Searched {data.candidateCount} prior deal-flavored entries.
            </p>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Past similar deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedQuery.isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !data || data.relatedDeals.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground" data-testid="text-no-related-deals">
                  <p>No similar past deals surfaced.</p>
                  <p className="text-xs mt-1">
                    Try a different profile, or ingest more deal documents into the knowledge base.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.relatedDeals.map((m) => (
                    <RelatedDealRow key={m.kbEntry.id} match={m} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Overlooked contacts
            </CardTitle>
            <CardDescription className="text-xs">
              People from your past similar deals — worth reaching out to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {relatedQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !data || data.overlookedContacts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm" data-testid="text-no-overlooked">
                No matching contacts found.
              </div>
            ) : (
              <div className="space-y-2">
                {data.overlookedContacts.slice(0, 10).map((oc) => (
                  <OverlookedContactRow key={oc.contact.id} oc={oc} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RelatedDealRow({ match }: { match: RelatedDeal }) {
  const { kbEntry, score, matchReasons, contacts } = match;
  const value = formatDealValue(kbEntry.dealValue);
  const date = formatDate(kbEntry.dealDate);

  return (
    <div
      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
      data-testid={`row-related-deal-${kbEntry.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{kbEntry.title || "(untitled)"}</h4>
            <Badge variant="outline" className="text-xs">{kbEntry.documentType}</Badge>
          </div>
          {kbEntry.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kbEntry.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            {value && <span>{value}</span>}
            {date && <span>{date}</span>}
            {(kbEntry.companiesMentioned ?? []).slice(0, 2).map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {score.toFixed(1)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-0.5 max-w-xs">
                {matchReasons.length === 0 ? (
                  <div>No specific reasons</div>
                ) : (
                  matchReasons.map((r, i) => <div key={i}>• {r}</div>)
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {contacts.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {contacts.slice(0, 6).map((c) => (
            <Badge key={c.contact.id} variant="outline" className="text-xs font-normal">
              {c.contact.fullName}
              {c.role && c.role !== "mentioned" && (
                <span className="ml-1 text-muted-foreground">· {c.role}</span>
              )}
            </Badge>
          ))}
          {contacts.length > 6 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{contacts.length - 6} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function OverlookedContactRow({ oc }: { oc: OverlookedContact }) {
  return (
    <Link
      href={`/relationship-contacts?focus=${oc.contact.id}`}
      className="block border rounded-md p-2.5 hover:bg-muted/30 transition-colors"
      data-testid={`row-overlooked-${oc.contact.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{oc.contact.fullName}</div>
          {(oc.contact.company || oc.contact.jobTitle) && (
            <div className="text-xs text-muted-foreground truncate">
              {[oc.contact.jobTitle, oc.contact.company].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-0.5">
            {oc.pastDeals.length} past deal{oc.pastDeals.length === 1 ? "" : "s"}
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}
