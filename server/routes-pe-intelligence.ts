// PE Deal Intelligence Routes - to be added to main routes.ts

import { Router } from 'express';
import { db } from './db';
import * as schema from '@shared/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { generatePEDueDiligenceReport, generatePEDueDiligencePDF } from './services/pe-deal-intelligence-service';

const sourceTypeSchema = z.enum(["pe_deal", "transaction", "data_room"]);

const generateReportRequestSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  sourceType: sourceTypeSchema.optional().default("pe_deal"),
  target_company: z.string().min(1, "Target company name is required"),
  enableWebResearch: z.boolean().optional().default(true),
});

export function registerPEDealIntelligenceRoutes(app: any, isAuthenticated: any, requireRole: any, logAction: any) {
  // Get all PE deals for the deal intelligence dropdown
  app.get("/api/pe-deals", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res: any) => {
    try {
      const deals = await db.select({
        id: schema.peDeals.id,
        name: schema.peDeals.name,
        codeName: schema.peDeals.codeName,
        status: schema.peDeals.status,
        dealType: schema.peDeals.dealType,
        sector: schema.peDeals.sector,
        enterpriseValue: schema.peDeals.enterpriseValue,
      }).from(schema.peDeals).orderBy(desc(schema.peDeals.createdAt));
      res.json(deals);
    } catch (error: any) {
      console.error("Error fetching PE deals:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get saved PE deal intelligence reports for a specific deal and source type
  app.get("/api/pe-deal-intelligence/reports/:sourceType/:dealId", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res: any) => {
    try {
      const { dealId, sourceType } = req.params;
      
      const reports = await db.select({
        id: schema.peDealIntelligenceReports.id,
        dealName: schema.peDealIntelligenceReports.dealName,
        sourceType: schema.peDealIntelligenceReports.sourceType,
        generatedBy: schema.peDealIntelligenceReports.generatedBy,
        fileName: schema.peDealIntelligenceReports.fileName,
        fileSize: schema.peDealIntelligenceReports.fileSize,
        sectionsCompleted: schema.peDealIntelligenceReports.sectionsCompleted,
        overallScore: schema.peDealIntelligenceReports.overallScore,
        createdAt: schema.peDealIntelligenceReports.createdAt,
      })
      .from(schema.peDealIntelligenceReports)
      .where(and(
        eq(schema.peDealIntelligenceReports.dealId, dealId),
        eq(schema.peDealIntelligenceReports.sourceType, sourceType)
      ))
      .orderBy(desc(schema.peDealIntelligenceReports.createdAt));

      // Get user names for each report
      const reportsWithNames = await Promise.all(
        reports.map(async (report) => {
          const [user] = await db
            .select({ firstName: schema.users.firstName, lastName: schema.users.lastName })
            .from(schema.users)
            .where(eq(schema.users.id, report.generatedBy));
          const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "Unknown";
          return {
            ...report,
            generatedByName: userName || "Unknown",
          };
        })
      );

      res.json(reportsWithNames);
    } catch (error: any) {
      console.error("Error fetching PE deal intelligence reports:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate PE deal intelligence report
  app.post("/api/pe-deal-intelligence/generate", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Validate request body with Zod
      const parseResult = generateReportRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.errors 
        });
      }
      
      const { dealId, sourceType, target_company, enableWebResearch } = parseResult.data;

      let deal: any = null;
      let documents: any[] = [];
      let workstreams: any[] = [];
      let questions: any[] = [];
      let riskFlags: any[] = [];

      // Fetch data based on source type
      if (sourceType === "pe_deal") {
        // PE Deal Pipeline
        const [peDeal] = await db.select().from(schema.peDeals).where(eq(schema.peDeals.id, dealId));
        if (!peDeal) {
          return res.status(404).json({ message: "PE Deal not found" });
        }
        deal = peDeal;
        // Normalize peDealDocuments to match data room document structure
        const peDealDocs = await db.select().from(schema.peDealDocuments).where(eq(schema.peDealDocuments.dealId, dealId));
        documents = peDealDocs.map(doc => ({
          id: doc.id,
          dealId: dealId,
          name: doc.filename,
          category: doc.category,
          extractedText: doc.extractedText,
          aiSummary: doc.summary,
          comprehensiveSummary: null,
          chunksProcessed: null,
          totalCharacters: doc.extractedText?.length || null,
          documentType: doc.mimeType,
          fileSize: doc.sizeBytes,
        }));
        console.log(`[PE Intelligence] Found ${documents.length} PE deal documents`);
        workstreams = await db.select().from(schema.workstreams).where(eq(schema.workstreams.dealId, dealId));
        questions = await db.select().from(schema.diligenceQuestions).where(eq(schema.diligenceQuestions.dealId, dealId));
        riskFlags = await db.select().from(schema.peRiskFlags).where(eq(schema.peRiskFlags.dealId, dealId));
      } else if (sourceType === "transaction") {
        // Business Transaction
        const [transaction] = await db.select().from(schema.deals).where(eq(schema.deals.id, dealId));
        if (!transaction) {
          return res.status(404).json({ message: "Transaction not found" });
        }
        deal = {
          id: transaction.id,
          name: transaction.title,
          codeName: null,
          status: transaction.status,
          dealType: transaction.dealType,
          sector: "N/A",
          enterpriseValue: transaction.dealValue,
        };
        // Get ALL data rooms linked to this transaction and load all documents in a single query
        const linkedDataRooms = await db.select().from(schema.dataRooms).where(eq(schema.dataRooms.dealId, dealId));
        if (linkedDataRooms.length > 0) {
          // Build a map of room IDs to room names for context
          const roomMap = new Map(linkedDataRooms.map(r => [r.id, r.name]));
          const roomIds = linkedDataRooms.map(r => r.id);
          
          // Single query to fetch all documents from all linked data rooms
          const allDocs = await db.select().from(schema.dataRoomDocuments)
            .where(inArray(schema.dataRoomDocuments.dataRoomId, roomIds));
          
          // Deduplicate by document ID (in case same doc in multiple rooms)
          const seenIds = new Set<string>();
          documents = allDocs
            .filter(doc => {
              if (seenIds.has(doc.id)) return false;
              seenIds.add(doc.id);
              return true;
            })
            .map(doc => ({
              id: doc.id,
              dealId: dealId,
              name: doc.fileName,
              category: doc.documentCategory,
              extractedText: doc.extractedText,
              aiSummary: doc.aiSummary,
              comprehensiveSummary: doc.comprehensiveSummary,
              chunksProcessed: doc.chunksProcessed,
              totalCharacters: doc.totalCharacters,
              documentType: doc.fileType,
              fileSize: doc.fileSize,
              dataRoom: roomMap.get(doc.dataRoomId) || 'Unknown',
            }));
          console.log(`[PE Intelligence] Found ${documents.length} documents across ${linkedDataRooms.length} linked data room(s)`);
        } else {
          documents = [];
        }
        workstreams = [];
        questions = [];
        riskFlags = [];
      } else if (sourceType === "data_room") {
        // Data Room
        const [dataRoom] = await db.select().from(schema.dataRooms).where(eq(schema.dataRooms.id, dealId));
        if (!dataRoom) {
          return res.status(404).json({ message: "Data Room not found" });
        }
        deal = {
          id: dataRoom.id,
          name: dataRoom.name,
          codeName: null,
          status: dataRoom.isActive ? "active" : "inactive",
          dealType: "data_room",
          sector: "N/A",
          enterpriseValue: null,
        };
        // Get data room documents with full content including comprehensive summaries
        const dataRoomDocs = await db.select().from(schema.dataRoomDocuments).where(eq(schema.dataRoomDocuments.dataRoomId, dealId));
        documents = dataRoomDocs.map(doc => ({
          id: doc.id,
          dealId: dealId,
          name: doc.fileName,
          category: doc.documentCategory,
          extractedText: doc.extractedText,
          aiSummary: doc.aiSummary,
          comprehensiveSummary: doc.comprehensiveSummary,
          chunksProcessed: doc.chunksProcessed,
          totalCharacters: doc.totalCharacters,
          documentType: doc.fileType,
          fileSize: doc.fileSize,
        }));
        console.log(`[PE Intelligence] Found ${documents.length} documents in data room`);
        workstreams = [];
        questions = [];
        riskFlags = [];
      } else {
        return res.status(400).json({ message: "Invalid source type" });
      }

      console.log(`[PE Deal Intelligence] Starting report generation for ${sourceType}: ${deal.name}`);
      console.log(`[PE Deal Intelligence] Web research enabled: ${enableWebResearch}`);

      // Generate comprehensive due diligence report using AI
      const reportData = await generatePEDueDiligenceReport(
        deal,
        documents,
        workstreams,
        questions,
        riskFlags,
        target_company,
        enableWebResearch
      );

      // Generate PDF
      const pdfDoc = generatePEDueDiligencePDF(reportData, target_company, deal);
      
      // Collect PDF data into buffer
      const pdfChunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => pdfChunks.push(chunk));
      
      await new Promise<void>((resolve, reject) => {
        pdfDoc.on('end', resolve);
        pdfDoc.on('error', reject);
      });

      const pdfBuffer = Buffer.concat(pdfChunks);
      const pdfBase64 = pdfBuffer.toString('base64');
      const fileName = `pe-due-diligence-${target_company.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;

      // Save report to database
      const [savedReport] = await db.insert(schema.peDealIntelligenceReports).values({
        dealId,
        sourceType,
        dealName: target_company,
        generatedBy: userId,
        fileName,
        fileSize: pdfBuffer.length,
        pdfData: pdfBase64,
        reportJson: reportData,
        sectionsCompleted: reportData.sections?.length || 20,
        overallScore: reportData.overallScore || 75,
        enabledWebResearch: enableWebResearch || false,
      }).returning();

      console.log(`[PE Deal Intelligence] Report saved with ID: ${savedReport.id}`);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('X-Report-Id', savedReport.id);

      res.send(pdfBuffer);

      await logAction(req, "pe_deal_intelligence_report_generated", "pe_report", savedReport.id, { dealId, target_company });
    } catch (error: any) {
      console.error("Error generating PE deal intelligence report:", error);
      res.status(500).json({ message: error.message || "Failed to generate report" });
    }
  });

  // Download saved PE deal intelligence report
  app.get("/api/pe-deal-intelligence/reports/:sourceType/:dealId/:reportId/download", isAuthenticated, requireRole("admin", "attorney", "external_counsel"), async (req: any, res: any) => {
    try {
      const { sourceType, dealId, reportId } = req.params;

      const [report] = await db.select()
        .from(schema.peDealIntelligenceReports)
        .where(and(
          eq(schema.peDealIntelligenceReports.id, reportId),
          eq(schema.peDealIntelligenceReports.dealId, dealId),
          eq(schema.peDealIntelligenceReports.sourceType, sourceType)
        ));

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      if (!report.pdfData) {
        return res.status(404).json({ message: "PDF data not available" });
      }

      const pdfBuffer = Buffer.from(report.pdfData, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error downloading PE deal intelligence report:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete PE deal intelligence report
  app.delete("/api/pe-deal-intelligence/reports/:sourceType/:dealId/:reportId", isAuthenticated, requireRole("admin", "attorney"), async (req: any, res: any) => {
    try {
      const { sourceType, dealId, reportId } = req.params;

      const deleted = await db.delete(schema.peDealIntelligenceReports)
        .where(and(
          eq(schema.peDealIntelligenceReports.id, reportId),
          eq(schema.peDealIntelligenceReports.dealId, dealId),
          eq(schema.peDealIntelligenceReports.sourceType, sourceType)
        ))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ message: "Report not found" });
      }

      await logAction(req, "pe_deal_intelligence_report_deleted", "pe_report", reportId, { fileName: deleted[0].fileName });

      res.json({ message: "Report deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting PE deal intelligence report:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
