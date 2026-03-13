import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  bulkIntakeSessions,
  bulkIntakeDocuments,
  deals,
  dataRooms,
  dataRoomDocuments,
} from "@shared/schema";

interface ClusterGroup {
  clusterId: string;
  suggestedTitle: string;
  suggestedDealType: string;
  reasoning: string;
  address?: string;
  parties?: string[];
  dateRange?: { earliest: string; latest: string };
  documentIds: string[];
}

interface ClusteringResult {
  clusters: ClusterGroup[];
  unclustered: string[];
}

export async function createSession(userId: string) {
  const [session] = await db
    .insert(bulkIntakeSessions)
    .values({ uploadedBy: userId, status: "uploading" })
    .returning();
  return session;
}

export async function getSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(bulkIntakeSessions)
    .where(eq(bulkIntakeSessions.id, sessionId));
  return session;
}

export async function getSessionDocuments(sessionId: string) {
  return db
    .select()
    .from(bulkIntakeDocuments)
    .where(eq(bulkIntakeDocuments.sessionId, sessionId));
}

export async function addDocumentToSession(
  sessionId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  storageKey: string
) {
  const [doc] = await db
    .insert(bulkIntakeDocuments)
    .values({ sessionId, fileName, fileSize, mimeType, storageKey, ocrStatus: "pending" })
    .returning();

  await db
    .update(bulkIntakeSessions)
    .set({ totalFiles: sql`${bulkIntakeSessions.totalFiles} + 1` })
    .where(eq(bulkIntakeSessions.id, sessionId));

  return doc;
}

