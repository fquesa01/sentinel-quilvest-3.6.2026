import type { Express, RequestHandler } from "express";
import { db } from "../db";
import {
  peDeals,
  knowledgeBaseEntries,
  contactDealAssociations,
  relationshipContacts,
  dealInterestProfiles,
} from "@shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";

// =============================================================================
// Related Past Deals & Contacts
//
// Given a current PE deal, surface the most similar prior knowledge_base_entries
// and the people who were associated with those past deals — the "Charles, you
// had 6 of these in the past" experience.
//
// v1 ranks entirely in SQL/TS without LLM rerank to keep cost at $0. Scoring is
// transparent: each match reason contributes a fixed weight, and reasons are
// returned to the client so the UI can explain *why* something was surfaced.
// =============================================================================

const KB_DEAL_DOC_TYPES = ["deal", "transaction", "memo", "due_diligence"] as const;

const W_TAG_OVERLAP = 3;       // per overlap between deal/profile terms and KB tags/entities
const W_DEAL_TYPE_MATCH = 2;   // KB entry's tags include the current deal type
const W_VALUE_IN_RANGE = 2;    // KB.dealValue lies inside profile min/max
const W_RECENCY_MAX = 2;       // 0..2; full weight for current year, decays over 10 years

interface RankedMatch {
  kbEntry: typeof knowledgeBaseEntries.$inferSelect;
  score: number;
  matchReasons: string[];
  contacts: Array<{
    contact: typeof relationshipContacts.$inferSelect;
    role: string;
    confidence: number;
  }>;
}

interface OverlookedContact {
  contact: typeof relationshipContacts.$inferSelect;
  pastDeals: Array<{ kbEntryId: string; title: string | null; role: string }>;
}

