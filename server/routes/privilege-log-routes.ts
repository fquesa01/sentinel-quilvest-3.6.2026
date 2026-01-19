import { Express, Request, Response } from "express";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import { privilegeLogEntries, documentSearchTags, courtPleadings } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { PrivilegeDetectionService } from "../services/privilege-detection-service";
import ExcelJS from "exceljs";
import { nanoid } from "nanoid";

export function registerPrivilegeLogRoutes(app: Express) {
  console.log("[PrivilegeLog] Routes registered");

  // GET /api/cases/:caseId/privilege-log - Get all privilege log entries
  app.get("/api/cases/:caseId/privilege-log", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;

      const entries = await db
        .select()
        .from(privilegeLogEntries)
        .where(eq(privilegeLogEntries.caseId, caseId))
        .orderBy(privilegeLogEntries.batesBegin);

      res.json({ success: true, data: entries });
    } catch (error) {
      console.error("[PrivilegeLog] Error fetching entries:", error);
      res.status(500).json({ success: false, error: "Failed to fetch privilege log" });
    }
  });

  // POST /api/cases/:caseId/privilege-log/generate - Generate privilege log from tagged documents
  app.post("/api/cases/:caseId/privilege-log/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;

      // Get all privilege-tagged documents
      const privilegeTags = await db
        .select()
        .from(documentSearchTags)
        .where(
          and(
            eq(documentSearchTags.caseId, caseId),
            eq(documentSearchTags.tagCategory, "privilege")
          )
        );

      if (privilegeTags.length === 0) {
        return res.json({
          success: true,
          message: "No privilege-tagged documents found. Run privilege search first.",
          entriesCreated: 0,
        });
      }

      const privilegeService = new PrivilegeDetectionService();
      let entriesCreated = 0;

      for (const tag of privilegeTags) {
        // Check if entry already exists
        const existingEntries = await db
          .select()
          .from(privilegeLogEntries)
          .where(
            and(
              eq(privilegeLogEntries.caseId, caseId),
              eq(privilegeLogEntries.documentId, tag.documentId)
            )
          );

        if (existingEntries.length > 0) {
          continue;
        }

        // Fetch document content for AI analysis from all searchable sources
        let documentText = "";
        let fileName = "";
        
        // Try to get document from case_evidence using raw SQL
        const evidenceResult = await db.execute(sql`
          SELECT extracted_text, file_name FROM case_evidence WHERE id = ${tag.documentId} LIMIT 1
        `);
        
        if (evidenceResult.rows.length > 0) {
          const evidenceDoc = evidenceResult.rows[0] as any;
          documentText = evidenceDoc.extracted_text || "";
          fileName = evidenceDoc.file_name || "Unknown";
        }
        
        // Try court_pleadings if not found
        if (!documentText) {
          const [pleadingDoc] = await db
            .select()
            .from(courtPleadings)
            .where(eq(courtPleadings.id, tag.documentId));
          
          if (pleadingDoc) {
            documentText = pleadingDoc.extractedText || "";
            fileName = pleadingDoc.fileName || "Unknown";
          }
        }
        
        // Try data_room_documents if not found
        if (!documentText) {
          const dataRoomResult = await db.execute(sql`
            SELECT extracted_text, file_name FROM data_room_documents WHERE id = ${tag.documentId} LIMIT 1
          `);
          
          if (dataRoomResult.rows.length > 0) {
            const dataRoomDoc = dataRoomResult.rows[0] as any;
            documentText = dataRoomDoc.extracted_text || "";
            fileName = dataRoomDoc.file_name || "Unknown";
          }
        }

        let privilegeType = "attorney_client";
        let privilegeDescription = `Document tagged as potentially privileged: ${tag.tagName}`;
        let aiConfidence = tag.confidenceScore || 0;
        let author = null;
        let authorTitle = null;
        let recipients: string[] = [];
        let documentDate = null;
        let documentType = null;
        let aiBasis = null;

        // Run AI analysis if we have document content
        if (documentText && documentText.length > 100 && process.env.GOOGLE_API_KEY) {
          try {
            const analysis = await privilegeService.analyzeDocumentForPrivilege(
              documentText,
              { fileName }
            );
            
            if (analysis.isPrivileged) {
              privilegeType = analysis.privilegeType || "attorney_client";
              privilegeDescription = analysis.suggestedDescription || privilegeDescription;
              aiConfidence = Math.round(analysis.confidence * 100);
              author = analysis.author;
              authorTitle = analysis.authorTitle;
              recipients = analysis.recipients || [];
              documentDate = analysis.documentDate;
              documentType = analysis.documentType;
              aiBasis = analysis.basis;
            }
          } catch (aiError) {
            console.error("[PrivilegeLog] AI analysis failed for document:", tag.documentId, aiError);
          }
        }

        await db.insert(privilegeLogEntries).values({
          id: nanoid(),
          caseId,
          documentId: tag.documentId,
          documentTagId: tag.id,
          privilegeType: privilegeType as any,
          privilegeDescription,
          aiConfidence,
          aiPrivilegeBasis: aiBasis,
          author,
          authorTitle,
          recipients,
          documentDate,
          documentType,
        });

        entriesCreated++;
      }

      res.json({
        success: true,
        message: `Generated ${entriesCreated} privilege log entries`,
        entriesCreated,
      });
    } catch (error) {
      console.error("[PrivilegeLog] Error generating log:", error);
      res.status(500).json({ success: false, error: "Failed to generate privilege log" });
    }
  });

  // PATCH /api/cases/:caseId/privilege-log/:entryId - Update a privilege log entry
  app.patch("/api/cases/:caseId/privilege-log/:entryId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const userId = (req as any).user?.claims?.sub;
      const updates = req.body;

      const [entry] = await db
        .update(privilegeLogEntries)
        .set({
          ...updates,
          updatedAt: new Date(),
          reviewedBy: updates.logStatus === "reviewed" || updates.logStatus === "final" ? userId : undefined,
          reviewedAt: updates.logStatus === "reviewed" || updates.logStatus === "final" ? new Date() : undefined,
        })
        .where(eq(privilegeLogEntries.id, entryId))
        .returning();

      res.json({ success: true, data: entry });
    } catch (error) {
      console.error("[PrivilegeLog] Error updating entry:", error);
      res.status(500).json({ success: false, error: "Failed to update privilege log entry" });
    }
  });

  // DELETE /api/cases/:caseId/privilege-log/:entryId - Delete a privilege log entry
  app.delete("/api/cases/:caseId/privilege-log/:entryId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;

      await db.delete(privilegeLogEntries).where(eq(privilegeLogEntries.id, entryId));

      res.json({ success: true });
    } catch (error) {
      console.error("[PrivilegeLog] Error deleting entry:", error);
      res.status(500).json({ success: false, error: "Failed to delete privilege log entry" });
    }
  });

  // GET /api/cases/:caseId/privilege-log/export - Export privilege log
  app.get("/api/cases/:caseId/privilege-log/export", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const { format = "xlsx" } = req.query;

      const entries = await db
        .select()
        .from(privilegeLogEntries)
        .where(eq(privilegeLogEntries.caseId, caseId))
        .orderBy(privilegeLogEntries.batesBegin);

      if (format === "csv") {
        const headers = [
          "Bates Begin",
          "Bates End",
          "Date",
          "Document Type",
          "Author",
          "Author Title",
          "Recipients",
          "CC Recipients",
          "Privilege Type",
          "Privilege Description",
        ];

        const rows = entries.map((e) => [
          e.batesBegin || "",
          e.batesEnd || "",
          e.documentDate || "",
          e.documentType || "",
          e.author || "",
          e.authorTitle || "",
          (e.recipients || []).join("; "),
          (e.ccRecipients || []).join("; "),
          formatPrivilegeType(e.privilegeType),
          e.privilegeDescription || "",
        ]);

        const csvContent = [headers, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
          .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="privilege-log-${caseId}.csv"`);
        return res.send(csvContent);
      }

      // Excel Export
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Privilege Log");

      worksheet.columns = [
        { header: "Bates Begin", key: "batesBegin", width: 15 },
        { header: "Bates End", key: "batesEnd", width: 15 },
        { header: "Date", key: "documentDate", width: 12 },
        { header: "Document Type", key: "documentType", width: 15 },
        { header: "Author", key: "author", width: 25 },
        { header: "Author Title", key: "authorTitle", width: 20 },
        { header: "Recipients", key: "recipients", width: 40 },
        { header: "CC", key: "ccRecipients", width: 30 },
        { header: "Privilege Type", key: "privilegeType", width: 20 },
        { header: "Description", key: "privilegeDescription", width: 50 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD5E8F0" },
      };

      entries.forEach((entry) => {
        worksheet.addRow({
          batesBegin: entry.batesBegin,
          batesEnd: entry.batesEnd,
          documentDate: entry.documentDate,
          documentType: entry.documentType,
          author: entry.author,
          authorTitle: entry.authorTitle,
          recipients: (entry.recipients || []).join("; "),
          ccRecipients: (entry.ccRecipients || []).join("; "),
          privilegeType: formatPrivilegeType(entry.privilegeType),
          privilegeDescription: entry.privilegeDescription,
        });
      });

      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="privilege-log-${caseId}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[PrivilegeLog] Error exporting log:", error);
      res.status(500).json({ success: false, error: "Failed to export privilege log" });
    }
  });
}

function formatPrivilegeType(type: string): string {
  const labels: Record<string, string> = {
    attorney_client: "Attorney-Client Privilege",
    work_product: "Work Product - Fact",
    work_product_opinion: "Work Product - Opinion",
    common_interest: "Common Interest",
    joint_defense: "Joint Defense",
    deliberative_process: "Deliberative Process",
    other: "Other Privilege",
  };
  return labels[type] || type;
}