export async function processSessionDocument(docId: string) {
  const [doc] = await db
    .select()
    .from(bulkIntakeDocuments)
    .where(eq(bulkIntakeDocuments.id, docId));
  if (!doc || !doc.storageKey) return;

  await db
    .update(bulkIntakeDocuments)
    .set({ ocrStatus: "processing" })
    .where(eq(bulkIntakeDocuments.id, docId));

  try {
    const { ObjectStorageService } = await import("../objectStorage");
    const objectStorageService = new ObjectStorageService();
    const fileBuffer = await objectStorageService.downloadAsBuffer(doc.storageKey);

    const fileExt = doc.fileName.toLowerCase().split(".").pop() || "";
    let extractedText = "";

    if (["pdf"].includes(fileExt)) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
        const base64 = fileBuffer.toString("base64");
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "application/pdf", data: base64 } },
                { text: "Extract ALL text from this document. Return only the extracted text, no commentary." },
              ],
            },
          ],
        });
        extractedText = result.text || "";
      } catch {
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text || "";
      }
    } else if (["docx", "doc"].includes(fileExt)) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || "";
    } else if (["xlsx", "xls", "csv"].includes(fileExt)) {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const texts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        texts.push(`Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`);
      }
      extractedText = texts.join("\n\n");
    } else if (["png", "jpg", "jpeg", "gif", "webp", "tiff", "bmp"].includes(fileExt)) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
        const base64 = fileBuffer.toString("base64");
        const mimeMap: Record<string, string> = {
          png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
          gif: "image/gif", webp: "image/webp", tiff: "image/tiff", bmp: "image/bmp",
        };
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: mimeMap[fileExt] || "image/png", data: base64 } },
              { text: "Extract ALL text from this image. Return only the extracted text." },
            ],
          }],
        });
        extractedText = result.text || "";
      } catch {
        extractedText = "";
      }
    } else {
      extractedText = fileBuffer.toString("utf-8").slice(0, 50000);
    }

    let aiSummary: string | null = null;
    let documentDate: Date | null = null;

    if (extractedText.length > 50) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Summarize this document in 2-3 sentences. Include the property address, parties involved, and document type if apparent:\n\n${extractedText.slice(0, 10000)}`,
        });
        aiSummary = result.text || null;
      } catch {}

      const datePatterns = [
        /(?:dated?|effective|as of|executed)[:\s]+(\w+ \d{1,2},?\s*\d{4})/i,
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(\w+ \d{1,2},?\s*\d{4})/,
      ];
      for (const pattern of datePatterns) {
        const match = extractedText.match(pattern);
        if (match) {
          const parsed = new Date(match[1]);
          if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
            documentDate = parsed;
            break;
          }
        }
      }
    }

    await db
      .update(bulkIntakeDocuments)
      .set({ ocrStatus: "completed", extractedText, aiSummary, documentDate })
      .where(eq(bulkIntakeDocuments.id, docId));

    const [session] = await db
      .select()
      .from(bulkIntakeSessions)
      .where(eq(bulkIntakeSessions.id, doc.sessionId));

    await db
      .update(bulkIntakeSessions)
      .set({ processedFiles: sql`${bulkIntakeSessions.processedFiles} + 1` })
      .where(eq(bulkIntakeSessions.id, doc.sessionId));

    console.log(`[BulkIntake] Processed document "${doc.fileName}" (${extractedText.length} chars)`);
  } catch (err: any) {
    console.error(`[BulkIntake] OCR failed for "${doc.fileName}":`, err.message);
    await db
      .update(bulkIntakeDocuments)
      .set({ ocrStatus: "failed" })
      .where(eq(bulkIntakeDocuments.id, docId));

    await db
      .update(bulkIntakeSessions)
      .set({ processedFiles: sql`${bulkIntakeSessions.processedFiles} + 1` })
      .where(eq(bulkIntakeSessions.id, doc.sessionId));
  }
}

export async function startProcessing(sessionId: string) {
  await db
    .update(bulkIntakeSessions)
    .set({ status: "processing" })
    .where(eq(bulkIntakeSessions.id, sessionId));

  const docs = await db
    .select()
    .from(bulkIntakeDocuments)
    .where(
      and(
        eq(bulkIntakeDocuments.sessionId, sessionId),
        eq(bulkIntakeDocuments.ocrStatus, "pending")
      )
    );

  const CONCURRENCY = 3;
  for (let i = 0; i < docs.length; i += CONCURRENCY) {
    const batch = docs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((d) => processSessionDocument(d.id)));
  }

  await checkAndTriggerClustering(sessionId);
}

async function checkAndTriggerClustering(sessionId: string) {
  const [session] = await db
    .select()
    .from(bulkIntakeSessions)
    .where(eq(bulkIntakeSessions.id, sessionId));

  if (!session) return;

  const docs = await db
    .select()
    .from(bulkIntakeDocuments)
    .where(eq(bulkIntakeDocuments.sessionId, sessionId));

  const allDone = docs.every((d) => d.ocrStatus === "completed" || d.ocrStatus === "failed");
  if (!allDone) return;

  await clusterDocuments(sessionId);
}

export async function clusterDocuments(sessionId: string): Promise<ClusteringResult> {
  await db
    .update(bulkIntakeSessions)
    .set({ status: "clustering" })
    .where(eq(bulkIntakeSessions.id, sessionId));

  const docs = await db
    .select()
    .from(bulkIntakeDocuments)
    .where(eq(bulkIntakeDocuments.sessionId, sessionId));

  const docsWithText = docs.filter((d) => d.extractedText && d.extractedText.length > 50);

  if (docsWithText.length === 0) {
    const result: ClusteringResult = {
      clusters: [],
      unclustered: docs.map((d) => d.id),
    };
    await db
      .update(bulkIntakeSessions)
      .set({ status: "review", clusteringResult: result })
      .where(eq(bulkIntakeSessions.id, sessionId));
    return result;
  }

  const perDoc = Math.min(3000, Math.floor(60000 / docsWithText.length));
  const docSummaries = docsWithText.map((d) => ({
    id: d.id,
    fileName: d.fileName,
    summary: d.aiSummary || d.extractedText?.slice(0, perDoc) || "",
    textSnippet: d.extractedText?.slice(0, perDoc) || "",
    documentDate: d.documentDate?.toISOString() || null,
  }));

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });

    const prompt = `You are a legal document analyst. Analyze these ${docSummaries.length} documents and group them into separate real estate deals/transactions.

