// Use pdf-parse which handles Node.js PDF extraction without worker issues
// @ts-ignore - pdf-parse doesn't have type definitions
import pdfParse from "pdf-parse";

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

export async function extractPdfTextWithFallback(buffer: Buffer): Promise<string> {
  try {
    const result = await extractPdfText(buffer);
    
    if (result.text && result.text.length > 100) {
      console.log(`[PDFExtraction] Successfully extracted ${result.text.length} chars from ${result.pageCount} pages`);
      return result.text;
    }
    
    console.log(`[PDFExtraction] Low text yield (${result.text.length} chars), PDF may be image-based`);
    return result.text || "";
    
  } catch (error) {
    console.error("[PDFExtraction] Primary extraction failed:", error);
    return "";
  }
}
