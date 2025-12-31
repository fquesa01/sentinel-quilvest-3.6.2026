import { db } from "../db";
import { eq, and, inArray, desc, asc, isNotNull } from "drizzle-orm";
import * as schema from "@shared/schema";

interface PrivilegeLogEntry {
  batesNumber: string;
  documentDate: string;
  documentType: string;
  author: string;
  recipients: string;
  description: string;
  privilegeType: string;
  privilegeBasis: string;
  assertion: string;
}

interface PrivilegeLogExport {
  entries: PrivilegeLogEntry[];
  caseNumber: string;
  caseName: string;
  generatedAt: string;
  totalEntries: number;
}

export class PrivilegeLogService {
  /**
   * Create a privilege log entry
   */
  static async createEntry(data: schema.InsertPrivilegeLog): Promise<schema.PrivilegeLog> {
    const [entry] = await db
      .insert(schema.privilegeLogs)
      .values(data)
      .returning();
    
    return entry;
  }

  /**
   * Get privilege log entry by ID
   */
  static async getEntryById(id: string): Promise<schema.PrivilegeLog | null> {
    const [entry] = await db
      .select()
      .from(schema.privilegeLogs)
      .where(eq(schema.privilegeLogs.id, id));
    
    return entry || null;
  }

  /**
   * Get all privilege log entries for a case
   */
  static async getEntriesByCase(caseId: string): Promise<schema.PrivilegeLog[]> {
    return db
      .select()
      .from(schema.privilegeLogs)
      .where(eq(schema.privilegeLogs.caseId, caseId))
      .orderBy(asc(schema.privilegeLogs.batesNumber));
  }

