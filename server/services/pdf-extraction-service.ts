// Use pdf-parse which handles Node.js PDF extraction without worker issues
// @ts-ignore - pdf-parse doesn't have type definitions
import pdfParse from "pdf-parse";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

interface ExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const data = await pdfParse(buffer);
    
    return {
      text: data.text?.trim() || "",
      pageCount: data.numpages || 0,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
      },
    };
  } catch (error) {
    console.error("[PDFExtraction] Error extracting PDF text:", error);
    throw error;
  }
}

async function performGeminiOCR(buffer: Buffer): Promise<string> {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      console.log("[PDFExtraction] No GOOGLE_API_KEY for OCR");
      return "";
    }
    
    console.log("[PDFExtraction] Starting Gemini OCR for scanned PDF...");
    const base64Data = buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          {
            text: `Extract ALL text from this PDF document. This appears to be a scanned legal document. 
Perform OCR to extract all visible text including:
- All paragraphs and numbered sections
- Party names, dates, and case information
- Any headers, footers, or captions
- Legal claims and causes of action

Return the full extracted text, preserving paragraph structure. Do NOT summarize - extract the actual text.`
          },
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data,
            }
          }
        ]
      }],
      config: {
        maxOutputTokens: 8192,
      }
    });
    
    const text = (response as any).text?.trim() || "";
    console.log(`[PDFExtraction] Gemini OCR extracted ${text.length} chars`);
    return text;
  } catch (error: any) {
    console.error("[PDFExtraction] Gemini OCR failed:", error.message);
    return "";
  }
}

export async function extractPdfTextWithFallback(buffer: Buffer): Promise<string> {
  let pageCount = 0;
  
  try {
    const result = await extractPdfText(buffer);
    pageCount = result.pageCount;
    
    // Calculate chars per page to detect scanned PDFs
    const charsPerPage = pageCount > 0 ? result.text.length / pageCount : 0;
    
    if (result.text && result.text.length > 100 && charsPerPage > 200) {
      console.log(`[PDFExtraction] Successfully extracted ${result.text.length} chars from ${pageCount} pages (${Math.round(charsPerPage)} chars/page)`);
      return result.text;
    }
    
    // Low text yield - likely a scanned PDF, try OCR
    console.log(`[PDFExtraction] Low text yield (${result.text.length} chars from ${pageCount} pages, ${Math.round(charsPerPage)} chars/page) - trying OCR`);
    
    const ocrText = await performGeminiOCR(buffer);
    if (ocrText && ocrText.length > result.text.length) {
      console.log(`[PDFExtraction] OCR improved extraction: ${result.text.length} -> ${ocrText.length} chars`);
      return ocrText;
    }
    
    return result.text || ocrText || "";
    
  } catch (error) {
    console.error("[PDFExtraction] Primary extraction failed:", error);
    
    // Try OCR as last resort
    const ocrText = await performGeminiOCR(buffer);
    if (ocrText) {
      console.log(`[PDFExtraction] Fallback OCR extracted ${ocrText.length} chars`);
      return ocrText;
    }
    
    return "";
  }
}
