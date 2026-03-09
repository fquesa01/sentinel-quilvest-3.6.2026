import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  investorMemos, memoGenerationRuns, extractedFinancials,
  financialModels, memoSectionEdits, memoChatMessages, deals, users,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateInvestorMemo, regenerateSection, chatAboutMemo } from "../services/investor-memo-service";
import { generateMemoPDF, generateMemoExcel, generateMemoWord } from "../services/memo-export-service";

const router = Router();

function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).userId || "unknown";
}

router.post("/api/deals/:dealId/memos/generate", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const { sourceType = "pe_deal" } = req.body;
    const userId = getUserId(req);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    const sendProgress = (stage: string, progress: number, message: string) => {
      res.write(`data: ${JSON.stringify({ stage, progress, message })}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      const memoId = await generateInvestorMemo(dealId, sourceType, userId, sendProgress);
      res.write(`data: ${JSON.stringify({ stage: "complete", progress: 100, message: "Done", memoId })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ stage: "error", progress: 0, message: err.message })}\n\n`);
    }

    res.end();
  } catch (err: any) {
    console.error("[MemoRoutes] Generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/deals/:dealId/memos", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const memos = await db.select().from(investorMemos)
      .where(eq(investorMemos.dealId, dealId))
      .orderBy(desc(investorMemos.createdAt));
    res.json(memos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const [memo] = await db.select().from(investorMemos)
      .where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });
    res.json(memo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/model", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const models = await db.select().from(financialModels)
      .where(eq(financialModels.memoId, memoId));
    res.json(models[0] || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/financials", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const data = await db.select().from(extractedFinancials)
      .where(eq(extractedFinancials.memoId, memoId));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/progress", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const [run] = await db.select().from(memoGenerationRuns)
      .where(eq(memoGenerationRuns.memoId, memoId))
      .orderBy(desc(memoGenerationRuns.startedAt))
      .limit(1);
    res.json(run || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/memos/:memoId/sections/:section", async (req: Request, res: Response) => {
  try {
    const { memoId, section } = req.params;
    const { content } = req.body;
    const userId = getUserId(req);

    const [memo] = await db.select().from(investorMemos)
      .where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });

    const sections = (memo.sections || {}) as Record<string, any>;
    const previousContent = sections[section]?.content || "";

    sections[section] = {
      ...sections[section],
      content,
      isEdited: true,
      editedAt: new Date().toISOString(),
      editedBy: userId,
    };

    await db.update(investorMemos).set({
      sections: sections as any,
      updatedAt: new Date(),
    }).where(eq(investorMemos.id, memoId));

    await db.insert(memoSectionEdits).values({
      memoId,
      section,
      previousContent,
      newContent: content,
      editedBy: userId,
      editType: "manual",
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/sections/:section/versions", async (req: Request, res: Response) => {
  try {
    const { memoId, section } = req.params;

    const versions = await db.select({
      id: memoSectionEdits.id,
      previousContent: memoSectionEdits.previousContent,
      newContent: memoSectionEdits.newContent,
      editType: memoSectionEdits.editType,
      aiPrompt: memoSectionEdits.aiPrompt,
      createdAt: memoSectionEdits.createdAt,
      editorFirstName: users.firstName,
      editorLastName: users.lastName,
    })
      .from(memoSectionEdits)
      .leftJoin(users, eq(memoSectionEdits.editedBy, users.id))
      .where(and(
        eq(memoSectionEdits.memoId, memoId),
        eq(memoSectionEdits.section, section),
      ))
      .orderBy(desc(memoSectionEdits.createdAt));

    const result = versions.map((v) => ({
      id: v.id,
      previousContent: v.previousContent,
      newContent: v.newContent,
      editType: v.editType,
      aiPrompt: v.aiPrompt,
      createdAt: v.createdAt,
      editorName: `${v.editorFirstName || ""} ${v.editorLastName || ""}`.trim() || "Unknown",
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/memos/:memoId/sections/:section/restore", async (req: Request, res: Response) => {
  try {
    const { memoId, section } = req.params;
    const { versionId } = req.body;
    const userId = getUserId(req);

    if (!versionId) return res.status(400).json({ error: "versionId is required" });

    const [version] = await db.select().from(memoSectionEdits).where(and(
      eq(memoSectionEdits.id, versionId),
      eq(memoSectionEdits.memoId, memoId),
      eq(memoSectionEdits.section, section),
    ));
    if (!version) return res.status(404).json({ error: "Version not found" });

    const restoreContent = version.previousContent || "";

    const [memo] = await db.select().from(investorMemos).where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });

    const sections = (memo.sections || {}) as Record<string, any>;
    const currentContent = sections[section]?.content || "";

    await db.insert(memoSectionEdits).values({
      memoId,
      section,
      previousContent: currentContent,
      newContent: restoreContent,
      editedBy: userId,
      editType: "restore",
    });

    sections[section] = {
      ...sections[section],
      content: restoreContent,
      isEdited: true,
      editedAt: new Date().toISOString(),
      editedBy: userId,
    };

    await db.update(investorMemos).set({
      sections: sections as any,
      updatedAt: new Date(),
    }).where(eq(investorMemos.id, memoId));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/memos/:memoId/regenerate/:section", async (req: Request, res: Response) => {
  try {
    const { memoId, section } = req.params;
    const { prompt } = req.body;
    const userId = getUserId(req);

    const [memo] = await db.select().from(investorMemos).where(eq(investorMemos.id, memoId));
    const previousContent = memo
      ? ((memo.sections || {}) as Record<string, any>)[section]?.content || ""
      : "";

    const [insertedEdit] = await db.insert(memoSectionEdits).values({
      memoId,
      section,
      previousContent,
      newContent: "",
      editedBy: userId,
      editType: "regeneration",
      aiPrompt: prompt || null,
    }).returning({ id: memoSectionEdits.id });

    const newContent = await regenerateSection(memoId, section, prompt);

    await db.update(memoSectionEdits)
      .set({ newContent })
      .where(eq(memoSectionEdits.id, insertedEdit.id));

    res.json({ content: newContent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/memos/:memoId/chat", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const { message } = req.body;

    await db.insert(memoChatMessages).values({
      memoId,
      role: "user",
      content: message,
    });

    const result = await chatAboutMemo(memoId, message);

    await db.insert(memoChatMessages).values({
      memoId,
      role: "assistant",
      content: result.response,
      actionTaken: result.actionTaken as any,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/chat", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const messages = await db.select().from(memoChatMessages)
      .where(eq(memoChatMessages.memoId, memoId))
      .orderBy(memoChatMessages.createdAt);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/memos/:memoId/model/assumptions", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const { assumptions } = req.body;

    const [model] = await db.select().from(financialModels)
      .where(eq(financialModels.memoId, memoId));
    if (!model) return res.status(404).json({ error: "Model not found" });

    await db.update(financialModels).set({
      assumptions: assumptions as any,
      updatedAt: new Date(),
    }).where(eq(financialModels.id, model.id));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/export/pdf", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const [memo] = await db.select().from(investorMemos)
      .where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });

    const [model] = await db.select().from(financialModels)
      .where(eq(financialModels.memoId, memoId));

    const pdfBuffer = await generateMemoPDF(memo, model);
    const filename = `Investor_Memo_${memo.dealName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/export/word", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const [memo] = await db.select().from(investorMemos)
      .where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });

    const [model] = await db.select().from(financialModels)
      .where(eq(financialModels.memoId, memoId));

    const wordBuffer = await generateMemoWord(memo, model);
    const filename = `Investor_Memo_${memo.dealName.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(wordBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/memos/:memoId/export/excel", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    const [memo] = await db.select().from(investorMemos)
      .where(eq(investorMemos.id, memoId));
    if (!memo) return res.status(404).json({ error: "Memo not found" });

    const [model] = await db.select().from(financialModels)
      .where(eq(financialModels.memoId, memoId));

    const excelBuffer = await generateMemoExcel(memo, model);
    const filename = `Financial_Model_${memo.dealName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/deals/:dealId/memos/auto-generate", async (req: Request, res: Response) => {
  try {
    const { dealId } = req.params;
    const userId = getUserId(req);
    console.log(`[MemoRoutes] Auto-generate requested for deal ${dealId} by user ${userId}`);

    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) return res.status(404).json({ error: "Deal not found" });

    const existingGenerating = await db.select({ id: investorMemos.id, updatedAt: investorMemos.updatedAt })
      .from(investorMemos)
      .where(and(eq(investorMemos.dealId, dealId), eq(investorMemos.status, "generating")));
    
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
    for (const stuck of existingGenerating) {
      const age = Date.now() - (stuck.updatedAt?.getTime() || 0);
      if (age < STUCK_THRESHOLD_MS) {
        console.log(`[MemoRoutes] Memo ${stuck.id} is still generating (${Math.round(age / 1000)}s old), skipping cleanup`);
        return res.status(409).json({ error: "A memo is currently being generated for this deal. Please wait for it to complete." });
      }
      console.log(`[MemoRoutes] Cleaning up stuck memo ${stuck.id} (${Math.round(age / 1000)}s old)`);
      await db.delete(extractedFinancials).where(eq(extractedFinancials.memoId, stuck.id));
      await db.delete(memoGenerationRuns).where(eq(memoGenerationRuns.memoId, stuck.id));
      await db.delete(investorMemos).where(eq(investorMemos.id, stuck.id));
    }

    const settings = (deal.settings || {}) as Record<string, any>;

    await db.update(deals).set({
      settings: {
        ...settings,
        memoStatus: "generating",
        memoGenerationStartedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    }).where(eq(deals.id, dealId));

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    res.flushHeaders();

    const sendProgress = (stage: string, progress: number, message: string) => {
      res.write(`data: ${JSON.stringify({ stage, progress, message })}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      const memoId = await generateInvestorMemo(dealId, "transaction", userId, sendProgress);

      await db.update(deals).set({
        settings: {
          ...((await db.select().from(deals).where(eq(deals.id, dealId)))[0]?.settings as Record<string, any> || {}),
          memoStatus: "generated",
          lastMemoGeneratedAt: new Date().toISOString(),
          lastMemoId: memoId,
        },
        updatedAt: new Date(),
      }).where(eq(deals.id, dealId));

      res.write(`data: ${JSON.stringify({ stage: "complete", progress: 100, message: "Done", memoId })}\n\n`);
    } catch (err: any) {
      const latestSettings = ((await db.select().from(deals).where(eq(deals.id, dealId)))[0]?.settings as Record<string, any> || {});
      await db.update(deals).set({
        settings: {
          ...latestSettings,
          memoStatus: "failed",
          memoError: err.message,
        },
        updatedAt: new Date(),
      }).where(eq(deals.id, dealId));

      res.write(`data: ${JSON.stringify({ stage: "error", progress: 0, message: err.message })}\n\n`);
    }

    res.end();
  } catch (err: any) {
    console.error("[MemoRoutes] Auto-generate error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.delete("/api/memos/:memoId", async (req: Request, res: Response) => {
  try {
    const { memoId } = req.params;
    await db.delete(investorMemos).where(eq(investorMemos.id, memoId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