Group documents by:
1. Property address — documents mentioning the same address belong together
2. Party names — documents involving the same buyers, sellers, lenders, or borrowers
3. Document dates — documents with similar dates likely belong to the same deal
4. Subject matter — related legal documents (e.g., a purchase agreement and its title report)

For each group, suggest a deal title based on the property address or transaction type.

Documents:
${docSummaries.map((d) => `ID: ${d.id}\nFile: ${d.fileName}\nDate: ${d.documentDate || "unknown"}\nContent: ${d.textSnippet}`).join("\n---\n")}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "clusters": [
    {
      "clusterId": "cluster_1",
      "suggestedTitle": "123 Main St Purchase",
      "suggestedDealType": "Real Estate (Purchase/Sale)",
      "reasoning": "These documents all reference 123 Main St and involve Buyer Corp and Seller LLC",
      "address": "123 Main St, City, ST 12345",
      "parties": ["Buyer Corp", "Seller LLC"],
      "dateRange": { "earliest": "2025-01-01", "latest": "2025-03-15" },
      "documentIds": ["doc-id-1", "doc-id-2"]
    }
  ],
  "unclustered": ["doc-id-that-doesnt-fit"]
}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let responseText = result.text || "{}";
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let clustering: ClusteringResult;
    try {
      clustering = JSON.parse(responseText);
    } catch {
      clustering = { clusters: [], unclustered: docs.map((d) => d.id) };
    }

    if (!clustering.clusters) clustering.clusters = [];
    if (!clustering.unclustered) clustering.unclustered = [];

    const allClusteredIds = new Set(clustering.clusters.flatMap((c) => c.documentIds));
    const unclusteredFromMissing = docs
      .filter((d) => !allClusteredIds.has(d.id) && !clustering.unclustered.includes(d.id))
      .map((d) => d.id);
    clustering.unclustered.push(...unclusteredFromMissing);

    for (const cluster of clustering.clusters) {
      for (const docId of cluster.documentIds) {
        await db
          .update(bulkIntakeDocuments)
          .set({ assignedCluster: cluster.clusterId })
          .where(eq(bulkIntakeDocuments.id, docId));
      }
    }

    await db
      .update(bulkIntakeSessions)
      .set({ status: "review", clusteringResult: clustering })
      .where(eq(bulkIntakeSessions.id, sessionId));

    console.log(`[BulkIntake] Clustered ${docs.length} documents into ${clustering.clusters.length} deals`);
    return clustering;
  } catch (err: any) {
    console.error(`[BulkIntake] Clustering failed:`, err.message);
    const fallback: ClusteringResult = {
      clusters: [],
      unclustered: docs.map((d) => d.id),
    };
    await db
      .update(bulkIntakeSessions)
      .set({ status: "review", clusteringResult: fallback, errorMessage: err.message })
      .where(eq(bulkIntakeSessions.id, sessionId));
    return fallback;
  }
}

export async function updateClustering(sessionId: string, clusters: ClusteringResult) {
  for (const cluster of clusters.clusters) {
    for (const docId of cluster.documentIds) {
      await db
        .update(bulkIntakeDocuments)
        .set({ assignedCluster: cluster.clusterId })
        .where(eq(bulkIntakeDocuments.id, docId));
    }
  }

  for (const docId of clusters.unclustered || []) {
    await db
      .update(bulkIntakeDocuments)
      .set({ assignedCluster: null })
      .where(eq(bulkIntakeDocuments.id, docId));
  }

  await db
    .update(bulkIntakeSessions)
    .set({ clusteringResult: clusters })
    .where(eq(bulkIntakeSessions.id, sessionId));
}

