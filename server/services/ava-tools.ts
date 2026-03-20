import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql, ilike, desc, count, inArray, or } from "drizzle-orm";

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface AvaTool {
  name: string;
  description: string;
  category: "read" | "write";
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  execute: (params: Record<string, any>, userId: string) => Promise<any>;
}

async function getUserOrgId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ orgId: schema.organizationMembers.organizationId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, userId))
    .limit(1);
  return membership?.orgId || null;
}

async function getOrgMemberIds(orgId: string): Promise<string[]> {
  const members = await db
    .select({ userId: schema.organizationMembers.userId })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.organizationId, orgId));
  return members.map((m) => m.userId);
}

async function getAuthorizedUserIds(userId: string): Promise<string[]> {
  const orgId = await getUserOrgId(userId);
  if (!orgId) return [userId];
  return await getOrgMemberIds(orgId);
}

async function canAccessCase(userId: string, caseId: string): Promise<boolean> {
  const authorizedIds = await getAuthorizedUserIds(userId);
  const [c] = await db.select({ id: schema.cases.id }).from(schema.cases)
    .where(and(
      eq(schema.cases.id, caseId),
      or(inArray(schema.cases.createdBy, authorizedIds), inArray(schema.cases.assignedTo, authorizedIds))
    ));
  return !!c;
}

function caseAccessScope(authorizedIds: string[]) {
  return or(inArray(schema.cases.createdBy, authorizedIds), inArray(schema.cases.assignedTo, authorizedIds));
}

async function canAccessDeal(userId: string, dealId: string): Promise<boolean> {
  const authorizedIds = await getAuthorizedUserIds(userId);
  const [owned] = await db.select({ id: schema.deals.id }).from(schema.deals)
    .where(and(eq(schema.deals.id, dealId), inArray(schema.deals.createdBy, authorizedIds)));
  if (owned) return true;
  const [participant] = await db.select({ id: schema.dealParticipants.id }).from(schema.dealParticipants)
    .where(and(eq(schema.dealParticipants.dealId, dealId), eq(schema.dealParticipants.userId, userId), eq(schema.dealParticipants.isActive, true)));
  return !!participant;
}

async function findAccessibleDealByName(userId: string, dealName: string): Promise<{ id: string; title: string } | null> {
  const authorizedIds = await getAuthorizedUserIds(userId);
  const [owned] = await db.select({ id: schema.deals.id, title: schema.deals.title }).from(schema.deals)
    .where(and(ilike(schema.deals.title, `%${dealName}%`), inArray(schema.deals.createdBy, authorizedIds))).limit(1);
  if (owned) return owned;
  const participantDeals = await db.select({ dealId: schema.dealParticipants.dealId }).from(schema.dealParticipants)
    .where(and(eq(schema.dealParticipants.userId, userId), eq(schema.dealParticipants.isActive, true)));
  if (participantDeals.length > 0) {
    const pDealIds = participantDeals.map(p => p.dealId);
    const [pDeal] = await db.select({ id: schema.deals.id, title: schema.deals.title }).from(schema.deals)
      .where(and(ilike(schema.deals.title, `%${dealName}%`), inArray(schema.deals.id, pDealIds))).limit(1);
    if (pDeal) return pDeal;
  }
  return null;
}

async function findAccessibleDealById(userId: string, dealId: string): Promise<{ id: string; title: string } | null> {
  if (await canAccessDeal(userId, dealId)) {
    const [d] = await db.select({ id: schema.deals.id, title: schema.deals.title }).from(schema.deals).where(eq(schema.deals.id, dealId)).limit(1);
    return d || null;
  }
  return null;
}

async function resolveDeal(userId: string, params: { deal_id?: string; deal_name?: string }): Promise<{ id: string; title: string } | null> {
  if (params.deal_id) return findAccessibleDealById(userId, params.deal_id);
  if (params.deal_name) return findAccessibleDealByName(userId, params.deal_name);
  return null;
}

async function resolveCase(userId: string, params: { case_id?: string; case_name?: string }): Promise<{ id: string; title: string } | null> {
  const authorizedIds = await getAuthorizedUserIds(userId);
  if (params.case_id) {
    if (await canAccessCase(userId, params.case_id)) {
      const [c] = await db.select({ id: schema.cases.id, title: schema.cases.title }).from(schema.cases).where(eq(schema.cases.id, params.case_id)).limit(1);
      return c || null;
    }
    return null;
  }
  if (params.case_name) {
    const [c] = await db.select({ id: schema.cases.id, title: schema.cases.title }).from(schema.cases)
      .where(and(ilike(schema.cases.title, `%${params.case_name}%`), caseAccessScope(authorizedIds))).limit(1);
    return c || null;
  }
  return null;
}

