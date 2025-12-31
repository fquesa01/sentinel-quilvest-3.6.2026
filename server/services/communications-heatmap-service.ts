import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";

export interface HeatmapFilters {
  caseId: string;
  dateFrom?: string;
  dateTo?: string;
  participants?: string[];
  domains?: string[];
  internalOnly?: boolean;
  externalOnly?: boolean;
  topN?: number;
}

export interface TimeHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface TimeHeatmapResult {
  data: TimeHeatmapCell[];
  totalMessages: number;
  dateRange: { from: string | null; to: string | null };
}

export interface PersonMatrixCell {
  personA: string;
  personB: string;
  total: number;
  sentAtoB: number;
  sentBtoA: number;
}

export interface PersonMatrixResult {
  people: string[];
  matrix: PersonMatrixCell[];
  totalMessages: number;
}

export interface OrgMatrixCell {
  domainA: string;
  domainB: string;
  count: number;
}

export interface OrgMatrixResult {
  domains: string[];
  matrix: OrgMatrixCell[];
  totalMessages: number;
}

export interface TopicPersonCell {
  topic: string;
  person: string;
  count: number;
}

export interface TopicHeatmapResult {
  topics: string[];
  people: string[];
  matrix: TopicPersonCell[];
}

export interface AnomalyRecord {
  entity: string;
  entityType: "person" | "domain";
  month: string;
  volume: number;
  previousVolume: number;
  percentChange: number;
  isAnomaly: boolean;
}

export interface AnomalyResult {
  anomalies: AnomalyRecord[];
  monthlyData: Array<{
    entity: string;
    entityType: "person" | "domain";
    months: Array<{ month: string; volume: number; percentChange: number }>;
  }>;
  notableChanges: AnomalyRecord[];
}

export interface PersonStats {
  email: string;
  name?: string;
  totalMessages: number;
  sentCount: number;
  receivedCount: number;
  uniqueContacts: number;
  externalRatio: number;
  engagementScore: number;
  crossDomainRiskScore: number;
  afterHoursRatio: number;
}

export interface InsightsSummary {
  topCommunicators: PersonStats[];
  topExternalDomains: Array<{ domain: string; messageCount: number; uniquePeople: number }>;
  topAnomalies: AnomalyRecord[];
  afterHoursPercentage: number;
  totalMessages: number;
  uniqueParticipants: number;
  dateRange: { from: string | null; to: string | null };
}

function extractDomain(email: string): string {
  const match = email.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : "unknown";
}

function extractEmail(sender: string): string {
  const match = sender.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  if (sender.includes("@")) return sender.toLowerCase().trim();
  return sender.toLowerCase().trim();
}

function parseFilterDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr === "undefined" || dateStr === "null" || dateStr === "") {
    return null;
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9@._+-]/g, "").toLowerCase().trim();
}

function sanitizeParticipants(participants: string[] | undefined): string[] {
  if (!participants || !Array.isArray(participants)) return [];
  return participants
    .filter((p) => typeof p === "string" && p.length > 0 && p.length < 256)
    .map(sanitizeEmail)
    .filter((p) => p.length > 0);
}

