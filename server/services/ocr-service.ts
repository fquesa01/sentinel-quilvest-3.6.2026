import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { dataRoomDocuments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import mammoth from "mammoth";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// Extract text from DOCX files using mammoth
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (error: any) {
    console.error("DOCX extraction failed:", error.message);
    return '';
  }
}

// Extract text from PDF files using pdf-parse (fallback when Gemini fails)
async function extractTextFromPdfFallback(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v1.x exports a function as default
    // @ts-ignore - pdf-parse doesn't have type definitions
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error: any) {
    console.error("PDF-parse extraction failed:", error.message);
    return '';
  }
}

/**
 * Detects if extracted text appears to be garbled due to custom font encoding.
 * Some PDFs (especially e-filed court documents) use custom font mappings where
 * character codes don't match Unicode, resulting in text that looks like:
 * "!"#$%&#'!(')!$#'*)($#+*(#$%&#&,&-&"$%#" or "&345675882"
 */
function isGarbledText(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  const sample = text.slice(0, 3000);
  
  // Count different character types
  const letters = (sample.match(/[a-zA-Z]/g) || []).length;
  const digits = (sample.match(/[0-9]/g) || []).length;
  const specialChars = (sample.match(/[#$%^&@*<>{}|\\~`!'"();:,.\-+=\[\]]/g) || []).length;
  const totalChars = sample.length;
  
  // Calculate ratios
  const letterRatio = letters / totalChars;
  const specialRatio = specialChars / totalChars;
  const digitRatio = digits / totalChars;
  
  // Heuristic 1: Very high special character ratio (> 15% is suspicious)
  const highSpecialChars = specialRatio > 0.15;
  
  // Heuristic 2: Check for common English words
  const commonWords = ['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'from', 'have', 
                       'has', 'been', 'will', 'shall', 'not', 'any', 'all', 'such', 'which', 'upon'];
  const lowerSample = sample.toLowerCase();
  let wordMatches = 0;
  for (const word of commonWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    wordMatches += (lowerSample.match(regex) || []).length;
  }
  const expectedWords = totalChars / 200;
  const lowWordCount = wordMatches < expectedWords * 0.3;
  
  // Heuristic 3: Encoding artifacts - special chars between alphanumerics
  const encodingArtifacts = (sample.match(/[A-Za-z0-9][#$%^&*@!'"(){}\[\]<>][A-Za-z0-9]/g) || []).length;
  const artifactRatio = encodingArtifacts / (totalChars / 100);
  const highArtifacts = artifactRatio > 1.5;
  
  // Heuristic 4: Consecutive special characters
  const consecutiveSpecial = (sample.match(/[#$%^&*@!]{2,}/g) || []).length;
  const hasConsecutiveSpecial = consecutiveSpecial > 3;
  
  // Heuristic 5: Low letter ratio (normal English is 70-85% letters)
  const lowLetterRatio = letterRatio < 0.45;
  
  // Heuristic 6: Unusual digit sequences
  const longDigitSequences = (sample.match(/[0-9]{4,}/g) || []).length;
  const unusualDigits = longDigitSequences > 5 && digitRatio > 0.1;
  
  // Scoring system
  let garbleScore = 0;
  if (highSpecialChars) garbleScore += 2;
  if (lowWordCount) garbleScore += 2;
  if (highArtifacts) garbleScore += 2;
  if (hasConsecutiveSpecial) garbleScore += 1;
  if (lowLetterRatio) garbleScore += 2;
  if (unusualDigits) garbleScore += 1;
  
  const isGarbled = garbleScore >= 4;
  
  if (garbleScore >= 2) {
    console.log(`[OCR] Garble check: letterRatio=${letterRatio.toFixed(2)}, specialRatio=${specialRatio.toFixed(2)}, wordMatches=${wordMatches}/${Math.round(expectedWords)}, score=${garbleScore}, isGarbled=${isGarbled}`);
  }
  
  return isGarbled;
}

export interface OCRResult {
  extractedText: string;
  documentDate: Date | null;
  documentDateSource: 'content' | 'filename' | 'metadata' | 'upload';
  aiSummary: string | null;
  success: boolean;
  error?: string;
}

const DATE_PATTERNS = [
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
  /\bDated:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
  /\bDate:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi,
  /\bEffective\s+Date:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
];

function extractDateFromFilename(filename: string): Date | null {
  const patterns = [
    /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})(\d{2})(\d{2,4})/,
    /\((\d{1,2})-(\d{1,2})-(\d{2,4})\)/,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      try {
        if (match[1].length === 4) {
          return new Date(`${match[1]}-${match[2]}-${match[3]}`);
        } else {
          const year = parseInt(match[3]);
          const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
          return new Date(fullYear, parseInt(match[1]) - 1, parseInt(match[2]));
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function generateDocumentSummary(text: string, fileName: string): Promise<string | null> {
  if (!text || text.trim().length < 50) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Provide a brief 2-3 sentence summary of this document titled "${fileName}". Focus on the key purpose and main points:

${text.slice(0, 5000)}${text.length > 5000 ? '...' : ''}`
        }]
      }]
    });
    
    // Gemini SDK provides direct .text property
    if ((response as any).text) {
      return (response as any).text.trim() || null;
    }
    
    // Fallback to candidates
    if ((response as any).candidates?.length) {
      const textSegments: string[] = [];
      for (const candidate of (response as any).candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof (part as { text?: unknown }).text === "string") {
            textSegments.push((part as { text: string }).text);
          }
        }
      }
      return textSegments.join("\n").trim() || null;
    }
    
    return null;
  } catch (error: any) {
    console.error("Failed to generate document summary:", error.message);
    return null;
  }
}

function extractDateFromText(text: string): Date | null {
  if (!text) return null;
  
  const allDates: { date: Date; position: number }[] = [];
  
  for (const pattern of DATE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      try {
        const dateStr = match[1] || match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2100) {
          allDates.push({ date: parsed, position: match.index });
        }
      } catch {
        continue;
      }
    }
  }
  
  if (allDates.length === 0) return null;
  
  const priorityPatterns = ['Effective Date', 'Dated:', 'Date:', 'As of'];
  for (const priority of priorityPatterns) {
    const idx = text.toLowerCase().indexOf(priority.toLowerCase());
    if (idx !== -1) {
      const nearbyDate = allDates.find(d => Math.abs(d.position - idx) < 100);
      if (nearbyDate) return nearbyDate.date;
    }
  }
  
  allDates.sort((a, b) => a.position - b.position);
  return allDates[0]?.date || null;
}

export async function performOCR(documentId: string): Promise<OCRResult> {
  try {
    await db.update(dataRoomDocuments)
      .set({ ocrStatus: "processing" })
      .where(eq(dataRoomDocuments.id, documentId));

    const [doc] = await db.select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, documentId));
    if (!doc) {
      throw new Error("Document not found");
    }

    const fileType = doc.fileType?.toLowerCase() || '';
    const fileExt = doc.fileName?.toLowerCase().split('.').pop() || '';
    const nonOcrExtensions = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'md'];
    const nonOcrMimeTypes = ['text/plain', 'text/csv', 'application/json', 'application/xml', 'text/xml', 'text/html', 'text/markdown'];
    
    if (nonOcrExtensions.includes(fileExt) || nonOcrMimeTypes.includes(fileType)) {
      await db.update(dataRoomDocuments)
        .set({ 
          ocrStatus: "not_applicable",
          ocrProcessedAt: new Date(),
        })
        .where(eq(dataRoomDocuments.id, documentId));
      
      return {
        extractedText: doc.extractedText || '',
        documentDate: null,
        documentDateSource: 'upload',
        aiSummary: null,
        success: true,
      };
    }

    if (!doc.storagePath) {
      throw new Error("No storage path for document");
    }

    let extractedText = doc.extractedText || '';
    
    // Download file content from object storage once
    const { ObjectStorageService } = await import("../objectStorage");
    const objectStorageService = new ObjectStorageService();
    let fileBuffer: Buffer | null = null;
    
    try {
      fileBuffer = await objectStorageService.downloadAsBuffer(doc.storagePath);
    } catch (downloadError: any) {
      console.error(`Failed to download file for ${documentId}:`, downloadError.message);
      throw new Error(`File download failed: ${downloadError.message}`);
    }
    
    // Handle DOCX/Word documents
    const isDocx = fileType.includes('docx') || fileType.includes('document') || 
                   fileType.includes('word') || doc.fileName.toLowerCase().endsWith('.docx');
    
    if (isDocx && (!extractedText || extractedText.trim().length < 50)) {
      console.log(`[OCR] Extracting text from DOCX: ${doc.fileName}`);
      extractedText = await extractTextFromDocx(fileBuffer);
      if (extractedText && extractedText.length > 50) {
        console.log(`[OCR] Successfully extracted ${extractedText.length} chars from DOCX`);
      }
    }
    
    // Handle Excel/spreadsheet documents
    const isExcel = fileType.includes('spreadsheet') || fileType.includes('excel') ||
                    fileType.includes('ms-excel') || doc.fileName.toLowerCase().match(/\.(xlsx?|xls|xlsm|xlsb|csv)$/);

    if (isExcel && fileBuffer && (!extractedText || extractedText.trim().length < 50)) {
      console.log(`[OCR] Extracting text from spreadsheet: ${doc.fileName}`);
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true, cellNF: true });
        const parts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          if (!ws) continue;
          parts.push(`=== Sheet: ${sheetName} ===`);
          const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
          for (let r = range.s.r; r <= range.e.r; r++) {
            const cells: string[] = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = ws[XLSX.utils.encode_cell({ r, c })];
              cells.push(cell ? (cell.t === "n" && cell.z ? XLSX.utils.format_cell(cell) : String(cell.v ?? "")) : "");
            }
            if (cells.some(v => v.trim() !== "")) {
              parts.push(cells.join(" | "));
            }
          }
          parts.push("");
        }
        extractedText = parts.join("\n");
        console.log(`[OCR] Successfully extracted ${extractedText.length} chars from spreadsheet (${workbook.SheetNames.length} sheets)`);
      } catch (xlErr: any) {
        console.error(`[OCR] Excel extraction failed for ${doc.fileName}:`, xlErr.message);
      }
    }

    // Handle image-based OCR (Gemini only)
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'];
    const isImage = imageTypes.some(t => fileType.includes(t));
    
    if (isImage && (!extractedText || extractedText.trim().length < 50)) {
      try {
        const base64Data = fileBuffer.toString('base64');
        
        let mimeType = 'image/png';
        if (fileType.includes('jpg') || fileType.includes('jpeg')) mimeType = 'image/jpeg';
        else if (fileType.includes('gif')) mimeType = 'image/gif';
        else if (fileType.includes('bmp')) mimeType = 'image/bmp';
        else if (fileType.includes('webp')) mimeType = 'image/webp';
        else if (fileType.includes('tiff')) mimeType = 'image/tiff';
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              {
                text: `Extract ALL text from this image. Perform OCR to extract all visible text. Return the full extracted text, preserving paragraph structure.`
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                }
              }
            ]
          }]
        });
        
        if ((response as any).text) {
          extractedText = (response as any).text.trim();
        } else if ((response as any).candidates?.length) {
          const textSegments: string[] = [];
          for (const candidate of (response as any).candidates) {
            const parts = candidate?.content?.parts ?? [];
            for (const part of parts) {
              if (typeof (part as { text?: unknown }).text === "string") {
                textSegments.push((part as { text: string }).text);
              }
            }
          }
          extractedText = textSegments.join("\n").trim();
        }
      } catch (ocrError: any) {
        console.error(`Image OCR failed for ${documentId}:`, ocrError.message);
      }
    }
    
    // Handle PDF documents - try Gemini first, then fallback to pdf-parse
    const isPdf = fileType.includes('pdf');
    
    // Check if existing extractedText is garbled (custom font encoding issue)
    const textIsGarbled = isPdf && extractedText && isGarbledText(extractedText);
    if (textIsGarbled) {
      console.log(`[OCR] Detected garbled text in PDF ${doc.fileName} - will use Gemini OCR`);
      extractedText = ''; // Force re-extraction with Gemini
    }
    
    if (isPdf && (!extractedText || extractedText.trim().length < 50)) {
      console.log(`[OCR] Processing PDF: ${doc.fileName}`);
      
      // Try Gemini OCR first (works for scanned PDFs and images)
      try {
        const base64Data = fileBuffer.toString('base64');
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              {
                text: `Extract ALL text from this PDF document. If this is a scanned document, perform OCR to extract all visible text. Return the full extracted text, preserving paragraph structure.`
              },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                }
              }
            ]
          }]
        });
        
        if ((response as any).text) {
          extractedText = (response as any).text.trim();
        } else if ((response as any).candidates?.length) {
          const textSegments: string[] = [];
          for (const candidate of (response as any).candidates) {
            const parts = candidate?.content?.parts ?? [];
            for (const part of parts) {
              if (typeof (part as { text?: unknown }).text === "string") {
                textSegments.push((part as { text: string }).text);
              }
            }
          }
          extractedText = textSegments.join("\n").trim();
        }
        
        if (extractedText && extractedText.length > 50) {
          console.log(`[OCR] Gemini extracted ${extractedText.length} chars from PDF`);
        }
      } catch (geminiError: any) {
        console.error(`Gemini PDF extraction failed for ${documentId}:`, geminiError.message);
      }
      
      // If Gemini failed or returned too little text, try pdf-parse as fallback
      if (!extractedText || extractedText.trim().length < 50) {
        console.log(`[OCR] Trying pdf-parse fallback for: ${doc.fileName}`);
        const fallbackText = await extractTextFromPdfFallback(fileBuffer);
        if (fallbackText && fallbackText.length > (extractedText?.length || 0)) {
          extractedText = fallbackText;
          console.log(`[OCR] pdf-parse extracted ${extractedText.length} chars from PDF`);
        }
      }
    }

    let documentDate: Date | null = null;
    let documentDateSource: 'content' | 'filename' | 'metadata' | 'upload' = 'upload';

    documentDate = extractDateFromText(extractedText);
    if (documentDate) {
      documentDateSource = 'content';
    }

    if (!documentDate) {
      documentDate = extractDateFromFilename(doc.fileName);
      if (documentDate) {
        documentDateSource = 'filename';
      }
    }

    if (!documentDate && doc.metadata) {
      const meta = doc.metadata as any;
      const metaDateFields = ['createdDate', 'modifiedDate', 'created', 'modified', 'date'];
      for (const field of metaDateFields) {
        if (meta[field]) {
          try {
            documentDate = new Date(meta[field]);
            if (!isNaN(documentDate.getTime())) {
              documentDateSource = 'metadata';
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }

    if (!documentDate && doc.uploadedAt) {
      documentDate = doc.uploadedAt;
      documentDateSource = 'upload';
    }

    // Generate AI summary from extracted text
    let aiSummary: string | null = null;
    let comprehensiveSummary: string | null = null;
    let chunksProcessed: number | null = null;
    let totalCharacters: number | null = null;

    if (extractedText && extractedText.trim().length >= 50) {
      const HIERARCHICAL_THRESHOLD = 5000;
      
      if (extractedText.length > HIERARCHICAL_THRESHOLD) {
        console.log(`[OCR] Document ${doc.fileName} has ${extractedText.length} chars - using hierarchical summarization`);
        try {
          const { generateHierarchicalSummary } = await import('./hierarchical-summarization-service');
          const result = await generateHierarchicalSummary(extractedText, doc.fileName);
          comprehensiveSummary = result.comprehensiveSummary;
          chunksProcessed = result.totalChunks;
          totalCharacters = result.totalCharacters;
          aiSummary = result.comprehensiveSummary.slice(0, 2000);
          console.log(`[OCR] Hierarchical summary complete: ${chunksProcessed} chunks, ${totalCharacters} chars`);
        } catch (error: any) {
          console.error(`[OCR] Hierarchical summarization failed, falling back to quick summary:`, error.message);
          aiSummary = await generateDocumentSummary(extractedText, doc.fileName);
        }
      } else {
        aiSummary = await generateDocumentSummary(extractedText, doc.fileName);
      }
    }

    await db.update(dataRoomDocuments)
      .set({ 
        extractedText: extractedText || doc.extractedText,
        aiSummary,
        comprehensiveSummary,
        chunksProcessed,
        totalCharacters,
        ocrStatus: "completed",
        ocrProcessedAt: new Date(),
        documentDate,
        documentDateSource,
      })
      .where(eq(dataRoomDocuments.id, documentId));

    // Trigger deal intelligence processing asynchronously (fire-and-forget)
    try {
      const { processDealDocumentIntelligence, populateDealOverview } = await import("./deal-intelligence-service");
      processDealDocumentIntelligence(documentId).then(async () => {
        try {
          const docRow = await db.select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, documentId));
          if (docRow[0]) {
            const { dataRooms: dataRoomsTable } = await import("@shared/schema");
            const [room] = await db.select().from(dataRoomsTable).where(eq(dataRoomsTable.id, docRow[0].dataRoomId));
            if (room?.dealId) {
              const { deals: dealsTable } = await import("@shared/schema");
              const [deal] = await db.select().from(dealsTable).where(eq(dealsTable.id, room.dealId));
              if (deal && (!deal.description || !deal.dealStructure || !deal.subType || !deal.dealValue)) {
                console.log(`[DealIntel] Auto-populating deal overview for "${deal.title}"`);
                await populateDealOverview(deal.id);
              }
            }
          }
        } catch (popErr: any) {
          console.error(`[DealIntel] Auto-populate overview failed:`, popErr.message);
        }
      }).catch(err => {
        console.error(`[DealIntel] Background processing failed for ${documentId}:`, err.message);
      });
    } catch (importErr: any) {
      console.error(`[DealIntel] Failed to import deal intelligence service:`, importErr.message);
    }

    return {
      extractedText,
      documentDate,
      documentDateSource,
      aiSummary,
      success: true,
    };

  } catch (error: any) {
    console.error(`OCR processing failed for ${documentId}:`, error.message);
    
    await db.update(dataRoomDocuments)
      .set({ 
        ocrStatus: "failed",
        ocrError: error.message,
        ocrProcessedAt: new Date(),
      })
      .where(eq(dataRoomDocuments.id, documentId));

    return {
      extractedText: '',
      documentDate: null,
      documentDateSource: 'upload',
      aiSummary: null,
      success: false,
      error: error.message,
    };
  }
}

export async function processDataRoomDocumentOCR(documentId: string): Promise<void> {
  console.log(`Starting OCR processing for document ${documentId}`);
  const result = await performOCR(documentId);
  if (result.success) {
    console.log(`OCR completed for ${documentId}: date=${result.documentDate?.toISOString()}, source=${result.documentDateSource}`);
  } else {
    console.error(`OCR failed for ${documentId}: ${result.error}`);
  }
}

export async function reprocessAllDocumentsInDataRoom(dataRoomId: string): Promise<{ processed: number; failed: number }> {
  const docs = await db.select()
    .from(dataRoomDocuments)
    .where(eq(dataRoomDocuments.dataRoomId, dataRoomId));

  let processed = 0;
  let failed = 0;

  for (const doc of docs) {
    const result = await performOCR(doc.id);
    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}

const ocrQueue: string[] = [];
let isProcessing = false;
const MAX_CONCURRENT = 3;
let activeCount = 0;

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (ocrQueue.length > 0 && activeCount < MAX_CONCURRENT) {
    const documentId = ocrQueue.shift();
    if (!documentId) continue;

    activeCount++;
    processDataRoomDocumentOCR(documentId)
      .catch(err => console.error(`[OCR Queue] Error processing ${documentId}:`, err))
      .finally(() => {
        activeCount--;
        if (ocrQueue.length > 0) {
          processQueue();
        }
      });
  }

  isProcessing = false;
}

export function queueDocumentsForOCR(documentIds: string[]): void {
  console.log(`[OCR Queue] Queuing ${documentIds.length} documents for OCR processing`);
  ocrQueue.push(...documentIds);
  processQueue();
}

// Re-process documents that completed but have no extracted text
export async function reprocessDocumentsWithoutText(): Promise<{ queued: number }> {
  const { sql, isNull, and } = await import("drizzle-orm");
  
  // Find documents marked as completed but without extracted text
  const docsWithoutText = await db
    .select({ id: dataRoomDocuments.id, fileName: dataRoomDocuments.fileName })
    .from(dataRoomDocuments)
    .where(and(
      sql`${dataRoomDocuments.ocrStatus} = 'completed'`,
      sql`(${dataRoomDocuments.extractedText} IS NULL OR TRIM(${dataRoomDocuments.extractedText}) = '' OR LENGTH(${dataRoomDocuments.extractedText}) < 50)`
    ));
  
  if (docsWithoutText.length > 0) {
    console.log(`[OCR Reprocess] Found ${docsWithoutText.length} documents completed without text - re-queuing`);
    
    // Reset their status to pending so they can be processed again
    for (const doc of docsWithoutText) {
      await db.update(dataRoomDocuments)
        .set({ ocrStatus: "pending", ocrProcessedAt: null })
        .where(eq(dataRoomDocuments.id, doc.id));
    }
    
    queueDocumentsForOCR(docsWithoutText.map(d => d.id));
    return { queued: docsWithoutText.length };
  }
  
  console.log(`[OCR Reprocess] No documents need reprocessing`);
  return { queued: 0 };
}

// Reprocess documents to generate comprehensive summaries for large documents
export async function reprocessForComprehensiveSummaries(dataRoomId?: string): Promise<{ processed: number; failed: number; skipped: number }> {
  const { sql, and } = await import("drizzle-orm");
  
  const baseCondition = and(
    sql`${dataRoomDocuments.extractedText} IS NOT NULL`,
    sql`LENGTH(${dataRoomDocuments.extractedText}) > 5000`,
    sql`${dataRoomDocuments.comprehensiveSummary} IS NULL`
  );
  
  const whereCondition = dataRoomId 
    ? and(baseCondition, sql`${dataRoomDocuments.dataRoomId} = ${dataRoomId}`)
    : baseCondition;
  
  const docsNeedingSummary = await db
    .select({ 
      id: dataRoomDocuments.id, 
      fileName: dataRoomDocuments.fileName,
      extractedText: dataRoomDocuments.extractedText,
    })
    .from(dataRoomDocuments)
    .where(whereCondition);
  
  console.log(`[Comprehensive Summary] Found ${docsNeedingSummary.length} documents needing hierarchical summarization`);
  
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  
  const { generateHierarchicalSummary } = await import('./hierarchical-summarization-service');
  
  for (const doc of docsNeedingSummary) {
    if (!doc.extractedText || doc.extractedText.length < 5000) {
      skipped++;
      continue;
    }
    
    try {
      console.log(`[Comprehensive Summary] Processing ${doc.fileName} (${doc.extractedText.length} chars)`);
      const result = await generateHierarchicalSummary(doc.extractedText, doc.fileName);
      
      await db.update(dataRoomDocuments)
        .set({
          comprehensiveSummary: result.comprehensiveSummary,
          chunksProcessed: result.totalChunks,
          totalCharacters: result.totalCharacters,
        })
        .where(eq(dataRoomDocuments.id, doc.id));
      
      processed++;
      console.log(`[Comprehensive Summary] Completed ${doc.fileName}: ${result.totalChunks} chunks`);
    } catch (error: any) {
      console.error(`[Comprehensive Summary] Failed for ${doc.fileName}:`, error.message);
      failed++;
    }
  }
  
  console.log(`[Comprehensive Summary] Complete: ${processed} processed, ${failed} failed, ${skipped} skipped`);
  return { processed, failed, skipped };
}

// Process pending OCR documents on startup (after 10 second delay)
export async function processPendingOCROnStartup(): Promise<void> {
  setTimeout(async () => {
    try {
      const { sql } = await import("drizzle-orm");
      
      // First, process any pending documents
      const pendingDocs = await db
        .select({ id: dataRoomDocuments.id })
        .from(dataRoomDocuments)
        .where(sql`${dataRoomDocuments.ocrStatus} IN ('pending', 'processing')`);
      
      if (pendingDocs.length > 0) {
        console.log(`[OCR Startup] Found ${pendingDocs.length} pending documents - queuing for processing`);
        queueDocumentsForOCR(pendingDocs.map(d => d.id));
      } else {
        console.log(`[OCR Startup] No pending documents found`);
      }
      
      // After a delay, also re-process documents that completed without text
      setTimeout(async () => {
        try {
          const result = await reprocessDocumentsWithoutText();
          if (result.queued > 0) {
            console.log(`[OCR Startup] Re-queued ${result.queued} documents that had no text extracted`);
          }
        } catch (error) {
          console.error("[OCR Startup] Error re-processing documents:", error);
        }
      }, 15000); // 15 second delay after initial processing starts
      
    } catch (error) {
      console.error("[OCR Startup] Error processing pending documents:", error);
    }
  }, 10000); // 10 second delay to ensure server is fully initialized
}