  /**
   * Update privilege log entry
   */
  static async updateEntry(
    id: string,
    data: Partial<schema.InsertPrivilegeLog>
  ): Promise<schema.PrivilegeLog> {
    const [updated] = await db
      .update(schema.privilegeLogs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.privilegeLogs.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Delete privilege log entry
   */
  static async deleteEntry(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.privilegeLogs)
      .where(eq(schema.privilegeLogs.id, id));
    
    return true;
  }

  /**
   * Generate privilege log entries from privileged documents
   */
  static async generateFromPrivilegedDocuments(
    caseId: string,
    assertedBy: string
  ): Promise<{ created: number; skipped: number }> {
    const privilegedDocs = await db
      .select()
      .from(schema.communications)
      .where(
        and(
          eq(schema.communications.caseId, caseId),
          eq(schema.communications.privilegeStatus, "attorney_client_privileged")
        )
      );

    let created = 0;
    let skipped = 0;

    for (const doc of privilegedDocs) {
      const existingEntry = await db
        .select()
        .from(schema.privilegeLogs)
        .where(eq(schema.privilegeLogs.documentId, doc.id));

      if (existingEntry.length > 0) {
        skipped++;
        continue;
      }

      const recipients = (doc.recipients as string[]) || [];

      await db
        .insert(schema.privilegeLogs)
        .values({
          caseId,
          batesNumber: doc.batesNumber || undefined,
          documentType: doc.communicationType || "communication",
          documentId: doc.id,
          documentDate: doc.timestamp || new Date(),
          documentDescription: this.generateDocumentDescription(doc),
          author: doc.sender || "Unknown",
          recipients: recipients,
          privilegeType: doc.privilegeStatus as any || "attorney_client_privileged",
          privilegeBasis: doc.privilegeBasis as any || "attorney_client_communication",
          privilegeAssertion: this.generatePrivilegeAssertion(doc),
          isCounselDirected: "true",
          isPartiallyPrivileged: doc.isRedacted === "true" ? "true" : "false",
          redactionApplied: doc.isRedacted || "false",
          assertedBy,
        });

      created++;
    }

    return { created, skipped };
  }

  /**
   * Generate document description for privilege log
   */
  private static generateDocumentDescription(doc: schema.Communication): string {
    const type = doc.communicationType || "Communication";
    const subject = doc.subject || "No Subject";
    const date = doc.timestamp ? new Date(doc.timestamp).toLocaleDateString() : "Unknown Date";
    
    return `${type} dated ${date}: ${subject}`;
  }

  /**
   * Generate standard privilege assertion text
   */
  private static generatePrivilegeAssertion(doc: schema.Communication): string {
    const privilegeType = doc.privilegeStatus;
    const basis = doc.privilegeBasis;

    if (privilegeType === "attorney_client_privileged") {
      return "This document is withheld as a confidential attorney-client communication made for the purpose of seeking or providing legal advice.";
    } else if (privilegeType === "work_product") {
      return "This document is withheld as attorney work product prepared in anticipation of litigation.";
    } else if (privilegeType === "both") {
      return "This document is withheld as it constitutes both a confidential attorney-client communication and attorney work product prepared in anticipation of litigation.";
    }

    return "This document is withheld on the basis of privilege.";
  }

  /**
   * Export privilege log to structured format
   */
  static async exportPrivilegeLog(caseId: string): Promise<PrivilegeLogExport> {
    const entries = await this.getEntriesByCase(caseId);
    
    const caseInfo = await db
      .select()
      .from(schema.cases)
      .where(eq(schema.cases.id, caseId));

    const exportEntries: PrivilegeLogEntry[] = entries.map(entry => ({
      batesNumber: entry.batesNumber || "",
      documentDate: entry.documentDate ? new Date(entry.documentDate).toLocaleDateString() : "",
      documentType: entry.documentType,
      author: entry.author,
      recipients: Array.isArray(entry.recipients) 
        ? (entry.recipients as string[]).join("; ")
        : String(entry.recipients || ""),
      description: entry.documentDescription,
      privilegeType: entry.privilegeType,
      privilegeBasis: entry.privilegeBasis,
      assertion: entry.privilegeAssertion,
    }));

    return {
      entries: exportEntries,
      caseNumber: caseInfo[0]?.caseNumber || "",
      caseName: caseInfo[0]?.title || "",
      generatedAt: new Date().toISOString(),
      totalEntries: exportEntries.length,
    };
  }

  /**
   * Generate CSV format privilege log
   */
  static async generateCSV(caseId: string): Promise<{ content: string; filename: string }> {
    const exportData = await this.exportPrivilegeLog(caseId);

    const headers = [
      "Bates Number",
      "Document Date",
      "Document Type",
      "Author/From",
      "Recipients/To",
      "Description",
      "Privilege Type",
      "Privilege Basis",
      "Privilege Assertion",
    ];

    let csv = headers.join(",") + "\n";

    for (const entry of exportData.entries) {
      const row = [
        this.escapeCSV(entry.batesNumber),
        this.escapeCSV(entry.documentDate),
        this.escapeCSV(entry.documentType),
        this.escapeCSV(entry.author),
        this.escapeCSV(entry.recipients),
        this.escapeCSV(entry.description),
        this.escapeCSV(entry.privilegeType),
        this.escapeCSV(entry.privilegeBasis),
        this.escapeCSV(entry.assertion),
      ];
      csv += row.join(",") + "\n";
    }

    const filename = `privilege_log_${exportData.caseNumber || caseId}_${new Date().toISOString().split("T")[0]}.csv`;

    return { content: csv, filename };
  }

  /**
   * Escape CSV field values
   */
  private static escapeCSV(value: string): string {
    if (!value) return '""';
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Mark entry as reviewed
   */
  static async markReviewed(
    entryId: string,
    reviewedBy: string
  ): Promise<schema.PrivilegeLog> {
    return this.updateEntry(entryId, {
      reviewedBy,
      reviewedAt: new Date(),
    });
  }

  /**
   * Get privilege log statistics for a case
   */
  static async getStats(caseId: string): Promise<{
    totalEntries: number;
    byPrivilegeType: Record<string, number>;
    byPrivilegeBasis: Record<string, number>;
    reviewedCount: number;
    unreviewedCount: number;
    exportedCount: number;
  }> {
    const entries = await this.getEntriesByCase(caseId);

    const byPrivilegeType: Record<string, number> = {};
    const byPrivilegeBasis: Record<string, number> = {};
    let reviewedCount = 0;
    let unreviewedCount = 0;
    let exportedCount = 0;

    for (const entry of entries) {
      const type = entry.privilegeType || "unknown";
      byPrivilegeType[type] = (byPrivilegeType[type] || 0) + 1;

      const basis = entry.privilegeBasis || "unknown";
      byPrivilegeBasis[basis] = (byPrivilegeBasis[basis] || 0) + 1;

      if (entry.reviewedAt) {
        reviewedCount++;
      } else {
        unreviewedCount++;
      }

      if (entry.exportedForLitigation === "true") {
        exportedCount++;
      }
    }

    return {
      totalEntries: entries.length,
      byPrivilegeType,
      byPrivilegeBasis,
      reviewedCount,
      unreviewedCount,
      exportedCount,
    };
  }

  /**
   * Assign Bates numbers to privilege log entries
   */
  static async assignBatesNumbers(
    caseId: string,
    prefix: string,
    startNumber: number,
    padding: number = 6
  ): Promise<{ updated: number }> {
    const entries = await db
      .select()
      .from(schema.privilegeLogs)
      .where(
        and(
          eq(schema.privilegeLogs.caseId, caseId),
          eq(schema.privilegeLogs.batesNumber, null as any)
        )
      )
      .orderBy(asc(schema.privilegeLogs.documentDate));

    let currentNumber = startNumber;
    let updated = 0;

    for (const entry of entries) {
      const batesNumber = `${prefix}-${String(currentNumber).padStart(padding, "0")}`;
      
      await db
        .update(schema.privilegeLogs)
        .set({ batesNumber, updatedAt: new Date() })
        .where(eq(schema.privilegeLogs.id, entry.id));

      currentNumber++;
      updated++;
    }

    return { updated };
  }
}