export async function computeTimeOfDayHeatmap(
  filters: HeatmapFilters
): Promise<TimeHeatmapResult> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const dateFrom = parseFilterDate(filters.dateFrom);
  const dateTo = parseFilterDate(filters.dateTo);
  
  if (dateFrom) {
    conditions.push(gte(schema.communications.timestamp, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.communications.timestamp, dateTo));
  }
  
  const safeParticipants = sanitizeParticipants(filters.participants);
  if (safeParticipants.length > 0) {
    const participantConditions = safeParticipants.map(email => {
      const pattern = `%${email}%`;
      return sql`(
        LOWER(${schema.communications.sender}) ILIKE ${pattern} OR 
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${schema.communications.recipients}::jsonb) AS r
          WHERE LOWER(r) ILIKE ${pattern}
        )
      )`;
    });
    if (participantConditions.length === 1) {
      conditions.push(participantConditions[0]);
    } else {
      conditions.push(sql`(${sql.join(participantConditions, sql` OR `)})`);
    }
  }

  const result = await db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${schema.communications.timestamp})::int`,
      hour: sql<number>`EXTRACT(HOUR FROM ${schema.communications.timestamp})::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .groupBy(
      sql`EXTRACT(DOW FROM ${schema.communications.timestamp})`,
      sql`EXTRACT(HOUR FROM ${schema.communications.timestamp})`
    );

  const dateRangeResult = await db
    .select({
      minDate: sql<string>`MIN(${schema.communications.timestamp})::text`,
      maxDate: sql<string>`MAX(${schema.communications.timestamp})::text`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions));

  const data: TimeHeatmapCell[] = result.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    hour: row.hour,
    count: row.count,
  }));

  return {
    data,
    totalMessages: dateRangeResult[0]?.total || 0,
    dateRange: {
      from: dateRangeResult[0]?.minDate || null,
      to: dateRangeResult[0]?.maxDate || null,
    },
  };
}

