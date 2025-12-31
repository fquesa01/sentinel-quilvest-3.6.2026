import { db } from "./db";
import * as schema from "@shared/schema";
import { desc, and, eq, count, sql } from "drizzle-orm";
import { buildCommunicationSummary, buildCommunicationMatrix, buildUnifiedTimeline } from "./analytics";

/**
 * Discovery Report Generator
 * Generates comprehensive litigation/investigation reports with multiple sections
 */

/**
 * Helper: Recursively extract ALL emails from any structure
 * Handles: strings, nested objects, arrays, various email property names
 * Returns array of all unique normalized emails found
 */
function extractAllEmails(value: any, depth: number = 0, emails: Set<string> = new Set()): string[] {
  // Prevent infinite recursion
  if (depth > 10) return Array.from(emails);
  
  // Null/undefined
  if (!value) return Array.from(emails);
  
  // Plain string - parse RFC2822 format and split delimited lists
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return Array.from(emails);
    
    // Split by common delimiters (comma, semicolon, newline, tab, pipe)
    const parts = trimmed.split(/[,;\n\t|]+/).map(p => p.trim()).filter(p => p);
    
    for (let part of parts) {
      // Strip surrounding quotes
      part = part.replace(/^["']|["']$/g, '');
      
      // Remove protocol prefixes (SMTP:, mailto:, sip:, etc.)
      part = part.replace(/^(smtp|SMTP|mailto|MAILTO|sip|SIP|tel|TEL):/i, '');
      
      // Extract email from RFC2822 format: "Display Name <email@example.com>"
      const rfc2822Match = part.match(/<([^>]+)>/);
      if (rfc2822Match) {
        let email = rfc2822Match[1].trim();
        // Remove any remaining quotes or prefixes from extracted email
        email = email.replace(/^["']|["']$/g, '');
        email = email.replace(/^(smtp|mailto|sip|tel):/i, '');
        email = email.toLowerCase();
        if (email.includes('@') && email.length > 3) {
          emails.add(email);
        }
      } else if (part.includes('@') && part.length > 3) {
        // Plain email address
        emails.add(part.toLowerCase());
      }
    }
    
    return Array.from(emails);
  }
  
  // Array - extract from ALL items (not just first)
  if (Array.isArray(value)) {
    for (const item of value) {
      extractAllEmails(item, depth + 1, emails);
    }
    return Array.from(emails);
  }
  
  // Object - check common email property names first, then all properties
  if (typeof value === 'object' && value !== null) {
    // Check RECIPIENT-specific email keys (EXCLUDING sender/from fields)
    const recipientKeys = [
      'to', 'To', 'TO',
      'cc', 'Cc', 'CC',
      'bcc', 'Bcc', 'BCC',
      'recipient', 'Recipient', 'recipients', 'Recipients',
      'email', 'Email', 'address', 'Address',
      'emailAddress', 'EmailAddress', 'smtpAddress', 'SmtpAddress',
      'mail', 'Mail', 'mailAddress', 'MailAddress'
    ];
    
    for (const key of recipientKeys) {
      if (key in value) {
        extractAllEmails(value[key], depth + 1, emails);
      }
    }
    
    // Recursively check remaining properties (but skip sender/from fields, circular refs, and buffers)
    const senderKeys = ['from', 'From', 'FROM', 'sender', 'Sender', 'SENDER'];
    for (const key in value) {
      if (value.hasOwnProperty(key) && 
          key !== '__proto__' && 
          !senderKeys.includes(key) &&
          !(value[key] instanceof ArrayBuffer)) {
        extractAllEmails(value[key], depth + 1, emails);
      }
    }
  }
  
  return Array.from(emails);
}

/**
 * Helper: Safely normalize email string (null-safe)
 */
function normalizeEmail(email: any): string {
  if (!email || typeof email !== 'string') return "";
  return email.toLowerCase().trim();
}

/**
 * Helper: Check if a custodian email matches any recipient in the structure
 */
function isRecipientMatch(recipients: any, custodianEmail: string): boolean {
  if (!recipients || !custodianEmail) return false;
  
  const normalizedCustodian = custodianEmail.toLowerCase().trim();
  const allEmails = extractAllEmails(recipients);
  
  return allEmails.includes(normalizedCustodian);
}

export interface ReportMetadata {
  caseId: string;
  caseTitle: string;
  caseNumber: string;
  caseStatus: string;
  violationType: string;
  priority: string;
  primaryAttorney: string;
  dateOpened: string;
  dateGenerated: string;
  reportGeneratedBy: string;
  totalDocuments: number;
  totalCommunications: number;
  totalCustodians: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
}

export interface CustodianSummary {
  custodianId: string;
  name: string;
  email: string | null;
  department: string | null;
  role: string | null;
  documentCount: number;
  emailsSent: number;
  emailsReceived: number;
  chatMessageCount: number;
  totalCommunications: number;
  firstActivityDate: string | null;
  lastActivityDate: string | null;
}

export interface TagSummary {
  tagId: string;
  tagName: string;
  category: string;
  color: string;
  documentCount: number;
  uniqueApplicators: number;
  createdBy: string | null;
  isPreset: boolean;
  usagePercentage: number;
}

export interface PrivilegeSummary {
  totalPrivilegedDocuments: number;
  totalPrivilegeAssertions: number;
  privilegeTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  privilegeLogs: Array<{
    logId: string;
    documentId: string;
    privilegeType: string;
    assertedBy: string;
    assertedDate: string;
    basis: string | null;
  }>;
}

export interface FileTypeBreakdown {
  fileTypes: Array<{
    extension: string;
    mimeType: string | null;
    count: number;
    totalSizeBytes: number;
    percentage: number;
  }>;
  totalFiles: number;
  totalSizeBytes: number;
}

export interface ProductionBatchSummary {
  batches: Array<{
    batchId: string;
    batchName: string;
    productionDate: string;
    documentCount: number;
    integrityHash: string | null;
    producedBy: string | null;
    recipient: string | null;
    transmissionMethod: string | null;
  }>;
  totalBatches: number;
  totalDocumentsProduced: number;
}

/**
 * Compute case metadata and statistics
 */
export async function computeMetadata(caseId: string, userId: string): Promise<ReportMetadata> {
  // Fetch case details
  const [caseData] = await db
    .select()
    .from(schema.cases)
    .where(eq(schema.cases.id, caseId));

  if (!caseData) {
    throw new Error(`Case not found: ${caseId}`);
  }

  // Get document count from communications (includes all ingested emails, chats, and documents)
  const [commCount] = await db
    .select({ count: count() })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  const totalDocuments = commCount.count || 0;
  const totalCommunications = commCount.count || 0;

  // Get custodian count
  const custodians = await db
    .select()
    .from(schema.custodians)
    .where(eq(schema.custodians.caseId, caseId));

  // Get date range from communications
  const [dateRange] = await db
    .select({
      minDate: sql<string>`MIN(${schema.communications.timestamp})`,
      maxDate: sql<string>`MAX(${schema.communications.timestamp})`,
    })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  // Get primary attorney from case assignments
  const [primaryAssignment] = await db
    .select({
      userId: schema.caseAssignments.userId,
    })
    .from(schema.caseAssignments)
    .where(and(
      eq(schema.caseAssignments.caseId, caseId),
      eq(schema.caseAssignments.assignmentRole, "lead_attorney")
    ))
    .limit(1);

  let primaryAttorneyName = "Unassigned";
  if (primaryAssignment) {
    const [attorney] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, primaryAssignment.userId));
    if (attorney) {
      const fullName = [attorney.firstName, attorney.lastName].filter(Boolean).join(" ");
      primaryAttorneyName = fullName || attorney.email || "Unknown";
    }
  }

  return {
    caseId: caseData.id,
    caseTitle: caseData.title,
    caseNumber: caseData.caseNumber,
    caseStatus: caseData.status,
    violationType: caseData.violationType,
    priority: caseData.priority,
    primaryAttorney: primaryAttorneyName,
    dateOpened: caseData.createdAt.toISOString(),
    dateGenerated: new Date().toISOString(),
    reportGeneratedBy: userId,
    totalDocuments,
    totalCommunications,
    totalCustodians: custodians.length,
    dateRangeStart: dateRange.minDate,
    dateRangeEnd: dateRange.maxDate,
  };
}

/**
 * Compute custodian summary statistics
 */
export async function computeCustodianSummary(caseId: string): Promise<CustodianSummary[]> {
  const custodians = await db
    .select()
    .from(schema.custodians)
    .where(eq(schema.custodians.caseId, caseId))
    .orderBy(schema.custodians.fullName);

  // Optimization: Query all communications once, cache in memory
  const allComms = await db
    .select({
      id: schema.communications.id,
      sender: schema.communications.sender,
      recipients: schema.communications.recipients,
      timestamp: schema.communications.timestamp,
    })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  // Query all chat messages once
  const allChats = await db
    .select({
      senderId: schema.ingestedChatMessages.senderId,
      sentAt: schema.ingestedChatMessages.sentAt,
    })
    .from(schema.ingestedChatMessages)
    .where(eq(schema.ingestedChatMessages.caseId, caseId));

  const summaries: CustodianSummary[] = [];

  for (const custodian of custodians) {
    const custodianEmail = custodian.email || "";
    const normalizedCustodianEmail = normalizeEmail(custodianEmail);
    
    if (!normalizedCustodianEmail) {
      // Skip custodians with no email
      continue;
    }
    
    // Count sent communications (null-safe case-insensitive sender matching)
    const sentComms = allComms.filter(c => 
      normalizeEmail(c.sender) === normalizedCustodianEmail
    );
    const sentCount = sentComms.length;
    
    // Count received communications (robust JSONB recipient parsing)
    const receivedComms = allComms.filter(comm => 
      isRecipientMatch(comm.recipients, custodianEmail)
    );
    const receivedCount = receivedComms.length;

    // Count chat messages for this custodian (null-safe case-insensitive)
    const custodianChats = allChats.filter(chat => 
      normalizeEmail(chat.senderId) === normalizedCustodianEmail
    );
    const chatCount = custodianChats.length;

    // Get date range for this custodian from all activity (sent, received, chats)
    const allTimestamps: Date[] = [];
    
    // Sent communications timestamps
    allTimestamps.push(...sentComms.map(c => c.timestamp));
    
    // Received communications timestamps
    allTimestamps.push(...receivedComms.map(c => c.timestamp));
    
    // Chat messages timestamps
    allTimestamps.push(...custodianChats.map(c => c.timestamp));
    
    // Compute min/max from all activity
    const minDate = allTimestamps.length > 0 
      ? new Date(Math.min(...allTimestamps.map(d => d.getTime()))).toISOString()
      : null;
    const maxDate = allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps.map(d => d.getTime()))).toISOString()
      : null;

    summaries.push({
      custodianId: custodian.id,
      name: custodian.fullName,
      email: custodian.email,
      department: custodian.department,
      role: custodian.title,
      documentCount: sentCount + receivedCount,
      emailsSent: sentCount,
      emailsReceived: receivedCount,
      chatMessageCount: chatCount,
      totalCommunications: sentCount + receivedCount + chatCount,
      firstActivityDate: minDate,
      lastActivityDate: maxDate,
    });
  }

  return summaries.sort((a, b) => b.totalCommunications - a.totalCommunications);
}

