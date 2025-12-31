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
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text.trim();
  } catch (error: any) {
    console.error("PDF-parse extraction failed:", error.message);
    return '';
  }
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
    const nonOcrTypes = ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'md'];
    
    if (nonOcrTypes.some(t => fileType.includes(t))) {
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
    if (extractedText && extractedText.trim().length >= 50) {
      aiSummary = await generateDocumentSummary(extractedText, doc.fileName);
    }

    await db.update(dataRoomDocuments)
      .set({ 
        extractedText: extractedText || doc.extractedText,
        aiSummary,
        ocrStatus: "completed",
        ocrProcessedAt: new Date(),
        documentDate,
        documentDateSource,
      })
      .where(eq(dataRoomDocuments.id, documentId));

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