export async function computePersonMatrix(
  filters: HeatmapFilters
): Promise<PersonMatrixResult> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const dateFrom = parseFilterDate(filters.dateFrom);
  const dateTo = parseFilterDate(filters.dateTo);
  
  if (dateFrom) {
    conditions.push(gte(schema.communications.timestamp, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.communications.timestamp, dateTo));
  }

  const topN = filters.topN || 20;

  const topSenders = await db
    .select({
      sender: schema.communications.sender,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .groupBy(schema.communications.sender)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(topN);

  const topPeople = topSenders.map((s) => extractEmail(s.sender));

  if (topPeople.length === 0) {
    return { people: [], matrix: [], totalMessages: 0 };
  }

  const communications = await db
    .select({
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
    })
    .from(schema.communications)
    .where(and(...conditions));

  const pairCounts = new Map<string, { total: number; aToB: number; bToA: number }>();

  for (const comm of communications) {
    const senderEmail = extractEmail(comm.sender);
    const recipients = comm.recipients as string[];

    if (!recipients || !Array.isArray(recipients)) continue;

    for (const recipient of recipients) {
      const recipientEmail = extractEmail(recipient);
      if (senderEmail === recipientEmail) continue;

      if (!topPeople.includes(senderEmail) && !topPeople.includes(recipientEmail)) continue;

      const [a, b] = [senderEmail, recipientEmail].sort();
      const key = `${a}::${b}`;

      if (!pairCounts.has(key)) {
        pairCounts.set(key, { total: 0, aToB: 0, bToA: 0 });
      }

      const pair = pairCounts.get(key)!;
      pair.total += 1;

      if (senderEmail === a) {
        pair.aToB += 1;
      } else {
        pair.bToA += 1;
      }
    }
  }

  const matrix: PersonMatrixCell[] = [];
  Array.from(pairCounts.entries()).forEach(([key, counts]) => {
    const parts = key.split("::");
    matrix.push({
      personA: parts[0],
      personB: parts[1],
      total: counts.total,
      sentAtoB: counts.aToB,
      sentBtoA: counts.bToA,
    });
  });

  return {
    people: topPeople,
    matrix,
    totalMessages: communications.length,
  };
}

export async function computeOrgMatrix(
  filters: HeatmapFilters
): Promise<OrgMatrixResult> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const dateFrom = parseFilterDate(filters.dateFrom);
  const dateTo = parseFilterDate(filters.dateTo);
  
  if (dateFrom) {
    conditions.push(gte(schema.communications.timestamp, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.communications.timestamp, dateTo));
  }

  const topN = filters.topN || 15;

  const domainCounts = await db
    .select({
      domain: sql<string>`LOWER(SPLIT_PART(${schema.communications.sender}, '@', 2))`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .groupBy(sql`LOWER(SPLIT_PART(${schema.communications.sender}, '@', 2))`)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(topN);

  const topDomains = domainCounts.map((d) => d.domain).filter(Boolean);

  if (topDomains.length === 0) {
    return { domains: [], matrix: [], totalMessages: 0 };
  }

  const communications = await db
    .select({
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
    })
    .from(schema.communications)
    .where(and(...conditions));

  const domainPairs = new Map<string, number>();

  for (const comm of communications) {
    const senderDomain = extractDomain(comm.sender);
    const recipients = comm.recipients as string[];

    if (!recipients || !Array.isArray(recipients)) continue;

    for (const recipient of recipients) {
      const recipientDomain = extractDomain(recipient);
      if (senderDomain === recipientDomain) continue;

      const [a, b] = [senderDomain, recipientDomain].sort();
      const key = `${a}::${b}`;

      domainPairs.set(key, (domainPairs.get(key) || 0) + 1);
    }
  }

  const matrix: OrgMatrixCell[] = [];
  Array.from(domainPairs.entries()).forEach(([key, count]) => {
    const parts = key.split("::");
    const domainA = parts[0];
    const domainB = parts[1];
    if (topDomains.includes(domainA) || topDomains.includes(domainB)) {
      matrix.push({ domainA, domainB, count });
    }
  });

  return {
    domains: topDomains,
    matrix,
    totalMessages: communications.length,
  };
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  legal: ["lawsuit", "litigation", "attorney", "counsel", "legal", "court", "judge", "settlement", "deposition"],
  contracts: ["contract", "agreement", "nda", "term", "clause", "signing", "executed", "amendment"],
  hr: ["employee", "hr", "hiring", "termination", "performance", "complaint", "harassment", "discrimination"],
  finance: ["invoice", "payment", "budget", "expense", "revenue", "financial", "audit", "accounting"],
  safety: ["safety", "injury", "accident", "osha", "hazard", "compliance", "risk"],
  sensitive: ["confidential", "secret", "privileged", "kickback", "bribe", "fraud", "violation"],
};

function detectTopics(subject: string, body: string): string[] {
  const text = `${subject} ${body}`.toLowerCase();
  const topics: string[] = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ["general"];
}

export async function computeTopicPersonHeatmap(
  filters: HeatmapFilters
): Promise<TopicHeatmapResult> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const dateFrom = parseFilterDate(filters.dateFrom);
  const dateTo = parseFilterDate(filters.dateTo);
  
  if (dateFrom) {
    conditions.push(gte(schema.communications.timestamp, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.communications.timestamp, dateTo));
  }

  const topN = filters.topN || 15;

  const topSenders = await db
    .select({
      sender: schema.communications.sender,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .groupBy(schema.communications.sender)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(topN);

  const topPeople = topSenders.map((s) => extractEmail(s.sender));

  const communications = await db
    .select({
      sender: schema.communications.sender,
      subject: schema.communications.subject,
      body: schema.communications.body,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .limit(5000);

  const topicPersonCounts = new Map<string, number>();
  const allTopics = new Set<string>();

  for (const comm of communications) {
    const senderEmail = extractEmail(comm.sender);
    if (!topPeople.includes(senderEmail)) continue;

    const topics = detectTopics(comm.subject || "", comm.body || "");
    for (const topic of topics) {
      allTopics.add(topic);
      const key = `${topic}::${senderEmail}`;
      topicPersonCounts.set(key, (topicPersonCounts.get(key) || 0) + 1);
    }
  }

  const matrix: TopicPersonCell[] = [];
  Array.from(topicPersonCounts.entries()).forEach(([key, count]) => {
    const parts = key.split("::");
    matrix.push({ topic: parts[0], person: parts[1], count });
  });

  return {
    topics: Array.from(allTopics).sort(),
    people: topPeople,
    matrix,
  };
}

export async function computeAnomalyStats(
  filters: HeatmapFilters
): Promise<AnomalyResult> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const monthlyVolumes = await db
    .select({
      month: sql<string>`TO_CHAR(${schema.communications.timestamp}, 'YYYY-MM')`,
      sender: schema.communications.sender,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(schema.communications)
    .where(and(...conditions))
    .groupBy(
      sql`TO_CHAR(${schema.communications.timestamp}, 'YYYY-MM')`,
      schema.communications.sender
    )
    .orderBy(sql`TO_CHAR(${schema.communications.timestamp}, 'YYYY-MM')`);

  const personMonthly = new Map<string, Map<string, number>>();

  for (const row of monthlyVolumes) {
    const email = extractEmail(row.sender);
    if (!personMonthly.has(email)) {
      personMonthly.set(email, new Map());
    }
    personMonthly.get(email)!.set(row.month, row.count);
  }

  const anomalies: AnomalyRecord[] = [];
  const monthlyData: AnomalyResult["monthlyData"] = [];

  Array.from(personMonthly.entries()).forEach(([email, months]) => {
    const sortedMonths = Array.from(months.keys()).sort();
    const personMonthData: Array<{ month: string; volume: number; percentChange: number }> = [];
    let previousVolume = 0;

    for (const month of sortedMonths) {
      const volume = months.get(month) || 0;
      const percentChange = previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : 0;

      personMonthData.push({ month, volume, percentChange });

      const isAnomaly = Math.abs(percentChange) > 100;

      if (previousVolume > 0 && isAnomaly) {
        anomalies.push({
          entity: email,
          entityType: "person",
          month,
          volume,
          previousVolume,
          percentChange,
          isAnomaly,
        });
      }

      previousVolume = volume;
    }

    if (personMonthData.length > 0) {
      monthlyData.push({
        entity: email,
        entityType: "person",
        months: personMonthData,
      });
    }
  });

  const notableChanges = anomalies
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, 10);

  return {
    anomalies,
    monthlyData: monthlyData.slice(0, 50),
    notableChanges,
  };
}

export async function computeInsightsSummary(
  filters: HeatmapFilters
): Promise<InsightsSummary> {
  const conditions: any[] = [eq(schema.communications.caseId, filters.caseId)];

  const dateFrom = parseFilterDate(filters.dateFrom);
  const dateTo = parseFilterDate(filters.dateTo);
  
  if (dateFrom) {
    conditions.push(gte(schema.communications.timestamp, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(schema.communications.timestamp, dateTo));
  }

  const communications = await db
    .select({
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
      timestamp: schema.communications.timestamp,
    })
    .from(schema.communications)
    .where(and(...conditions));

  const personStats = new Map<string, {
    sent: number;
    received: number;
    contacts: Set<string>;
    externalContacts: Set<string>;
    afterHours: number;
  }>();

  const domainStats = new Map<string, { count: number; people: Set<string> }>();

  let afterHoursCount = 0;
  const uniqueParticipants = new Set<string>();

  for (const comm of communications) {
    const senderEmail = extractEmail(comm.sender);
    const senderDomain = extractDomain(comm.sender);
    const recipients = comm.recipients as string[];
    const hour = comm.timestamp ? new Date(comm.timestamp).getHours() : 12;
    const isAfterHours = hour < 7 || hour >= 19;

    if (isAfterHours) afterHoursCount++;

    uniqueParticipants.add(senderEmail);

    if (!personStats.has(senderEmail)) {
      personStats.set(senderEmail, {
        sent: 0,
        received: 0,
        contacts: new Set(),
        externalContacts: new Set(),
        afterHours: 0,
      });
    }

    const senderStats = personStats.get(senderEmail)!;
    senderStats.sent += 1;
    if (isAfterHours) senderStats.afterHours += 1;

    if (!domainStats.has(senderDomain)) {
      domainStats.set(senderDomain, { count: 0, people: new Set() });
    }
    domainStats.get(senderDomain)!.count += 1;
    domainStats.get(senderDomain)!.people.add(senderEmail);

    if (!recipients || !Array.isArray(recipients)) continue;

    for (const recipient of recipients) {
      const recipientEmail = extractEmail(recipient);
      const recipientDomain = extractDomain(recipient);
      uniqueParticipants.add(recipientEmail);

      senderStats.contacts.add(recipientEmail);
      if (recipientDomain !== senderDomain) {
        senderStats.externalContacts.add(recipientEmail);
      }

      if (!personStats.has(recipientEmail)) {
        personStats.set(recipientEmail, {
          sent: 0,
          received: 0,
          contacts: new Set(),
          externalContacts: new Set(),
          afterHours: 0,
        });
      }
      personStats.get(recipientEmail)!.received += 1;
    }
  }

  const topCommunicators: PersonStats[] = Array.from(personStats.entries())
    .map(([email, stats]) => {
      const totalMessages = stats.sent + stats.received;
      const uniqueContacts = stats.contacts.size;
      const externalRatio = uniqueContacts > 0 ? stats.externalContacts.size / uniqueContacts : 0;
      const afterHoursRatio = stats.sent > 0 ? stats.afterHours / stats.sent : 0;

      const engagementScore = Math.min(100, Math.round(
        (totalMessages * 0.3) +
        (uniqueContacts * 2) +
        (stats.sent / (stats.received || 1) * 10)
      ));

      const crossDomainRiskScore = Math.min(100, Math.round(externalRatio * 100));

      return {
        email,
        totalMessages,
        sentCount: stats.sent,
        receivedCount: stats.received,
        uniqueContacts,
        externalRatio,
        engagementScore,
        crossDomainRiskScore,
        afterHoursRatio,
      };
    })
    .sort((a, b) => b.totalMessages - a.totalMessages)
    .slice(0, 10);

  const topExternalDomains = Array.from(domainStats.entries())
    .map(([domain, stats]) => ({
      domain,
      messageCount: stats.count,
      uniquePeople: stats.people.size,
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 10);

  const anomalyResult = await computeAnomalyStats(filters);

  const dateRangeResult = await db
    .select({
      minDate: sql<string>`MIN(${schema.communications.timestamp})::text`,
      maxDate: sql<string>`MAX(${schema.communications.timestamp})::text`,
    })
    .from(schema.communications)
    .where(and(...conditions));

  return {
    topCommunicators,
    topExternalDomains,
    topAnomalies: anomalyResult.notableChanges,
    afterHoursPercentage: communications.length > 0 ? (afterHoursCount / communications.length) * 100 : 0,
    totalMessages: communications.length,
    uniqueParticipants: uniqueParticipants.size,
    dateRange: {
      from: dateRangeResult[0]?.minDate || null,
      to: dateRangeResult[0]?.maxDate || null,
    },
  };
}

export async function getMessagesForPair(
  caseId: string,
  personA: string,
  personB: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  subject: string;
  sender: string;
  recipients: any;
  timestamp: Date | null;
}>> {
  const safePersonA = sanitizeEmail(personA);
  const safePersonB = sanitizeEmail(personB);
  
  if (!safePersonA || !safePersonB) {
    return [];
  }
  
  const patternA = `%${safePersonA}%`;
  const patternB = `%${safePersonB}%`;
  
  const messages = await db
    .select({
      id: schema.communications.id,
      subject: schema.communications.subject,
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
      timestamp: schema.communications.timestamp,
    })
    .from(schema.communications)
    .where(
      and(
        eq(schema.communications.caseId, caseId),
        sql`(
          (LOWER(${schema.communications.sender}) LIKE ${patternA} AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${schema.communications.recipients}::jsonb) AS r
            WHERE LOWER(r) LIKE ${patternB}
          ))
          OR
          (LOWER(${schema.communications.sender}) LIKE ${patternB} AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${schema.communications.recipients}::jsonb) AS r
            WHERE LOWER(r) LIKE ${patternA}
          ))
        )`
      )
    )
    .orderBy(sql`${schema.communications.timestamp} DESC`)
    .limit(Math.min(limit, 100));

  return messages;
}