/**
 * Compute tag analysis and distribution
 */
export async function computeTagAnalysis(caseId: string): Promise<TagSummary[]> {
  // Get all communications for this case
  const caseComms = await db
    .select({ id: schema.communications.id })
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  const commIds = caseComms.map(c => c.id);

  if (commIds.length === 0) {
    return [];
  }

  // Get all tags
  const allTags = await db
    .select()
    .from(schema.tags)
    .orderBy(schema.tags.name);

  const tagSummaries: TagSummary[] = [];

  for (const tag of allTags) {
    // Count documents tagged with this tag in this case
    const documentTags = await db
      .select()
      .from(schema.documentTags)
      .where(eq(schema.documentTags.tagId, tag.id));

    // Filter to only this case's documents (documentTags uses entityId for document reference)
    const caseDocumentTags = documentTags.filter(dt => 
      commIds.includes(dt.entityId)
    );

    if (caseDocumentTags.length > 0) {
      // Count unique applicators
      const uniqueApplicators = new Set(caseDocumentTags.map(dt => dt.taggedBy)).size;

      tagSummaries.push({
        tagId: tag.id,
        tagName: tag.name,
        category: tag.category,
        color: tag.color,
        documentCount: caseDocumentTags.length,
        uniqueApplicators,
        createdBy: tag.createdBy,
        isPreset: tag.isPreset === "true" || tag.isPreset === true,
        usagePercentage: (caseDocumentTags.length / commIds.length) * 100,
      });
    }
  }

  return tagSummaries.sort((a, b) => b.documentCount - a.documentCount);
}

