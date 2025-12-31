import { db } from "../db";
import { eq, and, inArray, sql, desc, asc } from "drizzle-orm";
import * as schema from "@shared/schema";

interface BatesConfig {
  prefix: string;
  startNumber: number;
  padding: number;
  level: "page" | "document";
}

interface ProductionDocument {
  id: string;
  batesNumber: string;
  batesRange?: string;
  subject?: string;
  sender?: string;
  recipients?: string[];
  sentAt?: Date;
  pageCount: number;
}

interface ProductionStats {
  totalDocuments: number;
  totalPages: number;
  batesStart: string;
  batesEnd: string;
  byStatus: Record<string, number>;
}

interface LoadFileRow {
  batesNumber: string;
  batesRange: string;
  docId: string;
  docType: string;
  custodian: string;
  author: string;
  recipients: string;
  cc: string;
  bcc: string;
  subject: string;
  dateSent: string;
  timeSent: string;
  hasAttachments: string;
  attachmentNames: string;
  confidentiality: string;
  nativeFile: string;
  textFile: string;
  parentBates: string;
  familyId: string;
}

export class ProductionService {
  /**
   * Generate Bates number from configuration
   */
  static formatBatesNumber(config: BatesConfig, number: number): string {
    const paddedNumber = String(number).padStart(config.padding, "0");
    return `${config.prefix}-${paddedNumber}`;
  }

  /**
   * Generate Bates range for multi-page documents
   */
  static formatBatesRange(config: BatesConfig, startNumber: number, endNumber: number): string {
    const start = this.formatBatesNumber(config, startNumber);
    const end = this.formatBatesNumber(config, endNumber);
    return `${start} - ${end}`;
  }

  /**
   * Create a new production set
   */
  static async createProductionSet(data: schema.InsertProductionSet): Promise<schema.ProductionSet> {
    const productionNumber = await this.generateProductionNumber(data.caseId);
    
    const [productionSet] = await db
      .insert(schema.productionSets)
      .values({
        ...data,
        productionNumber,
      })
      .returning();
    
    return productionSet;
  }

  /**
   * Generate unique production number (PROD-001, PROD-002, etc.)
   */
  static async generateProductionNumber(caseId: string): Promise<string> {
    const existingSets = await db
      .select({ productionNumber: schema.productionSets.productionNumber })
      .from(schema.productionSets)
      .where(eq(schema.productionSets.caseId, caseId))
      .orderBy(desc(schema.productionSets.createdAt));

    const count = existingSets.length + 1;
    return `PROD-${String(count).padStart(3, "0")}`;
  }

  /**
   * Get production set by ID
   */
  static async getProductionSetById(id: string): Promise<schema.ProductionSet | null> {
    const [productionSet] = await db
      .select()
      .from(schema.productionSets)
      .where(eq(schema.productionSets.id, id));
    
    return productionSet || null;
  }

  /**
   * Get all production sets for a case
   */
  static async getProductionSetsByCase(caseId: string): Promise<schema.ProductionSet[]> {
    return db
      .select()
      .from(schema.productionSets)
      .where(eq(schema.productionSets.caseId, caseId))
      .orderBy(desc(schema.productionSets.createdAt));
  }

  /**
   * Update production set
   */
  static async updateProductionSet(
    id: string,
    data: Partial<schema.InsertProductionSet>
  ): Promise<schema.ProductionSet> {
    const [updated] = await db
      .update(schema.productionSets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.productionSets.id, id))
      .returning();
    
