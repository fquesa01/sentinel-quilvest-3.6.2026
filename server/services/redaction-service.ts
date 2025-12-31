import { db } from "../db";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

interface RedactionMatch {
  start: number;
  end: number;
  matchedText: string;
  reason: string;
  templateId?: string;
}

interface AppliedRedaction {
  id: string;
  documentId: string;
  redactionType: string;
  textSelection?: { start: number; end: number; content: string };
  coordinates?: { x: number; y: number; width: number; height: number };
  reason: string;
  status: string;
}

export class RedactionService {
  /**
   * Common PII patterns for automatic redaction
   */
  static readonly PII_PATTERNS: Record<string, { regex: RegExp; reason: string }> = {
    ssn: {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      reason: "Social Security Number",
    },
    ssn_no_dash: {
      regex: /\b\d{9}\b/g,
      reason: "Potential SSN (9 digits)",
    },
    credit_card: {
      regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      reason: "Credit Card Number",
    },
    phone: {
      regex: /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      reason: "Phone Number",
    },
    email: {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      reason: "Email Address",
    },
    bank_account: {
      regex: /\b\d{8,17}\b/g,
      reason: "Potential Bank Account Number",
    },
    dob: {
      regex: /\b(?:0[1-9]|1[0-2])[-\/](?:0[1-9]|[12]\d|3[01])[-\/](?:19|20)\d{2}\b/g,
      reason: "Date of Birth",
    },
  };

  /**
   * Create a redaction template
   */
  static async createTemplate(data: schema.InsertRedactionTemplate): Promise<schema.RedactionTemplate> {
    const [template] = await db
      .insert(schema.redactionTemplates)
      .values(data)
      .returning();
    
    return template;
  }

  /**
   * Get all redaction templates
   */
  static async getTemplates(): Promise<schema.RedactionTemplate[]> {
    return db
      .select()
      .from(schema.redactionTemplates)
      .where(eq(schema.redactionTemplates.isActive, "true"))
      .orderBy(desc(schema.redactionTemplates.createdAt));
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(id: string): Promise<schema.RedactionTemplate | null> {
    const [template] = await db
      .select()
      .from(schema.redactionTemplates)
      .where(eq(schema.redactionTemplates.id, id));
    
    return template || null;
  }

  /**
   * Update template
   */
  static async updateTemplate(
    id: string,
    data: Partial<schema.InsertRedactionTemplate>
  ): Promise<schema.RedactionTemplate> {
    const [updated] = await db
      .update(schema.redactionTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.redactionTemplates.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Scan text for PII patterns
   */
  static scanForPII(text: string, patternTypes?: string[]): RedactionMatch[] {
    const matches: RedactionMatch[] = [];
    const patterns = patternTypes 
      ? Object.entries(this.PII_PATTERNS).filter(([key]) => patternTypes.includes(key))
      : Object.entries(this.PII_PATTERNS);

    for (const [type, { regex, reason }] of patterns) {
      const pattern = new RegExp(regex.source, regex.flags);
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          matchedText: match[0],
          reason,
        });
      }
    }

    return matches.sort((a, b) => a.start - b.start);
  }