function lower(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function lowerArr(arr: string[] | null | undefined): string[] {
  return (arr ?? []).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
}

function parseDealValue(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function recencyScore(dealDate: string | null): number {
  if (!dealDate) return 0;
  const d = new Date(dealDate);
  if (Number.isNaN(d.getTime())) return 0;
  const yearsAgo = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsAgo < 0) return W_RECENCY_MAX;
  if (yearsAgo > 10) return 0;
  return Math.max(0, W_RECENCY_MAX * (1 - yearsAgo / 10));
}

export function registerRelatedContextRoutes(app: Express, isAuthenticated: RequestHandler) {
  app.get(
    "/api/relationship-intelligence/pe-deals/:dealId/related-context",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.id;
        const { dealId } = req.params;
        const profileIdParam = (req.query.profileId as string | undefined) ?? undefined;
        const limit = Math.min(parseInt((req.query.limit as string) || "10", 10) || 10, 50);

        // ----- 1. Load the current PE deal (auth: any authenticated user can
        // read PE deals today; matches the existing /api/pe/deals/:id pattern).
        const [deal] = await db.select().from(peDeals).where(eq(peDeals.id, dealId));
        if (!deal) return res.status(404).json({ message: "Deal not found" });

        // ----- 2. Resolve the active profile, if any.
        // profileId="auto" picks the highest-priority active profile.
        // profileId=<uuid>  picks that specific profile (must belong to this user).
        // profileId omitted → no profile filter applied; ranking falls back to
        // pure deal-context signals.
        let profile: typeof dealInterestProfiles.$inferSelect | null = null;
        if (profileIdParam === "auto") {
          const [p] = await db
            .select()
            .from(dealInterestProfiles)
            .where(and(eq(dealInterestProfiles.userId, userId), eq(dealInterestProfiles.isActive, true)))
            .orderBy(dealInterestProfiles.priority, desc(dealInterestProfiles.updatedAt))
            .limit(1);
          profile = p ?? null;
        } else if (profileIdParam) {
          const [p] = await db
            .select()
            .from(dealInterestProfiles)
            .where(and(eq(dealInterestProfiles.id, profileIdParam), eq(dealInterestProfiles.userId, userId)));
          profile = p ?? null;
        }

        // ----- 3. Pull deal-flavored KB entries for this user.
        // Filtering by document type up front keeps the in-memory candidate
        // set small enough that we can score in TS without a vector index.
        const candidates = await db
          .select()
          .from(knowledgeBaseEntries)
          .where(
            and(
              eq(knowledgeBaseEntries.userId, userId),
              inArray(knowledgeBaseEntries.documentType, KB_DEAL_DOC_TYPES as unknown as string[]),
            ),
          );

        // ----- 4. Score each candidate.
        const dealTerms = new Set(
          [
            deal.sector,
            deal.subsector,
            deal.geography,
            deal.dealType,
          ]
            .map(lower)
            .filter((s) => s.length > 0),
        );
        const profileTerms = new Set([
          ...lowerArr(profile?.industries ?? []),
          ...lowerArr(profile?.keywords ?? []),
          ...lowerArr(profile?.dealTypes ?? []),
        ]);
        const matchTerms = new Set([...dealTerms, ...profileTerms]);
        const excludedTerms = new Set(lowerArr(profile?.excludedTerms ?? []));

        const profileMin = profile?.minDealValue ? Number(profile.minDealValue) : null;
        const profileMax = profile?.maxDealValue ? Number(profile.maxDealValue) : null;

        const ranked: RankedMatch[] = [];

        for (const kb of candidates) {
          const kbBag = new Set([
            ...lowerArr(kb.tags),
            ...lowerArr(kb.entitiesMentioned),
            ...lowerArr(kb.companiesMentioned),
          ]);

          // Hard-filter: skip if any excluded term shows up.
          let excludedHit = false;
          for (const term of excludedTerms) {
            if (kbBag.has(term)) {
              excludedHit = true;
              break;
            }
          }
          if (excludedHit) continue;

          let score = 0;
          const reasons: string[] = [];

          // Tag/entity overlap with deal+profile terms.
          const overlap: string[] = [];
          for (const term of matchTerms) {
            if (kbBag.has(term)) overlap.push(term);
          }
          if (overlap.length > 0) {
            score += W_TAG_OVERLAP * overlap.length;
            reasons.push(`Matches on: ${overlap.slice(0, 4).join(", ")}`);
          }

          // Deal type explicitly tagged on the KB entry.
          if (deal.dealType && kbBag.has(lower(deal.dealType))) {
            score += W_DEAL_TYPE_MATCH;
            reasons.push(`Same deal type (${deal.dealType})`);
          }

          // Deal value falls inside the profile's configured band.
          const kbValue = parseDealValue(kb.dealValue as unknown as string);
          if (kbValue !== null && (profileMin !== null || profileMax !== null)) {
            const aboveMin = profileMin === null || kbValue >= profileMin;
            const belowMax = profileMax === null || kbValue <= profileMax;
            if (aboveMin && belowMax) {
              score += W_VALUE_IN_RANGE;
              reasons.push(`Deal size in your profile band`);
            }
          }

          // Recency.
          const rec = recencyScore(kb.dealDate as unknown as string | null);
          if (rec > 0) {
            score += rec;
            // Only surface as a reason if it's a meaningful contribution.
            if (rec >= 1) reasons.push(`Recent (within ~5 years)`);
          }

          if (score > 0) {
            ranked.push({ kbEntry: kb, score, matchReasons: reasons, contacts: [] });
          }
        }

        ranked.sort((a, b) => b.score - a.score);
        const topMatches = ranked.slice(0, limit);

        // ----- 5. Hydrate contacts for the top matches in one round-trip.
        const topKbIds = topMatches.map((m) => m.kbEntry.id);
        if (topKbIds.length > 0) {
          const associations = await db
            .select({
              kbEntryId: contactDealAssociations.kbEntryId,
              role: contactDealAssociations.role,
              confidence: contactDealAssociations.confidence,
              contact: relationshipContacts,
            })
            .from(contactDealAssociations)
            .innerJoin(
              relationshipContacts,
              eq(contactDealAssociations.contactId, relationshipContacts.id),
            )
            .where(
              and(
                eq(contactDealAssociations.userId, userId),
                inArray(contactDealAssociations.kbEntryId, topKbIds),
                eq(relationshipContacts.isActive, true),
              ),
            );

          const byKbId = new Map<string, RankedMatch["contacts"]>();
          for (const a of associations) {
            const arr = byKbId.get(a.kbEntryId) ?? [];
            arr.push({ contact: a.contact, role: a.role as string, confidence: a.confidence ?? 1 });
            byKbId.set(a.kbEntryId, arr);
          }
          for (const m of topMatches) {
            m.contacts = byKbId.get(m.kbEntry.id) ?? [];
          }
        }

        // ----- 6. Flatten + dedupe overlooked contacts across the top matches.
        // These are the people who appear on past similar deals — the answer to
        // "who do I know who's seen this kind of deal before?"
        const overlookedMap = new Map<string, OverlookedContact>();
        for (const m of topMatches) {
          for (const c of m.contacts) {
            const existing = overlookedMap.get(c.contact.id);
            if (existing) {
              existing.pastDeals.push({
                kbEntryId: m.kbEntry.id,
                title: m.kbEntry.title,
                role: c.role,
              });
            } else {
              overlookedMap.set(c.contact.id, {
                contact: c.contact,
                pastDeals: [
                  {
                    kbEntryId: m.kbEntry.id,
                    title: m.kbEntry.title,
                    role: c.role,
                  },
                ],
              });
            }
          }
        }
        // Sort by appearance count (most-recurring contacts first).
        const overlookedContacts = Array.from(overlookedMap.values()).sort(
          (a, b) => b.pastDeals.length - a.pastDeals.length,
        );

        res.json({
          data: {
            deal: {
              id: deal.id,
              name: deal.name,
              sector: deal.sector,
              subsector: deal.subsector,
              geography: deal.geography,
              dealType: deal.dealType,
              enterpriseValue: deal.enterpriseValue,
            },
            profile: profile ? { id: profile.id, name: profile.name } : null,
            relatedDeals: topMatches,
            overlookedContacts,
            candidateCount: candidates.length,
          },
        });
      } catch (error: any) {
        console.error("[RelatedContext] error:", error);
        res.status(500).json({ message: error.message });
      }
    },
  );
}