export async function confirmAndCreateDeals(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(bulkIntakeSessions)
    .where(eq(bulkIntakeSessions.id, sessionId));

  if (!session || !session.clusteringResult) {
    throw new Error("Session not found or no clustering result");
  }

  if (session.status === "completed" || session.status === "creating_deals") {
    throw new Error("Deals have already been created for this session");
  }

  if (session.status !== "review" && session.status !== "confirmed") {
    throw new Error("Session is not ready for confirmation");
  }

  await db
    .update(bulkIntakeSessions)
    .set({ status: "creating_deals" })
    .where(eq(bulkIntakeSessions.id, sessionId));

  const clustering = session.clusteringResult as ClusteringResult;
  const createdDeals: Array<{ dealId: string; title: string; documentCount: number }> = [];

  try {
    const { ObjectStorageService } = await import("../objectStorage");
    const objectStorageService = new ObjectStorageService();

    for (const cluster of clustering.clusters) {
      if (cluster.documentIds.length === 0) continue;

      const dealNumber = `DEAL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

      const dealTypeMap: Record<string, string> = {
        "Real Estate (Purchase/Sale)": "real_estate",
        "Real Estate": "real_estate",
        "M&A (Asset)": "ma_asset",
        "M&A (Stock)": "ma_stock",
        "M&A": "ma_asset",
        "Merger": "merger",
        "Investment": "investment",
        "Financing": "debt",
        "Loan": "debt",
        "Refinance": "refinance",
        "Residential": "residential_financed",
        "Commercial": "commercial_financed",
        "Joint Venture": "jv",
        "Franchise": "franchise",
      };

      const suggestedType = cluster.suggestedDealType || "";
      const dealType = dealTypeMap[suggestedType]
        || Object.entries(dealTypeMap).find(([key]) => suggestedType.toLowerCase().includes(key.toLowerCase()))?.[1]
        || "other";

      const [newDeal] = await db
        .insert(deals)
        .values({
          title: cluster.suggestedTitle,
          dealNumber,
          dealType,
          status: "active",
          priority: "medium",
          createdBy: userId,
          description: cluster.reasoning,
        })
        .returning();

      const [newDataRoom] = await db
        .insert(dataRooms)
        .values({
          name: `${cluster.suggestedTitle} - Data Room`,
          description: `Virtual data room for ${cluster.suggestedTitle}`,
          dealId: newDeal.id,
          status: "active",
          createdBy: userId,
        })
        .returning();

      const clusterDocs = await db
        .select()
        .from(bulkIntakeDocuments)
        .where(
          and(
            eq(bulkIntakeDocuments.sessionId, sessionId),
            eq(bulkIntakeDocuments.assignedCluster, cluster.clusterId)
          )
        );

      for (const doc of clusterDocs) {
        let newStoragePath = doc.storageKey;

        if (doc.storageKey) {
          try {
            const buffer = await objectStorageService.downloadAsBuffer(doc.storageKey);
            const targetPath = `data-rooms/${newDataRoom.id}/${doc.fileName}`;
            newStoragePath = await objectStorageService.uploadBuffer(
              targetPath,
              buffer,
              doc.mimeType || "application/octet-stream"
            );
          } catch (copyErr: any) {
            console.error(`[BulkIntake] Failed to copy file ${doc.fileName}:`, copyErr.message);
            newStoragePath = doc.storageKey;
          }
        }

        await db.insert(dataRoomDocuments).values({
          dataRoomId: newDataRoom.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          fileType: doc.mimeType,
          storagePath: newStoragePath,
          uploadedBy: userId,
          extractedText: doc.extractedText,
          documentDate: doc.documentDate,
          aiSummary: doc.aiSummary,
          ocrStatus: doc.ocrStatus === "completed" ? "completed" : "pending",
          ocrProcessedAt: doc.ocrStatus === "completed" ? new Date() : null,
        });
      }

      createdDeals.push({
        dealId: newDeal.id,
        title: cluster.suggestedTitle,
        documentCount: clusterDocs.length,
      });

      console.log(
        `[BulkIntake] Created deal "${cluster.suggestedTitle}" with ${clusterDocs.length} documents`
      );
    }

    await db
      .update(bulkIntakeSessions)
      .set({ status: "completed" })
      .where(eq(bulkIntakeSessions.id, sessionId));

    return createdDeals;
  } catch (err: any) {
    console.error(`[BulkIntake] Deal creation failed:`, err.message);
    await db
      .update(bulkIntakeSessions)
      .set({ status: "failed", errorMessage: err.message })
      .where(eq(bulkIntakeSessions.id, sessionId));
    throw err;
  }
}
