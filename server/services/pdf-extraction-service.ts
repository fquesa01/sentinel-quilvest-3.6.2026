// Use the legacy build for Node.js compatibility (no DOMMatrix, etc.)
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";

// Disable worker in Node.js
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

interface ExtractionResult {
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return "str" in item;
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const uint8Array = new Uint8Array(buffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      standardFontDataUrl: undefined,
    });
    
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    
    let fullText = "";
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent({
        includeMarkedContent: false,
      });
      
      let lastY: number | null = null;
      let pageText = "";
      
      for (const item of textContent.items) {
        if (isTextItem(item)) {
          const str = item.str;
          const transform = item.transform;
          const currentY = transform ? transform[5] : null;
          
          if (lastY !== null && currentY !== null) {
            const yDiff = Math.abs(currentY - lastY);
            if (yDiff > 5) {
              pageText += "\n";
            } else if (str && !pageText.endsWith(" ") && !str.startsWith(" ")) {
              pageText += " ";
            }
          }
          
          pageText += str;
          if (currentY !== null) {
            lastY = currentY;
          }
        }
      }
      
      if (pageText.trim()) {
        fullText += pageText.trim() + "\n\n";
      }
    }
    
    let metadata: ExtractionResult["metadata"];
    try {
      const pdfMetadata = await pdfDocument.getMetadata();
      const info = pdfMetadata.info as Record<string, unknown>;
      metadata = {
        title: typeof info?.Title === "string" ? info.Title : undefined,
        author: typeof info?.Author === "string" ? info.Author : undefined,
        subject: typeof info?.Subject === "string" ? info.Subject : undefined,
      };
    } catch (metaError) {
      console.log("[PDFExtraction] Could not extract metadata:", metaError);
    }
    
    return {
      text: fullText.trim(),
      pageCount,
      metadata,
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