    return updated;
  }

  /**
   * Add documents to production set
   */
  static async addDocumentsToProduction(
    productionSetId: string,
    documentIds: string[]
  ): Promise<{ added: number; skipped: number }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const existingDocIds = (productionSet.documentIds as string[]) || [];
    const newDocIds = documentIds.filter(id => !existingDocIds.includes(id));
    const allDocIds = [...existingDocIds, ...newDocIds];

    await db
      .update(schema.productionSets)
      .set({
        documentIds: allDocIds,
        documentCount: allDocIds.length,
        updatedAt: new Date(),
      })
      .where(eq(schema.productionSets.id, productionSetId));

    return {
      added: newDocIds.length,
      skipped: documentIds.length - newDocIds.length,
    };
  }

  /**
   * Remove documents from production set
   */
  static async removeDocumentsFromProduction(
    productionSetId: string,
    documentIds: string[]
  ): Promise<{ removed: number }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const existingDocIds = (productionSet.documentIds as string[]) || [];
    const remainingDocIds = existingDocIds.filter(id => !documentIds.includes(id));
    const removedCount = existingDocIds.length - remainingDocIds.length;

    await db
      .update(schema.productionSets)
      .set({
        documentIds: remainingDocIds,
        documentCount: remainingDocIds.length,
        updatedAt: new Date(),
      })
      .where(eq(schema.productionSets.id, productionSetId));

    return { removed: removedCount };
  }

  /**
   * Apply Bates numbers to documents in production set
   */
  static async applyBatesNumbers(productionSetId: string): Promise<ProductionDocument[]> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    if (documentIds.length === 0) {
      return [];
    }

    const config: BatesConfig = {
      prefix: productionSet.batesPrefix,
      startNumber: productionSet.batesStartNumber,
      padding: productionSet.batesPadding,
      level: productionSet.batesLevel as "page" | "document",
    };

    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.sentAt));

    let currentBatesNumber = config.startNumber;
    const stampedDocuments: ProductionDocument[] = [];

    for (const doc of documents) {
      const pageCount = 1; // Default to 1 page per document for now
      const batesNumber = this.formatBatesNumber(config, currentBatesNumber);
      
      let batesRange: string | undefined;
      if (config.level === "page" && pageCount > 1) {
        const endNumber = currentBatesNumber + pageCount - 1;
        batesRange = this.formatBatesRange(config, currentBatesNumber, endNumber);
        currentBatesNumber = endNumber + 1;
      } else {
        currentBatesNumber++;
      }

      await db
        .update(schema.communications)
        .set({
          batesNumber,
          batesRange: batesRange || null,
          productionSetId,
          productionStatus: "pending",
        })
        .where(eq(schema.communications.id, doc.id));

      stampedDocuments.push({
        id: doc.id,
        batesNumber,
        batesRange,
        subject: doc.subject || undefined,
        sender: doc.sender || undefined,
        recipients: doc.recipients as string[] | undefined,
        sentAt: doc.sentAt || undefined,
        pageCount,
      });
    }

    await db
      .update(schema.productionSets)
      .set({
        batesEndNumber: currentBatesNumber - 1,
        pageCount: stampedDocuments.reduce((sum, d) => sum + d.pageCount, 0),
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(schema.productionSets.id, productionSetId));

    return stampedDocuments;
  }

  /**
   * Mark documents as produced
   */
  static async markDocumentsProduced(
    productionSetId: string,
    documentIds?: string[]
  ): Promise<number> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const targetDocIds = documentIds || (productionSet.documentIds as string[]) || [];
    
    const result = await db
      .update(schema.communications)
      .set({ productionStatus: "produced" })
      .where(
        and(
          inArray(schema.communications.id, targetDocIds),
          eq(schema.communications.productionSetId, productionSetId)
        )
      );

    return targetDocIds.length;
  }

  /**
   * Get production statistics
   */
  static async getProductionStats(productionSetId: string): Promise<ProductionStats> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select({
        id: schema.communications.id,
        batesNumber: schema.communications.batesNumber,
        productionStatus: schema.communications.productionStatus,
      })
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds));

    const byStatus: Record<string, number> = {};
    for (const doc of documents) {
      const status = doc.productionStatus || "not_produced";
      byStatus[status] = (byStatus[status] || 0) + 1;
    }

    const batesNumbers = documents
      .map(d => d.batesNumber)
      .filter(Boolean)
      .sort() as string[];

    return {
      totalDocuments: documents.length,
      totalPages: productionSet.pageCount,
      batesStart: batesNumbers[0] || "",
      batesEnd: batesNumbers[batesNumbers.length - 1] || "",
      byStatus,
    };
  }

  /**
   * Generate Concordance DAT load file
   */
  static async generateLoadFile(
    productionSetId: string
  ): Promise<{ content: string; filename: string; format: string }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const delimiter = "\x14"; // Concordance field delimiter
    const quote = "\xFE"; // Concordance text qualifier
    const newline = "\n";

    const headers = [
      "BEGBATES",
      "ENDBATES",
      "DOCID",
      "DOCTYPE",
      "CUSTODIAN",
      "AUTHOR",
      "TO",
      "CC",
      "BCC",
      "SUBJECT",
      "DATESENT",
      "TIMESENT",
      "HASATTACHMENTS",
      "ATTACHMENTNAMES",
      "CONFIDENTIALITY",
      "NATIVEFILE",
      "TEXTFILE",
      "PARENTBATES",
      "FAMILYID",
    ];

    let content = headers.join(delimiter) + newline;

    for (const doc of documents) {
      const recipients = (doc.recipients as string[]) || [];
      const cc = (doc.cc as string[]) || [];
      const bcc = (doc.bcc as string[]) || [];
      const attachments = (doc.attachments as any[]) || [];
      
      const sentDate = doc.sentAt ? new Date(doc.sentAt) : null;
      const dateSent = sentDate ? sentDate.toISOString().split("T")[0] : "";
      const timeSent = sentDate ? sentDate.toISOString().split("T")[1].split(".")[0] : "";

      const row: LoadFileRow = {
        batesNumber: doc.batesNumber || "",
        batesRange: doc.batesRange || doc.batesNumber || "",
        docId: doc.id,
        docType: doc.documentType || "email",
        custodian: doc.custodian || "",
        author: doc.sender || "",
        recipients: recipients.join("; "),
        cc: cc.join("; "),
        bcc: bcc.join("; "),
        subject: doc.subject || "",
        dateSent,
        timeSent,
        hasAttachments: attachments.length > 0 ? "Y" : "N",
        attachmentNames: attachments.map((a: any) => a.name || "").join("; "),
        confidentiality: productionSet.confidentialityStamp || "",
        nativeFile: doc.originalFilePath || "",
        textFile: `TEXT/${doc.batesNumber || doc.id}.txt`,
        parentBates: doc.parentCommunicationId || "",
        familyId: doc.familyGroupId || doc.id,
      };

      const rowValues = [
        row.batesNumber,
        row.batesRange,
        row.docId,
        row.docType,
        row.custodian,
        row.author,
        row.recipients,
        row.cc,
        row.bcc,
        row.subject,
        row.dateSent,
        row.timeSent,
        row.hasAttachments,
        row.attachmentNames,
        row.confidentiality,
        row.nativeFile,
        row.textFile,
        row.parentBates,
        row.familyId,
      ];

      content += rowValues.map(v => `${quote}${v}${quote}`).join(delimiter) + newline;
    }

    const filename = `${productionSet.productionNumber}_loadfile.dat`;

    return {
      content,
      filename,
      format: "concordance",
    };
  }

  /**
   * Validate production before finalization
   */
  static async validateProduction(productionSetId: string): Promise<{
    isValid: boolean;
    errors: Array<{ type: string; documentId?: string; message: string }>;
  }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const errors: Array<{ type: string; documentId?: string; message: string }> = [];
    const documentIds = (productionSet.documentIds as string[]) || [];

    if (documentIds.length === 0) {
      errors.push({
        type: "empty_production",
        message: "Production set contains no documents",
      });
    }

    const documents = await db
      .select({
        id: schema.communications.id,
        batesNumber: schema.communications.batesNumber,
        productionStatus: schema.communications.productionStatus,
      })
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds));

    for (const doc of documents) {
      if (!doc.batesNumber) {
        errors.push({
          type: "missing_bates",
          documentId: doc.id,
          message: `Document ${doc.id} has no Bates number assigned`,
        });
      }
    }

    const batesNumbers = documents.map(d => d.batesNumber).filter(Boolean);
    const uniqueBates = new Set(batesNumbers);
    if (batesNumbers.length !== uniqueBates.size) {
      errors.push({
        type: "duplicate_bates",
        message: "Duplicate Bates numbers detected in production",
      });
    }

    const isValid = errors.length === 0;

    await db
      .update(schema.productionSets)
      .set({
        validationStatus: isValid ? "passed" : "failed",
        validationErrors: errors.length > 0 ? errors : null,
        updatedAt: new Date(),
      })
      .where(eq(schema.productionSets.id, productionSetId));

    return { isValid, errors };
  }

  /**
   * Finalize and complete production
   */
  static async finalizeProduction(
    productionSetId: string,
    transmissionDetails?: {
      transmittedTo: string;
      transmissionMethod: string;
      deliveryReceipt?: string;
    }
  ): Promise<schema.ProductionSet> {
    const validation = await this.validateProduction(productionSetId);
    if (!validation.isValid) {
      throw new Error("Production validation failed. Please resolve errors before finalizing.");
    }

    await this.markDocumentsProduced(productionSetId);

    const updateData: Partial<schema.InsertProductionSet> = {
      status: "completed",
    };

    if (transmissionDetails) {
      Object.assign(updateData, {
        transmittedTo: transmissionDetails.transmittedTo,
        transmissionMethod: transmissionDetails.transmissionMethod,
        transmittedAt: new Date(),
        deliveryReceipt: transmissionDetails.deliveryReceipt,
      });
    }

    return this.updateProductionSet(productionSetId, updateData);
  }

  /**
   * Delete production set (only if draft)
   */
  static async deleteProductionSet(id: string): Promise<boolean> {
    const productionSet = await this.getProductionSetById(id);
    if (!productionSet) {
      return false;
    }

    if (productionSet.status !== "draft") {
      throw new Error("Can only delete draft production sets");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    if (documentIds.length > 0) {
      await db
        .update(schema.communications)
        .set({
          batesNumber: null,
          batesRange: null,
          productionSetId: null,
          productionStatus: "not_produced",
        })
        .where(inArray(schema.communications.id, documentIds));
    }

    await db
      .delete(schema.productionSets)
      .where(eq(schema.productionSets.id, id));

    return true;
  }

  /**
   * Generate Ringtail load file format
   * Tab-delimited with specific field ordering for Ringtail review platform
   */
  static async generateRingtailLoadFile(
    productionSetId: string
  ): Promise<{ content: string; filename: string; format: string }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const delimiter = "\t";
    const newline = "\r\n";

    const headers = [
      "DocID",
      "BegDoc",
      "EndDoc",
      "BegAttach",
      "EndAttach",
      "ParentDocID",
      "AttachRange",
      "Custodian",
      "From",
      "To",
      "CC",
      "BCC",
      "Subject",
      "DateSent",
      "TimeSent",
      "DateReceived",
      "TimeReceived",
      "FileType",
      "FileName",
      "FileSize",
      "FilePath",
      "MD5Hash",
      "NativeLink",
      "TextLink",
      "ImageLink",
      "PageCount",
      "Confidentiality",
      "ReviewStatus",
    ];

    let content = headers.join(delimiter) + newline;

    for (const doc of documents) {
      const recipients = (doc.recipients as string[]) || [];
      const cc = (doc.cc as string[]) || [];
      const bcc = (doc.bcc as string[]) || [];
      
      const sentDate = doc.timestamp ? new Date(doc.timestamp) : null;
      const dateSent = sentDate ? sentDate.toLocaleDateString("en-US") : "";
      const timeSent = sentDate ? sentDate.toLocaleTimeString("en-US", { hour12: false }) : "";

      const rowValues = [
        doc.id,
        doc.batesNumber || "",
        doc.batesRange?.split(" - ")[1] || doc.batesNumber || "",
        doc.parentCommunicationId ? "" : doc.batesNumber || "",
        doc.parentCommunicationId ? "" : doc.batesRange?.split(" - ")[1] || doc.batesNumber || "",
        doc.parentCommunicationId || "",
        doc.parentCommunicationId ? doc.batesNumber || "" : "",
        doc.custodian || "",
        doc.sender || "",
        recipients.join("; "),
        cc.join("; "),
        bcc.join("; "),
        (doc.subject || "").replace(/\t/g, " ").replace(/\r?\n/g, " "),
        dateSent,
        timeSent,
        "",
        "",
        doc.communicationType || "email",
        doc.originalFilename || "",
        "",
        doc.originalFilePath || "",
        doc.contentHash || "",
        `NATIVE\\${doc.batesNumber || doc.id}.msg`,
        `TEXT\\${doc.batesNumber || doc.id}.txt`,
        `IMAGES\\${doc.batesNumber || doc.id}.tif`,
        "1",
        productionSet.confidentialityStamp || "",
        doc.reviewStatus || "",
      ];

      content += rowValues.join(delimiter) + newline;
    }

    const filename = `${productionSet.productionNumber}_ringtail.txt`;

    return {
      content,
      filename,
      format: "ringtail",
    };
  }

  /**
   * Generate Relativity RDC format (DAT file + OPT file)
   * Returns both files for Relativity import
   */
  static async generateRelativityRDC(
    productionSetId: string
  ): Promise<{ 
    datContent: string; 
    optContent: string; 
    datFilename: string;
    optFilename: string;
    format: string;
  }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const delimiter = "\x14";
    const quote = "\xFE";
    const newline = "\r\n";

    const datHeaders = [
      "Control Number",
      "Group Identifier",
      "Document Date",
      "Document Time",
      "Date Received",
      "Time Received",
      "From",
      "To",
      "CC",
      "BCC",
      "Subject",
      "File Type",
      "File Name",
      "File Path",
      "Custodian",
      "Confidentiality Designation",
      "Has Attachments",
      "Attachment Count",
      "Parent Document ID",
      "Attachment Names",
      "MD5 Hash",
      "SHA1 Hash",
      "Extracted Text",
      "Native File Link",
      "Production Begin Bates",
      "Production End Bates",
    ];

    let datContent = datHeaders.map(h => `${quote}${h}${quote}`).join(delimiter) + newline;
    let optContent = "";

    for (const doc of documents) {
      const recipients = (doc.recipients as string[]) || [];
      const cc = (doc.cc as string[]) || [];
      const bcc = (doc.bcc as string[]) || [];
      const attachments = (doc.attachments as any[]) || [];
      
      const sentDate = doc.timestamp ? new Date(doc.timestamp) : null;
      const docDate = sentDate ? sentDate.toLocaleDateString("en-US") : "";
      const docTime = sentDate ? sentDate.toLocaleTimeString("en-US", { hour12: false }) : "";

      const datRow = [
        doc.id,
        doc.familyGroupId || doc.id,
        docDate,
        docTime,
        "",
        "",
        doc.sender || "",
        recipients.join("; "),
        cc.join("; "),
        bcc.join("; "),
        (doc.subject || "").replace(/[\x14\xFE\r\n]/g, " "),
        doc.communicationType || "email",
        doc.originalFilename || "",
        doc.originalFilePath || "",
        doc.custodian || "",
        productionSet.confidentialityStamp || "",
        attachments.length > 0 ? "Yes" : "No",
        String(attachments.length),
        doc.parentCommunicationId || "",
        attachments.map((a: any) => a.name || "").join("; "),
        doc.contentHash || "",
        "",
        "",
        `NATIVE\\${doc.batesNumber || doc.id}`,
        doc.batesNumber || "",
        doc.batesRange?.split(" - ")[1] || doc.batesNumber || "",
      ];

      datContent += datRow.map(v => `${quote}${v}${quote}`).join(delimiter) + newline;

      const batesStart = doc.batesNumber || "";
      const batesEnd = doc.batesRange?.split(" - ")[1] || doc.batesNumber || "";
      const isFirstInDoc = !doc.parentCommunicationId;
      
      optContent += `${batesStart},IMAGES\\${batesStart}.tif,${isFirstInDoc ? "Y" : ""},,,1${newline}`;
    }

    const datFilename = `${productionSet.productionNumber}_relativity.dat`;
    const optFilename = `${productionSet.productionNumber}_relativity.opt`;

    return {
      datContent,
      optContent,
      datFilename,
      optFilename,
      format: "relativity",
    };
  }

  /**
   * Generate EDRM 2.0 XML export
   * Full schema compliance with document metadata, relationships, and file references
   */
  static async generateEDRMXml(
    productionSetId: string
  ): Promise<{ content: string; filename: string; format: string }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const escapeXml = (str: string | null | undefined): string => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const formatDate = (date: Date | string | null | undefined): string => {
      if (!date) return "";
      const d = typeof date === "string" ? new Date(date) : date;
      return d.toISOString();
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Root xmlns="http://www.edrm.net/schemas/2.0" 
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Batch>
    <BatchId>${escapeXml(productionSet.id)}</BatchId>
    <BatchName>${escapeXml(productionSet.productionName)}</BatchName>
    <BatchDescription>${escapeXml(productionSet.notes || "")}</BatchDescription>
    <ProcessingDate>${formatDate(new Date())}</ProcessingDate>
    <DocumentCount>${documents.length}</DocumentCount>
  </Batch>
  <Documents>
`;

    for (const doc of documents) {
      const recipients = (doc.recipients as string[]) || [];
      const cc = (doc.cc as string[]) || [];
      const bcc = (doc.bcc as string[]) || [];
      const attachments = (doc.attachments as any[]) || [];

      xml += `    <Document>
      <DocID>${escapeXml(doc.id)}</DocID>
      <ControlNumber>${escapeXml(doc.batesNumber || doc.id)}</ControlNumber>
      <BatesBegin>${escapeXml(doc.batesNumber || "")}</BatesBegin>
      <BatesEnd>${escapeXml(doc.batesRange?.split(" - ")[1] || doc.batesNumber || "")}</BatesEnd>
      <Custodian>${escapeXml(doc.custodian || "")}</Custodian>
      <DocumentType>${escapeXml(doc.communicationType || "email")}</DocumentType>
      <DateCreated>${formatDate(doc.timestamp)}</DateCreated>
      <DateModified></DateModified>
      <DateSent>${formatDate(doc.timestamp)}</DateSent>
      <DateReceived></DateReceived>
      <From>${escapeXml(doc.sender || "")}</From>
      <To>${escapeXml(recipients.join("; "))}</To>
      <CC>${escapeXml(cc.join("; "))}</CC>
      <BCC>${escapeXml(bcc.join("; "))}</BCC>
      <Subject>${escapeXml(doc.subject || "")}</Subject>
      <FileName>${escapeXml(doc.originalFilename || "")}</FileName>
      <FilePath>${escapeXml(doc.originalFilePath || "")}</FilePath>
      <FileSize></FileSize>
      <MD5Hash>${escapeXml(doc.contentHash || "")}</MD5Hash>
      <SHA1Hash></SHA1Hash>
      <HasAttachments>${attachments.length > 0 ? "true" : "false"}</HasAttachments>
      <AttachmentCount>${attachments.length}</AttachmentCount>
      <ParentDocID>${escapeXml(doc.parentCommunicationId || "")}</ParentDocID>
      <FamilyID>${escapeXml(doc.familyGroupId || doc.id)}</FamilyID>
      <Confidentiality>${escapeXml(productionSet.confidentialityStamp || "")}</Confidentiality>
      <ReviewStatus>${escapeXml(doc.reviewStatus || "")}</ReviewStatus>
      <Files>
        <Native>NATIVE/${escapeXml(doc.batesNumber || doc.id)}.msg</Native>
        <Text>TEXT/${escapeXml(doc.batesNumber || doc.id)}.txt</Text>
        <Image>IMAGES/${escapeXml(doc.batesNumber || doc.id)}.tif</Image>
      </Files>
`;

      if (attachments.length > 0) {
        xml += `      <Attachments>
`;
        for (const att of attachments) {
          xml += `        <Attachment>
          <Name>${escapeXml(att.name || "")}</Name>
          <Size>${att.size || ""}</Size>
          <Path>${escapeXml(att.path || "")}</Path>
        </Attachment>
`;
        }
        xml += `      </Attachments>
`;
      }

      xml += `    </Document>
`;
    }

    xml += `  </Documents>
</Root>`;

    const filename = `${productionSet.productionNumber}_edrm.xml`;

    return {
      content: xml,
      filename,
      format: "edrm",
    };
  }

  /**
   * Generate Native File Production manifest
   * Returns manifest JSON with folder structure for ZIP creation
   */
  static async generateNativePackageManifest(
    productionSetId: string
  ): Promise<{ 
    manifest: Array<{
      sourceId: string;
      batesNumber: string;
      targetPath: string;
      type: "native" | "text" | "metadata";
      metadata: Record<string, any>;
    }>;
    metadataCsv: string;
    filename: string;
    format: string;
  }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const documents = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const manifest: Array<{
      sourceId: string;
      batesNumber: string;
      targetPath: string;
      type: "native" | "text" | "metadata";
      metadata: Record<string, any>;
    }> = [];

    const csvHeaders = [
      "Bates Number",
      "Document ID",
      "Custodian",
      "From",
      "To",
      "CC",
      "Subject",
      "Date",
      "File Type",
      "Native Path",
      "Text Path",
    ];

    let metadataCsv = csvHeaders.join(",") + "\n";

    for (const doc of documents) {
      const bates = doc.batesNumber || doc.id;
      const recipients = (doc.recipients as string[]) || [];
      const cc = (doc.cc as string[]) || [];
      const sentDate = doc.timestamp ? new Date(doc.timestamp).toISOString() : "";
      
      const metadata = {
        batesNumber: bates,
        documentId: doc.id,
        custodian: doc.custodian || "",
        from: doc.sender || "",
        to: recipients.join("; "),
        cc: cc.join("; "),
        subject: doc.subject || "",
        date: sentDate,
        fileType: doc.communicationType || "email",
      };

      manifest.push({
        sourceId: doc.id,
        batesNumber: bates,
        targetPath: `NATIVE/${bates}.msg`,
        type: "native",
        metadata,
      });

      manifest.push({
        sourceId: doc.id,
        batesNumber: bates,
        targetPath: `TEXT/${bates}.txt`,
        type: "text",
        metadata,
      });

      const escapeCsv = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvRow = [
        escapeCsv(bates),
        escapeCsv(doc.id),
        escapeCsv(doc.custodian || ""),
        escapeCsv(doc.sender || ""),
        escapeCsv(recipients.join("; ")),
        escapeCsv(cc.join("; ")),
        escapeCsv(doc.subject || ""),
        escapeCsv(sentDate),
        escapeCsv(doc.communicationType || "email"),
        escapeCsv(`NATIVE/${bates}.msg`),
        escapeCsv(`TEXT/${bates}.txt`),
      ];

      metadataCsv += csvRow.join(",") + "\n";
    }

    manifest.push({
      sourceId: "metadata",
      batesNumber: "",
      targetPath: "metadata.csv",
      type: "metadata",
      metadata: {},
    });

    const filename = `${productionSet.productionNumber}_native_package`;

    return {
      manifest,
      metadataCsv,
      filename,
      format: "native",
    };
  }

  /**
   * Generate Image-Based Production with Bates-stamped PDF metadata
   * Returns metadata for PDF generation (actual PDF creation requires pdfkit)
   */
  static async generateImageProductionManifest(
    productionSetId: string,
    options: {
      format: "pdf" | "tiff";
      stampPosition?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
      includeConfidentiality?: boolean;
    } = { format: "pdf", stampPosition: "bottom-right", includeConfidentiality: true }
  ): Promise<{
    documents: Array<{
      id: string;
      batesNumber: string;
      batesRange: string | null;
      outputPath: string;
      stamp: {
        bates: string;
        confidentiality: string;
        position: string;
      };
      sourceContent: string | null;
      subject: string | null;
      sender: string | null;
      recipients: string[];
      date: string | null;
    }>;
    optContent: string;
    lfpContent: string;
    filename: string;
    format: string;
  }> {
    const productionSet = await this.getProductionSetById(productionSetId);
    if (!productionSet) {
      throw new Error("Production set not found");
    }

    const documentIds = (productionSet.documentIds as string[]) || [];
    
    const dbDocuments = await db
      .select()
      .from(schema.communications)
      .where(inArray(schema.communications.id, documentIds))
      .orderBy(asc(schema.communications.batesNumber));

    const ext = options.format === "pdf" ? "pdf" : "tif";
    const newline = "\r\n";

    let optContent = "";
    let lfpContent = "";

    const documents = dbDocuments.map((doc, index) => {
      const bates = doc.batesNumber || "";
      const recipients = (doc.recipients as string[]) || [];
      const sentDate = doc.timestamp ? new Date(doc.timestamp).toISOString() : null;
      
      const isFirstInDoc = !doc.parentCommunicationId || index === 0;
      optContent += `${bates},IMAGES\\${bates}.${ext},${isFirstInDoc ? "Y" : ""},,,1${newline}`;
      
      lfpContent += `IM,${bates},D,0,@IMAGES\\${bates}.${ext};1${newline}`;

      return {
        id: doc.id,
        batesNumber: bates,
        batesRange: doc.batesRange,
        outputPath: `IMAGES/${bates}.${ext}`,
        stamp: {
          bates,
          confidentiality: options.includeConfidentiality ? (productionSet.confidentialityStamp || "") : "",
          position: options.stampPosition || "bottom-right",
        },
        sourceContent: doc.body,
        subject: doc.subject,
        sender: doc.sender,
        recipients,
        date: sentDate,
      };
    });

    const filename = `${productionSet.productionNumber}_images`;

    return {
      documents,
      optContent,
      lfpContent,
      filename,
      format: options.format,
    };
  }

  /**
   * Get list of available export formats
   */
  static getAvailableExportFormats(): Array<{
    id: string;
    name: string;
    description: string;
    fileTypes: string[];
  }> {
    return [
      {
        id: "concordance",
        name: "Concordance DAT",
        description: "Standard Concordance load file format with field delimiters",
        fileTypes: [".dat"],
      },
      {
        id: "ringtail",
        name: "Ringtail",
        description: "Tab-delimited format for Ringtail review platform",
        fileTypes: [".txt"],
      },
      {
        id: "relativity",
        name: "Relativity RDC",
        description: "Relativity load file format with DAT and OPT files",
        fileTypes: [".dat", ".opt"],
      },
      {
        id: "edrm",
        name: "EDRM XML",
        description: "EDRM 2.0 XML schema compliant export",
        fileTypes: [".xml"],
      },
      {
        id: "native",
        name: "Native Package",
        description: "Native files with Bates-stamped filenames and metadata CSV",
        fileTypes: [".zip"],
      },
      {
        id: "pdf",
        name: "PDF Images",
        description: "Bates-stamped PDF images with OPT file",
        fileTypes: [".pdf", ".opt"],
      },
      {
        id: "tiff",
        name: "TIFF Images",
        description: "Bates-stamped TIFF images with OPT/LFP files",
        fileTypes: [".tif", ".opt", ".lfp"],
      },
    ];
  }

  // =====================================
  // TAG-BASED PRODUCTION BATCH METHODS
  // =====================================

  /**
   * Create a new production batch with tag-based selection
   */
  static async createProductionBatch(data: {
    caseId: string;
    name: string;
    description?: string;
    selectedTagIds: string[];
    exclusionTagIds: string[];
    exportFormat: "pdf" | "native" | "tiff" | "load_file";
    batesPrefix: string;
    batesPadding?: number;
    requestedBy: string;
  }): Promise<schema.ProductionBatch> {
    const [batch] = await db
      .insert(schema.productionBatches)
      .values({
        caseId: data.caseId,
        name: data.name,
        description: data.description,
        selectedTagIds: data.selectedTagIds,
        exclusionTagIds: data.exclusionTagIds,
        exportFormat: data.exportFormat,
        batesPrefix: data.batesPrefix,
        batesPadding: data.batesPadding || 6,
        requestedBy: data.requestedBy,
        status: "draft",
      })
      .returning();

    // Log creation event
    await this.logBatchEvent(batch.id, "created", `Production batch "${data.name}" created`, data.requestedBy);

    return batch;
  }

  /**
   * Get documents for a production batch based on tag selection and exclusion rules
   */
  static async getDocumentsForBatch(
    caseId: string,
    selectedTagIds: string[],
    exclusionTagIds: string[]
  ): Promise<{
    included: Array<{ documentId: string; documentType: string; tagId: string; tagName: string }>;
    excluded: Array<{ documentId: string; documentType: string; reason: string; exclusionTagId?: string }>;
  }> {
    if (selectedTagIds.length === 0) {
      return { included: [], excluded: [] };
    }

    // Get all documents with the selected tags
    const selectedDocs = await db
      .select({
        documentId: schema.documentTags.documentId,
        documentType: schema.documentTags.documentType,
        tagId: schema.documentTags.tagId,
        tagName: schema.tags.name,
      })
      .from(schema.documentTags)
      .innerJoin(schema.tags, eq(schema.documentTags.tagId, schema.tags.id))
      .where(
        and(
          eq(schema.tags.caseId, caseId),
          inArray(schema.documentTags.tagId, selectedTagIds)
        )
      );

    // Group by document to handle multiple tags per document
    const docMap = new Map<string, { documentId: string; documentType: string; tagId: string; tagName: string }>();
    for (const doc of selectedDocs) {
      const key = `${doc.documentId}-${doc.documentType}`;
      if (!docMap.has(key)) {
        docMap.set(key, doc);
      }
    }

    // If no exclusion tags, all selected documents are included
    if (exclusionTagIds.length === 0) {
      return {
        included: Array.from(docMap.values()),
        excluded: [],
      };
    }

    // Get documents with exclusion tags
    const excludedDocs = await db
      .select({
        documentId: schema.documentTags.documentId,
        documentType: schema.documentTags.documentType,
        tagId: schema.documentTags.tagId,
        tagName: schema.tags.name,
      })
      .from(schema.documentTags)
      .innerJoin(schema.tags, eq(schema.documentTags.tagId, schema.tags.id))
      .where(inArray(schema.documentTags.tagId, exclusionTagIds));

    // Build exclusion set
    const exclusionSet = new Set<string>();
    const exclusionReasons = new Map<string, { reason: string; exclusionTagId: string }>();
    for (const doc of excludedDocs) {
      const key = `${doc.documentId}-${doc.documentType}`;
      exclusionSet.add(key);
      exclusionReasons.set(key, {
        reason: `Excluded by tag: ${doc.tagName}`,
        exclusionTagId: doc.tagId,
      });
    }

    // Split into included and excluded
    const included: Array<{ documentId: string; documentType: string; tagId: string; tagName: string }> = [];
    const excluded: Array<{ documentId: string; documentType: string; reason: string; exclusionTagId?: string }> = [];

    for (const doc of docMap.values()) {
      const key = `${doc.documentId}-${doc.documentType}`;
      if (exclusionSet.has(key)) {
        const exclusionInfo = exclusionReasons.get(key);
        excluded.push({
          documentId: doc.documentId,
          documentType: doc.documentType,
          reason: exclusionInfo?.reason || "Excluded by tag",
          exclusionTagId: exclusionInfo?.exclusionTagId,
        });
      } else {
        included.push(doc);
      }
    }

    return { included, excluded };
  }

  /**
   * Preview production batch before confirmation
   */
  static async previewProductionBatch(batchId: string): Promise<{
    batch: schema.ProductionBatch;
    included: Array<{ documentId: string; documentType: string; tagId: string; tagName: string }>;
    excluded: Array<{ documentId: string; documentType: string; reason: string; exclusionTagId?: string }>;
    batesPreview: { start: string; estimatedEnd: string };
  }> {
    const [batch] = await db
      .select()
      .from(schema.productionBatches)
      .where(eq(schema.productionBatches.id, batchId));

    if (!batch) {
      throw new Error("Production batch not found");
    }

    const selectedTagIds = (batch.selectedTagIds as string[]) || [];
    const exclusionTagIds = (batch.exclusionTagIds as string[]) || [];

    const { included, excluded } = await this.getDocumentsForBatch(
      batch.caseId,
      selectedTagIds,
      exclusionTagIds
    );

    // Get the next available Bates number
    const sequence = await this.getOrCreateBatesSequence(batch.caseId, batch.batesPrefix, batch.batesPadding);
    const startNumber = sequence.nextNumber;
    const estimatedEndNumber = startNumber + included.length - 1;

    const batesPreview = {
      start: this.formatBatesNumber({ prefix: batch.batesPrefix, startNumber, padding: batch.batesPadding, level: "document" }, startNumber),
      estimatedEnd: this.formatBatesNumber({ prefix: batch.batesPrefix, startNumber, padding: batch.batesPadding, level: "document" }, estimatedEndNumber),
    };

    return { batch, included, excluded, batesPreview };
  }

  /**
   * Get or create Bates sequence for a case/prefix
   */
  static async getOrCreateBatesSequence(
    caseId: string,
    prefix: string,
    padding: number = 6
  ): Promise<schema.BatesSequence> {
    const [existing] = await db
      .select()
      .from(schema.batesSequences)
      .where(and(
        eq(schema.batesSequences.caseId, caseId),
        eq(schema.batesSequences.prefix, prefix)
      ));

    if (existing) {
      return existing;
    }

    const [sequence] = await db
      .insert(schema.batesSequences)
      .values({ caseId, prefix, padding, nextNumber: 1 })
      .returning();

    return sequence;
  }

  /**
   * Confirm and process a production batch - assigns Bates numbers and creates documents
   */
  static async confirmProductionBatch(
    batchId: string,
    userId: string
  ): Promise<schema.ProductionBatch> {
    const [batch] = await db
      .select()
      .from(schema.productionBatches)
      .where(eq(schema.productionBatches.id, batchId));

    if (!batch) {
      throw new Error("Production batch not found");
    }

    if (batch.status !== "draft") {
      throw new Error(`Cannot confirm batch with status: ${batch.status}`);
    }

    // Update status to processing
    await db
      .update(schema.productionBatches)
      .set({ status: "processing", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.productionBatches.id, batchId));

    await this.logBatchEvent(batchId, "processing", "Production batch processing started", userId);

    try {
      const selectedTagIds = (batch.selectedTagIds as string[]) || [];
      const exclusionTagIds = (batch.exclusionTagIds as string[]) || [];

      // Get documents to include/exclude
      const { included, excluded } = await this.getDocumentsForBatch(
        batch.caseId,
        selectedTagIds,
        exclusionTagIds
      );

      // Get and increment the Bates sequence
      const sequence = await this.getOrCreateBatesSequence(batch.caseId, batch.batesPrefix, batch.batesPadding);
      const startNumber = sequence.nextNumber;

      // Increment the sequence
      await db
        .update(schema.batesSequences)
        .set({ 
          nextNumber: sql`${schema.batesSequences.nextNumber} + ${included.length}`,
          updatedAt: new Date()
        })
        .where(eq(schema.batesSequences.id, sequence.id));

      // Create production batch documents with Bates numbers
      const batchDocuments: schema.InsertProductionBatchDocument[] = [];
      let currentBatesNumber = startNumber;

      for (const doc of included) {
        const batesNumber = this.formatBatesNumber(
          { prefix: batch.batesPrefix, startNumber, padding: batch.batesPadding, level: "document" },
          currentBatesNumber
        );

        batchDocuments.push({
          batchId: batchId,
          documentId: doc.documentId,
          documentType: doc.documentType,
          inclusionTagId: doc.tagId,
          excluded: false,
          batesStart: batesNumber,
          batesEnd: batesNumber,
          pageCount: 1,
        });

        currentBatesNumber++;
      }

      // Add excluded documents for audit trail
      for (const doc of excluded) {
        batchDocuments.push({
          batchId: batchId,
          documentId: doc.documentId,
          documentType: doc.documentType,
          excluded: true,
          exclusionReason: doc.reason,
          exclusionTagId: doc.exclusionTagId,
        });
      }

      // Insert all documents
      if (batchDocuments.length > 0) {
        await db.insert(schema.productionBatchDocuments).values(batchDocuments);
      }

      const batesEndNumber = startNumber + included.length - 1;
      const batesEnd = included.length > 0 
        ? this.formatBatesNumber({ prefix: batch.batesPrefix, startNumber, padding: batch.batesPadding, level: "document" }, batesEndNumber)
        : null;

      // Update batch with final counts and Bates range
      const [updatedBatch] = await db
        .update(schema.productionBatches)
        .set({
          status: "completed",
          totalDocuments: included.length + excluded.length,
          producedDocuments: included.length,
          excludedDocuments: excluded.length,
          batesStartNumber: startNumber,
          batesEndNumber: batesEndNumber,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.productionBatches.id, batchId))
        .returning();

      await this.logBatchEvent(
        batchId,
        "completed",
        `Production completed: ${included.length} documents produced, ${excluded.length} excluded. Bates range: ${batch.batesPrefix}-${String(startNumber).padStart(batch.batesPadding, "0")} to ${batesEnd}`,
        userId
      );

      return updatedBatch;
    } catch (error) {
      // Update status to failed
      await db
        .update(schema.productionBatches)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(schema.productionBatches.id, batchId));

      await this.logBatchEvent(batchId, "failed", `Production failed: ${error instanceof Error ? error.message : "Unknown error"}`, userId);
      throw error;
    }
  }

  /**
   * Get production batch by ID with documents
   */
  static async getProductionBatchWithDocuments(batchId: string): Promise<{
    batch: schema.ProductionBatch;
    documents: schema.ProductionBatchDocument[];
    events: schema.ProductionBatchEvent[];
  } | null> {
    const [batch] = await db
      .select()
      .from(schema.productionBatches)
      .where(eq(schema.productionBatches.id, batchId));

    if (!batch) {
      return null;
    }

    const documents = await db
      .select()
      .from(schema.productionBatchDocuments)
      .where(eq(schema.productionBatchDocuments.batchId, batchId));

    const events = await db
      .select()
      .from(schema.productionBatchEvents)
      .where(eq(schema.productionBatchEvents.batchId, batchId))
      .orderBy(asc(schema.productionBatchEvents.createdAt));

    return { batch, documents, events };
  }

  /**
   * Get all production batches for a case
   */
  static async getProductionBatchesByCase(caseId: string): Promise<schema.ProductionBatch[]> {
    return db
      .select()
      .from(schema.productionBatches)
      .where(eq(schema.productionBatches.caseId, caseId))
      .orderBy(desc(schema.productionBatches.createdAt));
  }

  /**
   * Cancel a production batch
   */
  static async cancelProductionBatch(batchId: string, userId: string): Promise<schema.ProductionBatch> {
    const [batch] = await db
      .select()
      .from(schema.productionBatches)
      .where(eq(schema.productionBatches.id, batchId));

    if (!batch) {
      throw new Error("Production batch not found");
    }

    if (batch.status !== "draft" && batch.status !== "pending") {
      throw new Error(`Cannot cancel batch with status: ${batch.status}`);
    }

    const [updatedBatch] = await db
      .update(schema.productionBatches)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(schema.productionBatches.id, batchId))
      .returning();

    await this.logBatchEvent(batchId, "cancelled", "Production batch cancelled", userId);

    return updatedBatch;
  }

  /**
   * Log an event for a production batch
   */
  static async logBatchEvent(
    batchId: string,
    eventType: string,
    message: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<schema.ProductionBatchEvent> {
    const [event] = await db
      .insert(schema.productionBatchEvents)
      .values({
        batchId,
        eventType,
        message,
        userId,
        metadata: metadata || {},
      })
      .returning();

    return event;
  }

  /**
   * Generate production log export
   */
  static async generateProductionLog(batchId: string): Promise<{
    csvContent: string;
    filename: string;
  }> {
    const result = await this.getProductionBatchWithDocuments(batchId);
    if (!result) {
      throw new Error("Production batch not found");
    }

    const { batch, documents, events } = result;
    const includedDocs = documents.filter(d => !d.excluded);
    const excludedDocs = documents.filter(d => d.excluded);

    // Build CSV content
    const headers = ["Bates Number", "Document ID", "Document Type", "Status", "Exclusion Reason"];
    const rows = [headers.join(",")];

    for (const doc of includedDocs) {
      rows.push([
        doc.batesStart || "",
        doc.documentId,
        doc.documentType,
        "Included",
        "",
      ].map(v => `"${v}"`).join(","));
    }

    for (const doc of excludedDocs) {
      rows.push([
        "",
        doc.documentId,
        doc.documentType,
        "Excluded",
        doc.exclusionReason || "",
      ].map(v => `"${v}"`).join(","));
    }

    const csvContent = rows.join("\n");
    const filename = `production_log_${batch.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;

    return { csvContent, filename };
  }
}
