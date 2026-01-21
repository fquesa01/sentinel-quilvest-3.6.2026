// Use pdf-parse which handles Node.js PDF extraction without worker issues
// @ts-ignore - pdf-parse doesn't have type definitions
import pdfParse from "pdf-parse";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

/**
 * Detects if extracted text appears to be garbled due to custom font encoding.
 * Some PDFs (especially e-filed court documents) use custom font mappings where
 * character codes don't match Unicode, resulting in text that looks like:
 * "!"#$%&#'!(')!$#'*)($#+*(#$%&#&,&-&"$%#" or "&345675882"
 * 
 * This function uses multiple heuristics to detect such garbled text.
 */
function isGarbledText(text: string): boolean {
  if (!text || text.length < 100) return false;
  
  // Take a sample of the text (first 3000 chars or less)
  const sample = text.slice(0, 3000);
  
  // Count different character types
  const letters = (sample.match(/[a-zA-Z]/g) || []).length;
  const digits = (sample.match(/[0-9]/g) || []).length;
  const spaces = (sample.match(/\s/g) || []).length;
  const specialChars = (sample.match(/[#$%^&@*<>{}|\\~`!'"();:,.\-+=\[\]]/g) || []).length;
  const totalChars = sample.length;
  
  // Calculate ratios
  const letterRatio = letters / totalChars;
  const digitRatio = digits / totalChars;
  const specialRatio = specialChars / totalChars;
  const alphanumericRatio = (letters + digits) / totalChars;
  
  // Heuristic 1: Very high special character ratio (> 15% is suspicious for legal text)
  // Normal legal text has ~5-10% punctuation, encoded PDFs have 20-40%
  const highSpecialChars = specialRatio > 0.15;
  
  // Heuristic 2: Check for common English words
  // Garbled text won't have recognizable words
  const commonWords = ['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'from', 'have', 
                       'has', 'been', 'will', 'shall', 'not', 'any', 'all', 'such', 'which', 'upon'];
  const lowerSample = sample.toLowerCase();
  let wordMatches = 0;
  for (const word of commonWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    wordMatches += (lowerSample.match(regex) || []).length;
  }
  // Expect at least 1 common word per 200 chars in normal English text
  const expectedWords = totalChars / 200;
  const lowWordCount = wordMatches < expectedWords * 0.3;
  
  // Heuristic 3: Check for typical encoding artifacts
  // Patterns like "#$%&" or single special chars between alphanumerics
  const encodingArtifacts = (sample.match(/[A-Za-z0-9][#$%^&*@!'"(){}\[\]<>][A-Za-z0-9]/g) || []).length;
  const artifactRatio = encodingArtifacts / (totalChars / 100);
  const highArtifacts = artifactRatio > 1.5;
  
  // Heuristic 4: Look for consecutive special characters (not in quotes or parentheses)
  const consecutiveSpecial = (sample.match(/[#$%^&*@!]{2,}/g) || []).length;
  const hasConsecutiveSpecial = consecutiveSpecial > 3;
  
  // Heuristic 5: Low letter ratio - encoded PDFs often have < 50% letters
  // Normal English text is typically 70-85% letters
  const lowLetterRatio = letterRatio < 0.45;
  
  // Heuristic 6: Unusual digit distribution - digits embedded in "words"
  // Pattern like "345675882" appearing as word fragments
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
    console.log(`[PDFExtraction] Garble check: letterRatio=${letterRatio.toFixed(2)}, specialRatio=${specialRatio.toFixed(2)}, wordMatches=${wordMatches}/${Math.round(expectedWords)}, artifactRatio=${artifactRatio.toFixed(2)}, score=${garbleScore}, isGarbled=${isGarbled}`);
  }
  
  return isGarbled;
}

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
        maxOutputTokens: 32768,
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
    
    // Check if extracted text appears garbled (custom font encoding issue)
    const textIsGarbled = isGarbledText(result.text);
    
    if (textIsGarbled) {
      console.log(`[PDFExtraction] Detected garbled text from custom font encoding - using Gemini OCR`);
      const ocrText = await performGeminiOCR(buffer);
      if (ocrText && ocrText.length > 100) {
        console.log(`[PDFExtraction] Gemini OCR fixed garbled text: ${ocrText.length} chars extracted`);
        return ocrText;
      }
      // If OCR also failed, return original text as last resort
      console.log(`[PDFExtraction] Gemini OCR didn't help, returning original garbled text`);
      return result.text;
    }
    
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