/**
 * Compute privilege summary and logs
 */
export async function computePrivilegeSummary(caseId: string): Promise<PrivilegeSummary> {
  // Count privileged communications (any privilege status except "none")
  const [privilegedCount] = await db
    .select({ count: count() })
    .from(schema.communications)
    .where(and(
      eq(schema.communications.caseId, caseId),
      sql`${schema.communications.privilegeStatus} != 'none'`
    ));

  // Get privilege logs for this case
  const privilegeLogs = await db
    .select()
    .from(schema.privilegeLogs)
    .where(eq(schema.privilegeLogs.caseId, caseId))
    .orderBy(desc(schema.privilegeLogs.assertedAt));

  // Count privilege types
  const privilegeTypeCounts: Record<string, number> = {};
  for (const log of privilegeLogs) {
    const type = log.privilegeType || "Unknown";
    privilegeTypeCounts[type] = (privilegeTypeCounts[type] || 0) + 1;
  }

  const privilegeTypes = Object.entries(privilegeTypeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: (count / privilegeLogs.length) * 100,
  })).sort((a, b) => b.count - a.count);

  return {
    totalPrivilegedDocuments: privilegedCount.count,
    totalPrivilegeAssertions: privilegeLogs.length,
    privilegeTypes,
    privilegeLogs: privilegeLogs.slice(0, 100).map(log => ({
      logId: log.id,
      documentId: log.documentId,
      privilegeType: log.privilegeType || "Unknown",
      assertedBy: log.assertedBy,
      assertedDate: log.assertedAt.toISOString(),
      basis: log.privilegeBasis || "Unknown",
    })),
  };
}