const tools: AvaTool[] = [
  {
    name: "get_case_details",
    description:
      "Get detailed information about a specific compliance case including status, risk level, description, AI analysis summary, and assigned parties. Use when the user asks about a specific case.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: {
          type: "string",
          description: "The case name to search for (partial match supported)",
        },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { found: false, message: "Case not found or you don't have access" };

      const [caseData] = await db.select().from(schema.cases).where(eq(schema.cases.id, resolved.id)).limit(1);
      if (!caseData) return { found: false, message: "Case not found or you don't have access" };

      const [interviewCount] = await db
        .select({ count: count() })
        .from(schema.interviews)
        .where(eq(schema.interviews.caseId, caseData.id));
      const [docCount] = await db
        .select({ count: count() })
        .from(schema.communications)
        .where(eq(schema.communications.metadata, sql`jsonb_build_object('caseId', ${caseData.id})`))
        .limit(1);
      const [findingCount] = await db
        .select({ count: count() })
        .from(schema.findings)
        .where(eq(schema.findings.caseId, caseData.id));

      return {
        found: true,
        id: caseData.id,
        title: caseData.title,
        caseNumber: caseData.caseNumber,
        status: caseData.status,
        violationType: caseData.violationType,
        description: caseData.description,
        riskLevel: caseData.riskLevel,
        riskScore: caseData.riskScore,
        aiAnalysisSummary: caseData.aiAnalysisSummary,
        privilegeStatus: caseData.privilegeStatus,
        interviewCount: interviewCount?.count || 0,
        findingCount: findingCount?.count || 0,
        createdAt: caseData.createdAt,
        link: `/cases/${caseData.id}`,
      };
    },
  },

  {
    name: "list_cases",
    description:
      "List all compliance cases the user has access to. Optionally filter by status or search term.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by case status",
          enum: ["alert", "investigation", "review", "resolution", "closed"],
        },
        search: {
          type: "string",
          description: "Search term to filter cases by title",
        },
        limit: {
          type: "string",
          description: "Max number of results (default 10)",
        },
      },
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);

      let query = db.select({
        id: schema.cases.id,
        title: schema.cases.title,
        caseNumber: schema.cases.caseNumber,
        status: schema.cases.status,
        violationType: schema.cases.violationType,
        riskLevel: schema.cases.riskLevel,
        riskScore: schema.cases.riskScore,
        createdAt: schema.cases.createdAt,
      }).from(schema.cases);

      const conditions = [caseAccessScope(authorizedIds)];
      if (params.status) {
        conditions.push(eq(schema.cases.status, params.status));
      }
      if (params.search) {
        conditions.push(ilike(schema.cases.title, `%${params.search}%`));
      }

      const limit = parseInt(params.limit) || 10;
      const results = await query
        .where(and(...conditions))
        .orderBy(desc(schema.cases.createdAt))
        .limit(limit);

      return {
        cases: results.map((c) => ({
          ...c,
          link: `/cases/${c.id}`,
        })),
        total: results.length,
      };
    },
  },

  {
    name: "get_deal_details",
    description:
      "Get detailed information about a specific deal/transaction including status, parties, value, timeline, checklists, and data room status.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: {
          type: "string",
          description: "The deal name to search for (partial match)",
        },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { found: false, message: "Deal not found or you don't have access" };

      const [dealData] = await db.select().from(schema.deals).where(eq(schema.deals.id, resolved.id)).limit(1);
      if (!dealData) return { found: false, message: "Deal not found or you don't have access" };

      const checklists = await db
        .select({
          id: schema.dealChecklists.id,
          totalItems: schema.dealChecklists.totalItems,
          completedItems: schema.dealChecklists.completedItems,
          percentComplete: schema.dealChecklists.percentComplete,
        })
        .from(schema.dealChecklists)
        .where(eq(schema.dealChecklists.dealId, dealData.id));

      const dataRooms = await db
        .select({
          id: schema.dataRooms.id,
          name: schema.dataRooms.name,
        })
        .from(schema.dataRooms)
        .where(eq(schema.dataRooms.dealId, dealData.id));

      let totalDocuments = 0;
      for (const dr of dataRooms) {
        const [docCount] = await db
          .select({ count: count() })
          .from(schema.dataRoomDocuments)
          .where(eq(schema.dataRoomDocuments.dataRoomId, dr.id));
        totalDocuments += docCount?.count || 0;
      }

      return {
        found: true,
        id: dealData.id,
        dealNumber: dealData.dealNumber,
        title: dealData.title,
        dealType: dealData.dealType,
        status: dealData.status,
        priority: dealData.priority,
        dealValue: dealData.dealValue,
        dealCurrency: dealData.dealCurrency,
        description: dealData.description,
        representationRole: dealData.representationRole,
        buyerParties: dealData.buyerParties,
        sellerParties: dealData.sellerParties,
        closingTargetDate: dealData.closingTargetDate,
        actualClosingDate: dealData.actualClosingDate,
        overallRiskScore: dealData.overallRiskScore,
        checklists: checklists.map((c) => ({
          id: c.id,
          totalItems: c.totalItems,
          completedItems: c.completedItems,
          percentComplete: c.percentComplete,
        })),
        dataRoomCount: dataRooms.length,
        totalDocuments,
        createdAt: dealData.createdAt,
        link: `/transactions/deals/${dealData.id}`,
      };
    },
  },

  {
    name: "list_deals",
    description:
      "List all deals/transactions the user has access to. Optionally filter by status, type, or search term.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by deal status",
          enum: ["active", "pending", "closed", "terminated", "on_hold"],
        },
        deal_type: {
          type: "string",
          description: "Filter by deal type",
          enum: ["acquisition", "merger", "divestiture", "joint_venture", "lbo", "refinancing", "ipo", "restructuring", "real_estate", "other"],
        },
        search: {
          type: "string",
          description: "Search term to filter deals by title",
        },
        limit: {
          type: "string",
          description: "Max number of results (default 10)",
        },
      },
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);
      const orgOwned = inArray(schema.deals.createdBy, authorizedIds);
      const participantDealRows = await db.select({ dealId: schema.dealParticipants.dealId }).from(schema.dealParticipants)
        .where(and(eq(schema.dealParticipants.userId, userId), eq(schema.dealParticipants.isActive, true)));
      const participantDealIds = participantDealRows.map(p => p.dealId);
      const accessScope = participantDealIds.length > 0
        ? or(orgOwned, inArray(schema.deals.id, participantDealIds))
        : orgOwned;

      const conditions: any[] = [accessScope];
      if (params.status) conditions.push(eq(schema.deals.status, params.status));
      if (params.deal_type) conditions.push(eq(schema.deals.dealType, params.deal_type));
      if (params.search) conditions.push(ilike(schema.deals.title, `%${params.search}%`));

      const limit = parseInt(params.limit) || 10;
      const results = await db
        .select({
          id: schema.deals.id,
          title: schema.deals.title,
          dealType: schema.deals.dealType,
          status: schema.deals.status,
          priority: schema.deals.priority,
          dealValue: schema.deals.dealValue,
          closingTargetDate: schema.deals.closingTargetDate,
        })
        .from(schema.deals)
        .where(and(...conditions))
        .orderBy(desc(schema.deals.createdAt))
        .limit(limit);

      return {
        deals: results.map((d) => ({
          ...d,
          link: `/transactions/deals/${d.id}`,
        })),
        total: results.length,
      };
    },
  },

  {
    name: "get_data_room_documents",
    description:
      "List documents in a deal's data room. Use when the user asks about documents in a transaction/deal.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "The deal name to search for" },
        search: { type: "string", description: "Search term to filter documents by name" },
        limit: { type: "string", description: "Max number of results (default 20)" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { found: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      const rooms = await db
        .select({ id: schema.dataRooms.id, name: schema.dataRooms.name })
        .from(schema.dataRooms)
        .where(eq(schema.dataRooms.dealId, dealId));

      if (rooms.length === 0) return { found: true, documents: [], message: "No data rooms found for this deal" };

      const roomIds = rooms.map((r) => r.id);
      const limit = parseInt(params.limit) || 20;

      let docs;
      if (params.search) {
        docs = await db
          .select({
            id: schema.dataRoomDocuments.id,
            fileName: schema.dataRoomDocuments.fileName,
            fileType: schema.dataRoomDocuments.fileType,
            fileSize: schema.dataRoomDocuments.fileSize,
            documentCategory: schema.dataRoomDocuments.documentCategory,
            aiSummary: schema.dataRoomDocuments.aiSummary,
            indexStatus: schema.dataRoomDocuments.indexStatus,
            dataRoomId: schema.dataRoomDocuments.dataRoomId,
          })
          .from(schema.dataRoomDocuments)
          .where(
            and(
              sql`${schema.dataRoomDocuments.dataRoomId} = ANY(${roomIds})`,
              ilike(schema.dataRoomDocuments.fileName, `%${params.search}%`)
            )
          )
          .limit(limit);
      } else {
        docs = await db
          .select({
            id: schema.dataRoomDocuments.id,
            fileName: schema.dataRoomDocuments.fileName,
            fileType: schema.dataRoomDocuments.fileType,
            fileSize: schema.dataRoomDocuments.fileSize,
            documentCategory: schema.dataRoomDocuments.documentCategory,
            aiSummary: schema.dataRoomDocuments.aiSummary,
            indexStatus: schema.dataRoomDocuments.indexStatus,
            dataRoomId: schema.dataRoomDocuments.dataRoomId,
          })
          .from(schema.dataRoomDocuments)
          .where(sql`${schema.dataRoomDocuments.dataRoomId} = ANY(${roomIds})`)
          .limit(limit);
      }

      return {
        found: true,
        dealId,
        dataRooms: rooms,
        documents: docs.map((d) => ({
          ...d,
          aiSummary: d.aiSummary ? d.aiSummary.substring(0, 200) : null,
        })),
        totalDocuments: docs.length,
      };
    },
  },

  {
    name: "get_checklist_status",
    description:
      "Get the status of checklists for a deal including completion percentage, total items, and completed items.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "The deal name to search for" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { found: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      const checklists = await db
        .select()
        .from(schema.dealChecklists)
        .where(eq(schema.dealChecklists.dealId, dealId));

      const checklistDetails = [];
      for (const cl of checklists) {
        const items = await db
          .select({
            id: schema.dealChecklistItems.id,
            customName: schema.dealChecklistItems.customName,
            status: schema.dealChecklistItems.status,
            assignedTo: schema.dealChecklistItems.assignedTo,
            dueDate: schema.dealChecklistItems.dueDate,
          })
          .from(schema.dealChecklistItems)
          .where(eq(schema.dealChecklistItems.dealChecklistId, cl.id));

        checklistDetails.push({
          id: cl.id,
          totalItems: cl.totalItems,
          completedItems: cl.completedItems,
          percentComplete: cl.percentComplete,
          targetCloseDate: cl.targetCloseDate,
          items: items.slice(0, 20),
        });
      }

      return {
        found: true,
        dealId,
        checklists: checklistDetails,
        totalChecklists: checklists.length,
      };
    },
  },

  {
    name: "get_interviews",
    description:
      "Get interviews for a specific case including interviewee names, status, and scheduled times.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: { type: "string", description: "Case name to search for" },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { found: false, message: "Case not found or access denied" };
      const caseId = resolved.id;

      const limit = parseInt(params.limit) || 10;
      const interviews = await db
        .select({
          id: schema.interviews.id,
          intervieweeName: schema.interviews.intervieweeName,
          intervieweeEmail: schema.interviews.intervieweeEmail,
          scheduledFor: schema.interviews.scheduledFor,
          interviewType: schema.interviews.interviewType,
          status: schema.interviews.status,
        })
        .from(schema.interviews)
        .where(eq(schema.interviews.caseId, caseId))
        .orderBy(desc(schema.interviews.scheduledFor))
        .limit(limit);

      return {
        found: true,
        caseId,
        interviews,
        total: interviews.length,
        link: `/cases/${caseId}/interviews`,
      };
    },
  },

  {
    name: "get_ron_transactions",
    description:
      "Get Remote Online Notarization (RON) transactions. Optionally filter by deal or status.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "Filter by deal ID" },
        status: {
          type: "string",
          description: "Filter by status",
          enum: ["draft", "pending", "scheduled", "in_progress", "completed", "cancelled", "expired"],
        },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);
      const ronScope = inArray(schema.ronTransactions.createdBy, authorizedIds);

      const conditions: any[] = [ronScope];
      if (params.deal_id) {
        if (!(await canAccessDeal(userId, params.deal_id))) {
          return { ronTransactions: [], total: 0, message: "Deal not found or access denied" };
        }
        conditions.push(eq(schema.ronTransactions.dealId, params.deal_id));
      }
      if (params.status) conditions.push(eq(schema.ronTransactions.status, params.status));

      const limit = parseInt(params.limit) || 10;
      const results = await db
        .select({
          id: schema.ronTransactions.id,
          title: schema.ronTransactions.title,
          status: schema.ronTransactions.status,
          transactionType: schema.ronTransactions.transactionType,
          jurisdiction: schema.ronTransactions.jurisdiction,
          scheduledDate: schema.ronTransactions.scheduledDate,
          completedDate: schema.ronTransactions.completedDate,
          dealId: schema.ronTransactions.dealId,
        })
        .from(schema.ronTransactions)
        .where(and(...conditions))
        .orderBy(desc(schema.ronTransactions.createdAt))
        .limit(limit);

      return { ronTransactions: results, total: results.length };
    },
  },

  {
    name: "get_investor_memos",
    description:
      "Get investor memos for a specific deal. Shows memo status, sections, and metadata.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "Deal name to search for" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { found: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      const memos = await db
        .select({
          id: schema.investorMemos.id,
          dealName: schema.investorMemos.dealName,
          status: schema.investorMemos.status,
          version: schema.investorMemos.version,
          createdAt: schema.investorMemos.createdAt,
        })
        .from(schema.investorMemos)
        .where(eq(schema.investorMemos.dealId, dealId))
        .orderBy(desc(schema.investorMemos.createdAt));

      return { found: true, dealId, memos, total: memos.length };
    },
  },

  {
    name: "get_compliance_alerts",
    description:
      "Get recent compliance alerts. Optionally filter by severity or case.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        severity: {
          type: "string",
          description: "Filter by severity",
          enum: ["critical", "high", "medium", "low", "informational"],
        },
        case_id: { type: "string", description: "Filter by case ID" },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);

      const conditions: any[] = [];
      if (params.severity) conditions.push(eq(schema.alerts.severity, params.severity));

      const limit = parseInt(params.limit) || 10;

      if (params.case_id) {
        if (!(await canAccessCase(userId, params.case_id))) {
          return { alerts: [], total: 0, message: "Case not found or access denied" };
        }

        conditions.push(sql`${schema.alerts.id} IN (
          SELECT a.id FROM alerts a
          JOIN cases c ON c.alert_id = a.id
          WHERE c.id = ${params.case_id}
        )`);
      } else {
        conditions.push(sql`${schema.alerts.id} IN (
          SELECT c.alert_id FROM cases c
          WHERE c.alert_id IS NOT NULL
          AND (c.created_by IN (${sql.join(authorizedIds.map(id => sql`${id}`), sql`,`)})
               OR c.assigned_to IN (${sql.join(authorizedIds.map(id => sql`${id}`), sql`,`)}))
        )`);
      }

      const results = await db
        .select({
          id: schema.alerts.id,
          severity: schema.alerts.severity,
          status: schema.alerts.status,
          violationType: schema.alerts.violationType,
          riskScore: schema.alerts.riskScore,
          createdAt: schema.alerts.createdAt,
        })
        .from(schema.alerts)
        .where(and(...conditions))
        .orderBy(desc(schema.alerts.createdAt))
        .limit(limit);

      return { alerts: results, total: results.length };
    },
  },

  {
    name: "get_findings",
    description:
      "Get findings for a specific case. Findings are investigative conclusions with severity and evidence links.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: { type: "string", description: "Case name to search for" },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { found: false, message: "Case not found or access denied" };
      const caseId = resolved.id;

      const limit = parseInt(params.limit) || 10;
      const results = await db
        .select({
          id: schema.findings.id,
          title: schema.findings.title,
          content: schema.findings.content,
          summary: schema.findings.summary,
          entryType: schema.findings.entryType,
          isPinned: schema.findings.isPinned,
          aiGenerated: schema.findings.aiGenerated,
          createdAt: schema.findings.createdAt,
        })
        .from(schema.findings)
        .where(eq(schema.findings.caseId, caseId))
        .orderBy(desc(schema.findings.createdAt))
        .limit(limit);

      return {
        found: true,
        caseId,
        findings: results.map((f) => ({
          ...f,
          content: f.content?.substring(0, 500),
        })),
        total: results.length,
        link: `/cases/${caseId}/findings`,
      };
    },
  },

  {
    name: "get_calendar_events",
    description:
      "Get upcoming calendar events for the user. Useful for scheduling context and checking availability.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        days_ahead: {
          type: "string",
          description: "Number of days ahead to look (default 7)",
        },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const daysAhead = parseInt(params.days_ahead) || 7;
      const limit = parseInt(params.limit) || 10;
      const now = new Date();
      const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const events = await db
        .select({
          id: schema.calendarEvents.id,
          title: schema.calendarEvents.title,
          startTime: schema.calendarEvents.startTime,
          endTime: schema.calendarEvents.endTime,
          eventType: schema.calendarEvents.eventType,
          location: schema.calendarEvents.location,
          status: schema.calendarEvents.status,
        })
        .from(schema.calendarEvents)
        .where(
          and(
            eq(schema.calendarEvents.createdBy, userId),
            sql`${schema.calendarEvents.startTime} >= ${now}`,
            sql`${schema.calendarEvents.startTime} <= ${future}`
          )
        )
        .orderBy(schema.calendarEvents.startTime)
        .limit(limit);

      return { events, total: events.length, daysAhead };
    },
  },

  {
    name: "get_deal_templates",
    description:
      "List available deal/closing checklist templates that can be applied to deals. Useful when a user asks about available templates or checklist templates.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search term to filter templates by name" },
        transaction_type: { type: "string", description: "Filter by transaction type" },
        limit: { type: "string", description: "Max results (default 10)" },
      },
    },
    execute: async (params, userId) => {
      const orgId = await getUserOrgId(userId);
      const limit = parseInt(params.limit) || 10;
      const orgOrSystemScope = orgId
        ? or(
            eq(schema.dealTemplates.isSystemTemplate, true),
            eq(schema.dealTemplates.organizationId, orgId),
            sql`${schema.dealTemplates.organizationId} IS NULL`
          )
        : or(
            eq(schema.dealTemplates.isSystemTemplate, true),
            sql`${schema.dealTemplates.organizationId} IS NULL`
          );
      const conditions: any[] = [orgOrSystemScope];
      if (params.search) conditions.push(ilike(schema.dealTemplates.name, `%${params.search}%`));
      if (params.transaction_type) conditions.push(eq(schema.dealTemplates.transactionType, params.transaction_type));

      const results = await db
        .select({
          id: schema.dealTemplates.id,
          name: schema.dealTemplates.name,
          description: schema.dealTemplates.description,
          transactionType: schema.dealTemplates.transactionType,
          isActive: schema.dealTemplates.isActive,
          isDefault: schema.dealTemplates.isDefault,
        })
        .from(schema.dealTemplates)
        .where(and(...conditions))
        .limit(limit);

      return { templates: results, total: results.length };
    },
  },

  // === WRITE TOOLS ===

  {
    name: "update_deal_status",
    description:
      "Update the status of a deal/transaction. Requires confirmation from the user before executing.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID to update" },
        deal_name: { type: "string", description: "Deal name to search for" },
        new_status: {
          type: "string",
          description: "The new status",
          enum: ["active", "pending", "closed", "terminated", "on_hold"],
        },
      },
      required: ["new_status"],
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { success: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      await db
        .update(schema.deals)
        .set({ status: params.new_status, updatedAt: new Date() })
        .where(eq(schema.deals.id, dealId));

      const [updated] = await db
        .select({ id: schema.deals.id, title: schema.deals.title, status: schema.deals.status })
        .from(schema.deals)
        .where(eq(schema.deals.id, dealId));

      return {
        success: true,
        message: `Deal "${updated.title}" status updated to ${params.new_status}`,
        deal: updated,
        link: `/transactions/deals/${dealId}`,
      };
    },
  },

  {
    name: "update_deal_details",
    description:
      "Update details of a deal such as priority, description, closing target date, or deal value.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "Deal name to search for" },
        priority: {
          type: "string",
          description: "New priority level",
          enum: ["low", "medium", "high", "critical"],
        },
        description: { type: "string", description: "Updated description" },
        deal_value: { type: "string", description: "Updated deal value" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { success: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (params.priority) updates.priority = params.priority;
      if (params.description) updates.description = params.description;
      if (params.deal_value) updates.dealValue = params.deal_value;

      await db.update(schema.deals).set(updates).where(eq(schema.deals.id, dealId));

      const [updated] = await db
        .select({ id: schema.deals.id, title: schema.deals.title, priority: schema.deals.priority })
        .from(schema.deals)
        .where(eq(schema.deals.id, dealId));

      return {
        success: true,
        message: `Deal "${updated.title}" has been updated`,
        deal: updated,
        link: `/transactions/deals/${dealId}`,
      };
    },
  },

  {
    name: "create_finding",
    description:
      "Create a new finding/investigation conclusion for a case.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: { type: "string", description: "Case name to search for" },
        title: { type: "string", description: "Title of the finding" },
        content: { type: "string", description: "Content/body of the finding (rich text)" },
        entry_type: {
          type: "string",
          description: "Type of finding entry",
          enum: ["note", "finding", "recommendation", "evidence"],
        },
      },
      required: ["title", "content"],
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { success: false, message: "Case not found or access denied" };
      const caseId = resolved.id;

      const [finding] = await db
        .insert(schema.findings)
        .values({
          caseId,
          title: params.title,
          content: params.content,
          entryType: params.entry_type || "finding",
          authorId: userId,
        })
        .returning();

      return {
        success: true,
        message: `Finding "${params.title}" created`,
        finding: { id: finding.id, title: finding.title },
        link: `/cases/${caseId}/findings`,
      };
    },
  },

  {
    name: "create_note",
    description:
      "Create a note on a case. Notes are used for documenting observations, quick updates, or informal records during an investigation or deal review.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: { type: "string", description: "Case name to search for" },
        title: { type: "string", description: "Title of the note" },
        content: { type: "string", description: "Content/body of the note" },
      },
      required: ["title", "content"],
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { success: false, message: "Case not found or access denied" };
      const caseId = resolved.id;

      const [note] = await db
        .insert(schema.findings)
        .values({
          caseId,
          title: params.title,
          content: params.content,
          entryType: "note",
          authorId: userId,
        })
        .returning();

      return {
        success: true,
        message: `Note "${params.title}" added to case "${resolved.title}"`,
        note: { id: note.id, title: note.title },
        link: `/cases/${caseId}/findings`,
      };
    },
  },

  {
    name: "search_documents_globally",
    description:
      "Search for documents across all deals and data rooms by name or content. Useful when the user asks to find a specific document.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        search_query: { type: "string", description: "Search term for document name or content" },
        deal_name: { type: "string", description: "Optional: filter by deal name" },
        limit: { type: "string", description: "Max results (default 10)" },
      },
      required: ["search_query"],
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);
      const orgOwned = inArray(schema.deals.createdBy, authorizedIds);
      const participantDealRows = await db.select({ dealId: schema.dealParticipants.dealId }).from(schema.dealParticipants)
        .where(and(eq(schema.dealParticipants.userId, userId), eq(schema.dealParticipants.isActive, true)));
      const participantDealIds = participantDealRows.map(p => p.dealId);
      const accessScope = participantDealIds.length > 0
        ? or(orgOwned, inArray(schema.deals.id, participantDealIds))
        : orgOwned;

      const searchPattern = `%${params.search_query.replace(/\s+/g, "%")}%`;
      const limit = parseInt(params.limit) || 10;

      const conditions: any[] = [
        ilike(schema.dataRoomDocuments.fileName, searchPattern),
        accessScope,
      ];
      if (params.deal_name) {
        conditions.push(ilike(schema.deals.title, `%${params.deal_name.replace(/\s+/g, "%")}%`));
      }

      const results = await db
        .select({
          id: schema.dataRoomDocuments.id,
          fileName: schema.dataRoomDocuments.fileName,
          fileType: schema.dataRoomDocuments.fileType,
          aiSummary: schema.dataRoomDocuments.aiSummary,
          dataRoomName: schema.dataRooms.name,
          dealTitle: schema.deals.title,
          dealId: schema.deals.id,
          dataRoomId: schema.dataRooms.id,
        })
        .from(schema.dataRoomDocuments)
        .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
        .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id))
        .where(and(...conditions))
        .limit(limit);

      return {
        documents: results.map((d) => ({
          ...d,
          aiSummary: d.aiSummary ? d.aiSummary.substring(0, 200) : null,
          link: `/transactions/data-rooms/${d.dataRoomId}?document=${d.id}`,
        })),
        total: results.length,
      };
    },
  },
  {
    name: "apply_checklist_template",
    description:
      "Apply a closing checklist template to a deal. Creates a deal checklist from a template for tracking closing milestones and required items.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "Deal name to search for" },
        template_id: { type: "string", description: "The template ID to apply" },
        template_name: { type: "string", description: "Template name to search for" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { success: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      let templateId = params.template_id;
      if (!templateId && params.template_name) {
        const [tmpl] = await db.select({ id: schema.dealTemplates.id, name: schema.dealTemplates.name }).from(schema.dealTemplates)
          .where(ilike(schema.dealTemplates.name, `%${params.template_name}%`)).limit(1);
        templateId = tmpl?.id;
        if (!templateId) return { success: false, message: "Template not found" };
      }
      if (!templateId) return { success: false, message: "Template ID or name required" };

      const [existing] = await db.select({ id: schema.dealChecklists.id }).from(schema.dealChecklists)
        .where(and(eq(schema.dealChecklists.dealId, dealId), eq(schema.dealChecklists.templateId, templateId)));
      if (existing) return { success: false, message: "This template is already applied to this deal" };

      const templateItemRows = await db.select().from(schema.templateItems)
        .where(eq(schema.templateItems.templateId, templateId))
        .orderBy(schema.templateItems.sortOrder);

      const [checklist] = await db.insert(schema.dealChecklists).values({
        dealId,
        templateId,
        appliedBy: userId,
        totalItems: templateItemRows.length,
        completedItems: 0,
        percentComplete: 0,
      }).returning();

      if (templateItemRows.length > 0) {
        const itemValues = templateItemRows.map(ti => ({
          dealChecklistId: checklist.id,
          templateItemId: ti.id,
          dealId,
          customName: ti.name,
          customDescription: ti.description,
          status: "pending" as const,
          assignedRole: ti.defaultAssigneeRole,
        }));
        await db.insert(schema.dealChecklistItems).values(itemValues);
      }

      return {
        success: true,
        message: `Checklist template applied to deal with ${templateItemRows.length} items`,
        checklistId: checklist.id,
        itemCount: templateItemRows.length,
        link: `/transactions/deals/${dealId}?tab=checklist`,
      };
    },
  },

  {
    name: "update_checklist_item",
    description:
      "Update the status of a checklist item (mark as completed, in_progress, pending, waived, or na). Use when a user asks to check off or update a closing checklist item.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "The checklist item ID" },
        status: { type: "string", description: "New status: pending, in_progress, completed, waived, na" },
        notes: { type: "string", description: "Optional notes about the status change" },
      },
      required: ["item_id", "status"],
    },
    execute: async (params, userId) => {
      const [item] = await db.select({
        id: schema.dealChecklistItems.id,
        dealId: schema.dealChecklistItems.dealId,
      }).from(schema.dealChecklistItems).where(eq(schema.dealChecklistItems.id, params.item_id));
      if (!item) return { success: false, message: "Checklist item not found" };

      if (!(await canAccessDeal(userId, item.dealId))) {
        return { success: false, message: "Access denied" };
      }

      const updateData: any = { status: params.status };
      if (params.notes) updateData.notes = params.notes;
      if (params.status === "completed") {
        updateData.satisfiedAt = new Date();
        updateData.satisfiedBy = userId;
        updateData.completedDate = new Date();
      }

      await db.update(schema.dealChecklistItems).set(updateData).where(eq(schema.dealChecklistItems.id, params.item_id));

      return {
        success: true,
        message: `Checklist item updated to "${params.status}"`,
        link: `/transactions/deals/${item.dealId}?tab=checklist`,
      };
    },
  },

  {
    name: "trigger_document_analysis",
    description:
      "Trigger AI analysis on a data room document. Useful when a user wants to analyze a specific document for due diligence, risk, or compliance insights.",
    category: "write",
    parameters: {
      type: "object",
      properties: {
        document_id: { type: "string", description: "The document ID to analyze" },
        document_name: { type: "string", description: "Document name to search for" },
      },
    },
    execute: async (params, userId) => {
      const authorizedIds = await getAuthorizedUserIds(userId);
      const orgOwned = inArray(schema.deals.createdBy, authorizedIds);
      const participantDealRows = await db.select({ dealId: schema.dealParticipants.dealId }).from(schema.dealParticipants)
        .where(and(eq(schema.dealParticipants.userId, userId), eq(schema.dealParticipants.isActive, true)));
      const participantDealIds = participantDealRows.map(p => p.dealId);
      const accessScope = participantDealIds.length > 0
        ? or(orgOwned, inArray(schema.deals.id, participantDealIds))
        : orgOwned;

      let docId = params.document_id;
      if (docId) {
        const [verified] = await db.select({ id: schema.dataRoomDocuments.id })
          .from(schema.dataRoomDocuments)
          .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
          .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id))
          .where(and(eq(schema.dataRoomDocuments.id, docId), accessScope))
          .limit(1);
        if (!verified) return { success: false, message: "Document not found or access denied" };
      } else if (params.document_name) {
        const [doc] = await db.select({
          id: schema.dataRoomDocuments.id,
          fileName: schema.dataRoomDocuments.fileName,
          dataRoomId: schema.dataRoomDocuments.dataRoomId,
        }).from(schema.dataRoomDocuments)
          .innerJoin(schema.dataRooms, eq(schema.dataRoomDocuments.dataRoomId, schema.dataRooms.id))
          .innerJoin(schema.deals, eq(schema.dataRooms.dealId, schema.deals.id))
          .where(and(
            ilike(schema.dataRoomDocuments.fileName, `%${params.document_name}%`),
            accessScope
          )).limit(1);
        docId = doc?.id;
      }
      if (!docId) return { success: false, message: "Document not found or access denied" };

      await db.update(schema.dataRoomDocuments).set({
        ocrStatus: "pending",
      }).where(eq(schema.dataRoomDocuments.id, docId));

      return {
        success: true,
        message: "Document analysis triggered. Results will be available shortly.",
        documentId: docId,
      };
    },
  },

  {
    name: "get_closing_timeline",
    description:
      "Get the closing timeline and key dates for a deal including target close date, effective date, and milestone dates from the checklist.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        deal_id: { type: "string", description: "The deal ID" },
        deal_name: { type: "string", description: "Deal name to search for" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveDeal(userId, params);
      if (!resolved) return { found: false, message: "Deal not found or access denied" };
      const dealId = resolved.id;

      const [deal] = await db.select({
        id: schema.deals.id,
        title: schema.deals.title,
        status: schema.deals.status,
        closingTargetDate: schema.deals.closingTargetDate,
        createdAt: schema.deals.createdAt,
      }).from(schema.deals).where(eq(schema.deals.id, dealId));
      if (!deal) return { found: false, message: "Deal not found or access denied" };

      const checklists = await db.select({
        id: schema.dealChecklists.id,
        totalItems: schema.dealChecklists.totalItems,
        completedItems: schema.dealChecklists.completedItems,
        percentComplete: schema.dealChecklists.percentComplete,
        effectiveDate: schema.dealChecklists.effectiveDate,
        targetCloseDate: schema.dealChecklists.targetCloseDate,
      }).from(schema.dealChecklists).where(eq(schema.dealChecklists.dealId, dealId));

      const upcomingItems = await db.select({
        id: schema.dealChecklistItems.id,
        customName: schema.dealChecklistItems.customName,
        status: schema.dealChecklistItems.status,
        dueDate: schema.dealChecklistItems.dueDate,
      }).from(schema.dealChecklistItems)
        .where(and(
          eq(schema.dealChecklistItems.dealId, dealId),
          sql`${schema.dealChecklistItems.dueDate} IS NOT NULL`,
          sql`${schema.dealChecklistItems.status} != 'completed'`
        ))
        .orderBy(schema.dealChecklistItems.dueDate)
        .limit(10);

      return {
        found: true,
        deal: { id: deal.id, title: deal.title, status: deal.status, closingTargetDate: deal.closingTargetDate },
        checklists: checklists.map(cl => ({
          ...cl,
          percentComplete: cl.percentComplete ? Math.round(cl.percentComplete) : 0,
        })),
        upcomingMilestones: upcomingItems,
        link: `/transactions/deals/${dealId}`,
      };
    },
  },

  {
    name: "get_case_summary_report",
    description:
      "Generate a comprehensive summary report for a case, including risk assessment, findings count, interview count, and key timeline events.",
    category: "read",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "The case ID" },
        case_name: { type: "string", description: "Case name to search for" },
      },
    },
    execute: async (params, userId) => {
      const resolved = await resolveCase(userId, params);
      if (!resolved) return { found: false, message: "Case not found or access denied" };
      const caseId = resolved.id;

      const [caseData] = await db.select().from(schema.cases).where(eq(schema.cases.id, caseId));
      if (!caseData) return { found: false, message: "Case not found or access denied" };

      const [findingsCount] = await db.select({ count: count() }).from(schema.findings).where(eq(schema.findings.caseId, caseId));
      const [interviewsCount] = await db.select({ count: count() }).from(schema.interviews).where(eq(schema.interviews.caseId, caseId));

      const pinnedFindings = await db.select({
        id: schema.findings.id,
        title: schema.findings.title,
        entryType: schema.findings.entryType,
      }).from(schema.findings)
        .where(and(eq(schema.findings.caseId, caseId), eq(schema.findings.isPinned, true)))
        .limit(5);

      return {
        found: true,
        case: {
          id: caseData.id,
          title: caseData.title,
          caseNumber: caseData.caseNumber,
          status: caseData.status,
          violationType: caseData.violationType,
          riskLevel: caseData.riskLevel,
          riskScore: caseData.riskScore,
          description: caseData.description?.substring(0, 500),
          aiAnalysis: caseData.aiAnalysisSummary?.substring(0, 500),
        },
        stats: {
          totalFindings: findingsCount?.count || 0,
          totalInterviews: interviewsCount?.count || 0,
          pinnedFindings: pinnedFindings.length,
        },
        pinnedFindings,
        link: `/cases/${caseId}`,
      };
    },
  },
  {
    name: "get_user_profile",
    description: "Get the current user's profile information including name, email, role, and organization membership.",
    category: "read",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async (_params: Record<string, any>, userId: string) => {
      const [user] = await db
        .select({
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
          role: schema.users.role,
          phone: schema.users.phone,
          createdAt: schema.users.createdAt,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (!user) return { error: "User not found" };

      const memberships = await db
        .select({
          orgId: schema.organizationMembers.organizationId,
          role: schema.organizationMembers.role,
          orgName: schema.organizations.name,
        })
        .from(schema.organizationMembers)
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
        .where(eq(schema.organizationMembers.userId, userId));

      return {
        ...user,
        organizations: memberships.map((m) => ({
          id: m.orgId,
          name: m.orgName,
          role: m.role,
        })),
      };
    },
  },
  {
    name: "get_organization_info",
    description: "Get information about the user's organization including members and their roles.",
    category: "read",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async (_params: Record<string, any>, userId: string) => {
      const orgId = await getUserOrgId(userId);
      if (!orgId) return { error: "User is not part of any organization" };

      const [org] = await db
        .select({
          id: schema.organizations.id,
          name: schema.organizations.name,
          createdAt: schema.organizations.createdAt,
        })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, orgId))
        .limit(1);
      if (!org) return { error: "Organization not found" };

      const members = await db
        .select({
          userId: schema.organizationMembers.userId,
          role: schema.organizationMembers.role,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        })
        .from(schema.organizationMembers)
        .leftJoin(schema.users, eq(schema.users.id, schema.organizationMembers.userId))
        .where(eq(schema.organizationMembers.organizationId, orgId));

      return {
        ...org,
        memberCount: members.length,
        members: members.map((m) => ({
          userId: m.userId,
          name: `${m.firstName || ""} ${m.lastName || ""}`.trim(),
          email: m.email,
          role: m.role,
        })),
      };
    },
  },
];

export function getToolRegistry(): AvaTool[] {
  const names = tools.map(t => t.name);
  const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
  if (duplicates.length > 0) {
    throw new Error(`[AvaTools] Duplicate tool names detected: ${duplicates.join(", ")}`);
  }
  return tools;
}

export function getToolDefinitionsForOpenAI(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}> {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function getToolByName(name: string): AvaTool | undefined {
  return tools.find((t) => t.name === name);
}

export async function executeTool(
  toolName: string,
  params: Record<string, any>,
  userId: string
): Promise<{ result: any; tool: AvaTool | null }> {
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
    return {
      result: { error: `Unknown tool: ${toolName}` },
      tool: null,
    };
  }

  try {
    const result = await tool.execute(params, userId);
    return { result, tool };
  } catch (error: any) {
    console.error(`[AvaTools] Error executing tool ${toolName}:`, error.message);
    return {
      result: { error: `Failed to execute ${toolName}: ${error.message}` },
      tool,
    };
  }
}
