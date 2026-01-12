import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { 
  getBulletSummariesBatch, 
  getOrGenerateBulletSummary,
  generateBulletSummariesForCommunications 
} from "../services/bullet-summary-service";
import { db } from "../db";
import { communications } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const router = Router();

router.post("/api/bullet-summaries/batch", isAuthenticated, async (req: any, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.json({ summaries: {} });
    }

    const limitedIds = documentIds.slice(0, 20);
    
    const comms = await db
      .select({
        id: communications.id,
        subject: communications.subject,
        body: communications.body,
        sender: communications.sender,
        recipients: communications.recipients,
        messageType: communications.messageType,
        sentAt: communications.sentAt,
        caseId: communications.caseId,
      })
      .from(communications)
      .where(inArray(communications.id, limitedIds));

    const summaries: Record<string, {
      bullets: Array<{ text: string; category?: string }>;
      metadata: {
        subject: string | null;
        sender: string | null;
        sentAt: string | null;
        viewUrl: string;
      };
    }> = {};

    for (const comm of comms) {
      const content = `Subject: ${comm.subject || "No subject"}\nFrom: ${comm.sender || "Unknown"}\n\n${comm.body || ""}`;
      const bullets = await getOrGenerateBulletSummary(
        "communication", 
        comm.id, 
        content, 
        comm.messageType || "email"
      );
      
      summaries[comm.id] = {
        bullets,
        metadata: {
          subject: comm.subject,
          sender: comm.sender,
          sentAt: comm.sentAt ? new Date(comm.sentAt).toISOString() : null,
          viewUrl: comm.caseId 
            ? `/cases/${comm.caseId}/communications/${comm.id}` 
            : `/communications/${comm.id}`,
        },
      };
    }

    res.json({ summaries });
  } catch (error: any) {
    console.error("[BulletSummaries] Batch fetch failed:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/api/bullet-summaries/:sourceType/:sourceId", isAuthenticated, async (req: any, res) => {
  try {
    const { sourceType, sourceId } = req.params;
    
    const validTypes = ["communication", "data_room_document", "court_pleading", "case_document"];
    if (!validTypes.includes(sourceType)) {
      return res.status(400).json({ message: "Invalid source type" });
    }
    
    if (sourceType === "communication") {
      const [comm] = await db
        .select({
          id: communications.id,
          subject: communications.subject,
          body: communications.body,
          sender: communications.sender,
          messageType: communications.messageType,
        })
        .from(communications)
        .where(eq(communications.id, sourceId));
      
      if (!comm) {
        return res.status(404).json({ message: "Communication not found" });
      }
      
      const content = `Subject: ${comm.subject || "No subject"}\nFrom: ${comm.sender || "Unknown"}\n\n${comm.body || ""}`;
      const bullets = await getOrGenerateBulletSummary(
        "communication",
        sourceId,
        content,
        comm.messageType || "email"
      );
      
      return res.json({ bullets });
    }
    
    res.json({ bullets: [] });
  } catch (error: any) {
    console.error("[BulletSummaries] Fetch failed:", error);
    res.status(500).json({ message: error.message });
  }
});

export function registerBulletSummaryRoutes(app: any) {
  app.use(router);
}