  /**
   * Scan text using custom regex pattern
   */
  static scanWithPattern(text: string, pattern: string, reason: string, caseSensitive: boolean = false): RedactionMatch[] {
    const matches: RedactionMatch[] = [];
    const flags = caseSensitive ? "g" : "gi";
    
    try {
      const regex = new RegExp(pattern, flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          matchedText: match[0],
          reason,
        });
      }
    } catch (error) {
      console.error("Invalid regex pattern:", pattern, error);
    }

    return matches;
  }

  /**
   * Scan text using keywords
   */
  static scanWithKeywords(text: string, keywords: string[], reason: string, caseSensitive: boolean = false): RedactionMatch[] {
    const matches: RedactionMatch[] = [];
    const searchText = caseSensitive ? text : text.toLowerCase();

    for (const keyword of keywords) {
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      let index = 0;
      
      while ((index = searchText.indexOf(searchKeyword, index)) !== -1) {
        matches.push({
          start: index,
          end: index + keyword.length,
          matchedText: text.substring(index, index + keyword.length),
          reason,
        });
        index += keyword.length;
      }
    }

    return matches.sort((a, b) => a.start - b.start);
  }

  /**
   * Apply redaction template to document text
   */
  static async scanDocumentWithTemplate(
    documentId: string,
    templateId: string,
    text: string
  ): Promise<RedactionMatch[]> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error("Redaction template not found");
    }

    let matches: RedactionMatch[] = [];
    const caseSensitive = template.caseSensitive === "true";

    if (template.templateType === "regex" && template.regexPattern) {
      matches = this.scanWithPattern(text, template.regexPattern, template.redactionReason, caseSensitive);
    } else if (template.templateType === "entity" && template.entityType) {
      const patternConfig = this.PII_PATTERNS[template.entityType];
      if (patternConfig) {
        matches = this.scanWithPattern(text, patternConfig.regex.source, template.redactionReason, caseSensitive);
      }
    } else if (template.keywords) {
      matches = this.scanWithKeywords(text, template.keywords as string[], template.redactionReason, caseSensitive);
    }

    matches.forEach(m => m.templateId = templateId);
    return matches;
  }

  /**
   * Apply redaction to a document
   */
  static async applyRedaction(data: schema.InsertDocumentRedaction): Promise<schema.DocumentRedaction> {
    const [redaction] = await db
      .insert(schema.documentRedactions)
      .values(data)
      .returning();

    if (data.templateId) {
      await db
        .update(schema.redactionTemplates)
        .set({ 
          usageCount: sql`usage_count + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.redactionTemplates.id, data.templateId));
    }

    return redaction;
  }

  /**
   * Apply multiple redactions to a document
   */
  static async applyBulkRedactions(
    documentId: string,
    caseId: string,
    matches: RedactionMatch[],
    appliedBy: string,
    isAutomatic: boolean = false
  ): Promise<schema.DocumentRedaction[]> {
    const redactions: schema.DocumentRedaction[] = [];

    for (const match of matches) {
      const [redaction] = await db
        .insert(schema.documentRedactions)
        .values({
          documentId,
          caseId,
          redactionType: "text",
          templateId: match.templateId || null,
          textSelection: {
            start: match.start,
            end: match.end,
            content: match.matchedText,
          },
          redactionReason: match.reason,
          appliedBy,
          isAutomatic: isAutomatic ? "true" : "false",
          status: isAutomatic ? "pending" : "approved",
        })
        .returning();
      
      redactions.push(redaction);
    }

    await db
      .update(schema.communications)
      .set({
        isRedacted: "true",
        redactionLog: {
          redactionCount: redactions.length,
          lastRedactedAt: new Date().toISOString(),
          appliedBy,
        },
      })
      .where(eq(schema.communications.id, documentId));

    return redactions;
  }

  /**
   * Get redactions for a document
   */
  static async getDocumentRedactions(documentId: string): Promise<schema.DocumentRedaction[]> {
    return db
      .select()
      .from(schema.documentRedactions)
      .where(eq(schema.documentRedactions.documentId, documentId))
      .orderBy(desc(schema.documentRedactions.createdAt));
  }

  /**
   * Get all redactions for a case
   */
  static async getCaseRedactions(caseId: string): Promise<schema.DocumentRedaction[]> {
    return db
      .select()
      .from(schema.documentRedactions)
      .where(eq(schema.documentRedactions.caseId, caseId))
      .orderBy(desc(schema.documentRedactions.createdAt));
  }

  /**
   * Approve or reject a redaction
   */
  static async reviewRedaction(
    redactionId: string,
    status: "approved" | "rejected",
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<schema.DocumentRedaction> {
    const [updated] = await db
      .update(schema.documentRedactions)
      .set({
        status,
        approvedBy: status === "approved" ? reviewedBy : null,
        approvedAt: status === "approved" ? new Date() : null,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      })
      .where(eq(schema.documentRedactions.id, redactionId))
      .returning();
    
    return updated;
  }

  /**
   * Remove a redaction
   */
  static async removeRedaction(redactionId: string): Promise<boolean> {
    const [redaction] = await db
      .select()
      .from(schema.documentRedactions)
      .where(eq(schema.documentRedactions.id, redactionId));

    if (!redaction) {
      return false;
    }

    await db
      .delete(schema.documentRedactions)
      .where(eq(schema.documentRedactions.id, redactionId));

    const remainingRedactions = await this.getDocumentRedactions(redaction.documentId);
    if (remainingRedactions.length === 0) {
      await db
        .update(schema.communications)
        .set({
          isRedacted: "false",
          redactionLog: null,
        })
        .where(eq(schema.communications.id, redaction.documentId));
    }

    return true;
  }

  /**
   * Generate redacted text by replacing matched content
   */
  static applyRedactionsToText(text: string, redactions: RedactionMatch[], redactionChar: string = "█"): string {
    const sortedRedactions = [...redactions].sort((a, b) => b.start - a.start);
    let redactedText = text;

    for (const redaction of sortedRedactions) {
      const replacement = redactionChar.repeat(redaction.end - redaction.start);
      redactedText = redactedText.substring(0, redaction.start) + replacement + redactedText.substring(redaction.end);
    }

    return redactedText;
  }

  /**
   * Get redaction statistics for a case
   */
  static async getRedactionStats(caseId: string): Promise<{
    totalRedactions: number;
    byReason: Record<string, number>;
    byStatus: Record<string, number>;
    automaticCount: number;
    manualCount: number;
  }> {
    const redactions = await this.getCaseRedactions(caseId);

    const byReason: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let automaticCount = 0;
    let manualCount = 0;

    for (const redaction of redactions) {
      const reason = redaction.redactionReason || "Unknown";
      byReason[reason] = (byReason[reason] || 0) + 1;

      const status = redaction.status || "pending";
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (redaction.isAutomatic === "true") {
        automaticCount++;
      } else {
        manualCount++;
      }
    }

    return {
      totalRedactions: redactions.length,
      byReason,
      byStatus,
      automaticCount,
      manualCount,
    };
  }
}