/**
 * Compute file type breakdown
 */
export async function computeFileTypeBreakdown(caseId: string): Promise<FileTypeBreakdown> {
  const communications = await db
    .select()
    .from(schema.communications)
    .where(eq(schema.communications.caseId, caseId));

  const fileTypeCounts: Record<string, { count: number; sizeBytes: number; mimeType: string | null }> = {};

  for (const comm of communications) {
    // Extract file extension from subject or format field
    let extension = "unknown";
    if (comm.format) {
      extension = comm.format.toLowerCase();
    } else if (comm.subject) {
      const match = comm.subject.match(/\.([a-z0-9]+)$/i);
      if (match) {
        extension = match[1].toLowerCase();
      }
    }

    if (!fileTypeCounts[extension]) {
      fileTypeCounts[extension] = {
        count: 0,
        sizeBytes: 0,
        mimeType: comm.mimeType || null,
      };
    }

    fileTypeCounts[extension].count++;
    fileTypeCounts[extension].sizeBytes += comm.size || 0;
  }

  const totalFiles = communications.length;
  const totalSizeBytes = communications.reduce((sum, comm) => sum + (comm.size || 0), 0);

  const fileTypes = Object.entries(fileTypeCounts).map(([extension, data]) => ({
    extension,
    mimeType: data.mimeType,
    count: data.count,
    totalSizeBytes: data.sizeBytes,
    percentage: (data.count / totalFiles) * 100,
  })).sort((a, b) => b.count - a.count);

  return {
    fileTypes,
    totalFiles,
    totalSizeBytes,
  };
}

/**
 * Compute production batch summary
 */
export async function computeProductionBatchSummary(caseId: string): Promise<ProductionBatchSummary> {
  const batches = await db
    .select()
    .from(schema.productionSets)
    .where(eq(schema.productionSets.caseId, caseId))
    .orderBy(desc(schema.productionSets.transmittedAt));

  const batchSummaries = batches.map(batch => {
    const docIds = typeof batch.documentIds === "string" 
      ? JSON.parse(batch.documentIds) 
      : (Array.isArray(batch.documentIds) ? batch.documentIds : []);

    // Extract hash from hashManifest if available
    let integrityHash = null;
    if (batch.hashManifest) {
      const manifest = typeof batch.hashManifest === "string" 
        ? JSON.parse(batch.hashManifest)
        : batch.hashManifest;
      // Get first document hash as representative
      const firstKey = Object.keys(manifest)[0];
      if (firstKey && manifest[firstKey]?.sha256) {
        integrityHash = manifest[firstKey].sha256.substring(0, 16) + "...";
      }
    }

    return {
      batchId: batch.id,
      batchName: batch.productionName,
      productionDate: batch.transmittedAt?.toISOString() || batch.createdAt.toISOString(),
      documentCount: batch.documentCount || docIds.length,
      integrityHash,
      producedBy: batch.createdBy || "Unknown",
      recipient: batch.transmittedTo || "Unknown",
      transmissionMethod: batch.transmissionMethod || "Unknown",
    };
  });

  const totalDocumentsProduced = batchSummaries.reduce((sum, batch) => sum + batch.documentCount, 0);

  return {
    batches: batchSummaries,
    totalBatches: batches.length,
    totalDocumentsProduced,
  };
}

/**
 * Generate complete discovery report
 */
export async function generateDiscoveryReport(caseId: string, userId: string) {
  const metadata = await computeMetadata(caseId, userId);
  const custodians = await computeCustodianSummary(caseId);
  const tags = await computeTagAnalysis(caseId);
  const privilege = await computePrivilegeSummary(caseId);
  const fileTypeData = await computeFileTypeBreakdown(caseId);
  const productionData = await computeProductionBatchSummary(caseId);
  
  // Communication analytics (reusing existing analytics module)
  const communicationSummary = await buildCommunicationSummary(1, caseId);
  const communicationMatrix = await buildCommunicationMatrix(10, caseId);

  return {
    metadata,
    custodians,
    tags,
    privilege,
    fileTypes: fileTypeData.fileTypes, // Extract array from wrapper object
    productions: productionData.batches, // Extract array from wrapper object
    communications: {
      summary: communicationSummary,
      matrix: communicationMatrix,
    },
  };
}
