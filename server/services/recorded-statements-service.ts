import Anthropic from "@anthropic-ai/sdk";
import { transcribeAudioFile } from "../elevenlabs";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { indexDocument } from "./document-indexing-service";
import { ObjectStorageService } from "../objectStorage";
import { GoogleGenAI } from "@google/genai";
import { triggerCaseSummaryUpdate } from "./case-summary-auto-update-service";

const anthropic = new Anthropic();
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v1.x exports a function as default
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const text = data.text.trim();
    
    if (text.length > 100) {
      console.log(`[RecordedStatements] Extracted ${text.length} characters from PDF using pdf-parse`);
      return text;
    }
    
    console.log(`[RecordedStatements] PDF text extraction yielded minimal text (${text.length} chars), trying Gemini OCR`);
    return await extractTextWithGeminiOCR(buffer);
  } catch (error: any) {
    console.error("[RecordedStatements] PDF-parse extraction failed:", error.message);
    return await extractTextWithGeminiOCR(buffer);
  }
}

async function extractTextWithGeminiOCR(buffer: Buffer): Promise<string> {
  try {
    const base64Data = buffer.toString("base64");
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            }
          },
          {
            text: `Extract ALL text from this PDF document. 
Include every word, paragraph, and section.
Preserve the document structure as much as possible.
If this is a transcript, include speaker names and timestamps.
Return ONLY the extracted text, no commentary.`
          }
        ]
      }]
    });
    
    let extractedText = "";
    if ((response as any).text) {
      extractedText = (response as any).text;
    } else if ((response as any).candidates?.length) {
      for (const candidate of (response as any).candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof (part as any).text === "string") {
            extractedText += (part as any).text;
          }
        }
      }
    }
    
    console.log(`[RecordedStatements] Extracted ${extractedText.length} characters from PDF using Gemini OCR`);
    return extractedText.trim();
  } catch (error: any) {
    console.error("[RecordedStatements] Gemini OCR extraction failed:", error.message);
    return "";
  }
}

export async function extractTextFromStoredPDF(storagePath: string): Promise<string> {
  try {
    const storageService = new ObjectStorageService();
    const buffer = await storageService.downloadAsBuffer(storagePath);
    return await extractTextFromPDF(buffer);
  } catch (error: any) {
    console.error("[RecordedStatements] Failed to download PDF from storage:", error.message);
    return "";
  }
}

async function indexStatementToRAG(
  statement: typeof schema.recordedStatements.$inferSelect,
  transcriptText: string
): Promise<void> {
  if (!statement.caseId) {
    console.log(`[RecordedStatements] Skipping RAG indexing - no case ID for statement ${statement.id}`);
    return;
  }

  try {
    console.log(`[RecordedStatements] Indexing transcript to RAG for statement ${statement.id}`);

    const content = `
RECORDED STATEMENT TRANSCRIPT
=============================
Title: ${statement.title}
Speaker: ${statement.speakerName}${statement.speakerRole ? ` (${statement.speakerRole})` : ''}
Type: ${statement.statementType || 'Interview'}
${statement.statementDate ? `Date: ${new Date(statement.statementDate).toLocaleDateString()}` : ''}
${statement.location ? `Location: ${statement.location}` : ''}
${statement.interviewerName ? `Interviewer: ${statement.interviewerName}` : ''}

TRANSCRIPT:
${transcriptText}

${statement.aiSummary ? `\nAI SUMMARY:\n${statement.aiSummary}` : ''}
`.trim();

    await indexDocument({
      caseId: statement.caseId,
      documentId: `recorded-statement-${statement.id}`,
      content: Buffer.from(content, 'utf-8'),
      fileName: `${statement.title.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`,
      displayName: `${statement.title} - ${statement.speakerName} (${statement.statementType || 'Statement'})`,
      metadata: {
        documentType: 'recorded_statement_transcript',
        subject: statement.title,
        from: statement.speakerName,
        date: statement.statementDate ? new Date(statement.statementDate).toISOString() : undefined,
      },
    });

    console.log(`[RecordedStatements] Successfully indexed statement ${statement.id} to RAG`);
  } catch (error) {
    console.error(`[RecordedStatements] RAG indexing failed for statement ${statement.id}:`, error);
  }
}

interface CredibilityAnalysis {
  overallScore: number;
  breakdown: {
    consistency: { score: number; notes: string };
    specificity: { score: number; notes: string };
    emotionalCues: { score: number; notes: string };
    logicalCoherence: { score: number; notes: string };
  };
  redFlags: string[];
  strengths: string[];
  recommendations: string[];
}

interface KeyMoment {
  timestampSeconds: number;
  description: string;
  importance: "high" | "medium" | "low";
  category: string;
}

export async function transcribeRecordedStatement(
  statementId: string,
  audioBuffer: Buffer,
  options: { mimeType?: string; filename?: string } = {}
): Promise<{ fullText: string; segments: any[] }> {
  console.log(`[RecordedStatements] Starting transcription for statement ${statementId}`);
  
  await db
    .update(schema.recordedStatements)
    .set({ transcriptionStatus: "processing", updatedAt: new Date() })
    .where(eq(schema.recordedStatements.id, statementId));

  try {
    const result = await transcribeAudioFile(audioBuffer, {
      mimeType: options.mimeType || "audio/mp4",
      filename: options.filename || "recording.mp4",
    });

    await db
      .update(schema.recordedStatements)
      .set({
        transcriptText: result.fullText,
        transcriptSegments: result.segments,
        transcriptionStatus: "completed",
        transcriptionMetadata: {
          duration: result.duration,
          model: "elevenlabs-scribe-v1",
          segmentCount: result.segments.length,
          processedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.recordedStatements.id, statementId));

    console.log(`[RecordedStatements] Transcription completed for ${statementId}`);
    return { fullText: result.fullText, segments: result.segments };
  } catch (error) {
    console.error(`[RecordedStatements] Transcription failed for ${statementId}:`, error);
    await db
      .update(schema.recordedStatements)
      .set({ transcriptionStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.recordedStatements.id, statementId));
    throw error;
  }
}

export async function generateAITitle(
  statementId: string,
  transcriptText: string,
  currentTitle: string | null | undefined
): Promise<string> {
  // Handle null/undefined titles
  const safeTitle = currentTitle || "";
  
  // Only generate if title is auto-generated (from filename or default)
  const isDefaultTitle = safeTitle.startsWith("Statement ") || 
    safeTitle.toLowerCase().includes("unknown") ||
    safeTitle === "Unknown" ||
    safeTitle === "";
  
  // Skip if user provided a meaningful title
  if (!isDefaultTitle && safeTitle.length > 5) {
    console.log(`[RecordedStatements] Skipping AI title generation - user provided title: ${safeTitle}`);
    return safeTitle;
  }

  console.log(`[RecordedStatements] Generating AI title for statement ${statementId}`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze this document and create a short, descriptive title (5-10 words max).

The title should capture:
- The type of document (deposition, interview, testimony, etc.)
- The main subject or party involved
- Any key identifying information (case name, date, topic)

DOCUMENT EXCERPT (first 5000 characters):
${transcriptText.slice(0, 5000)}

Respond with ONLY the title, no quotes or extra formatting.`
        }]
      }]
    });

    let newTitle = "";
    if ((response as any).text) {
      newTitle = (response as any).text.trim();
    } else if ((response as any).candidates?.length) {
      for (const candidate of (response as any).candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof (part as any).text === "string") {
            newTitle = (part as any).text.trim();
            break;
          }
        }
      }
    }

    // Clean up the title - remove quotes, limit length
    newTitle = newTitle.replace(/^["']|["']$/g, "").slice(0, 100);
    
    if (newTitle && newTitle.length > 3) {
      await db
        .update(schema.recordedStatements)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(schema.recordedStatements.id, statementId));
      
      console.log(`[RecordedStatements] AI title generated: ${newTitle}`);
      return newTitle;
    }
    
    return currentTitle || "";
  } catch (error: any) {
    console.error(`[RecordedStatements] AI title generation failed:`, error.message);
    return currentTitle || "";
  }
}

export async function extractDocumentDate(
  statementId: string,
  transcriptText: string,
  currentDate: Date | string | null | undefined
): Promise<Date | null> {
  // If user already provided a date, keep it
  if (currentDate) {
    console.log(`[RecordedStatements] Using user-provided date for statement ${statementId}`);
    return currentDate instanceof Date ? currentDate : new Date(currentDate);
  }

  console.log(`[RecordedStatements] Extracting document date for statement ${statementId}`);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze this legal document and find the PRIMARY date that this document is from or refers to.

Look for:
- Dates in document headers (e.g., "January 31, 2014" in a court transcript)
- Deposition dates, interview dates, recording dates
- "Commencing on" or "taken on" dates
- Court proceeding dates

IMPORTANT: Extract the date when the event (deposition, interview, testimony, etc.) took place, NOT when the document was filed or processed later.

DOCUMENT EXCERPT (first 3000 characters):
${transcriptText.slice(0, 3000)}

Respond with ONLY the date in ISO format (YYYY-MM-DD), or "NONE" if no clear date is found.
Example responses: 2014-01-31, 2019-07-15, NONE`
        }]
      }]
    });

    let extractedDate = "";
    if ((response as any).text) {
      extractedDate = (response as any).text.trim();
    } else if ((response as any).candidates?.length) {
      for (const candidate of (response as any).candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
          if (typeof (part as any).text === "string") {
            extractedDate = (part as any).text.trim();
            break;
          }
        }
      }
    }

    // Check for NONE response before parsing
    if (!extractedDate || extractedDate.toUpperCase().includes("NONE")) {
      console.log(`[RecordedStatements] No valid date found in document for ${statementId}`);
      return null;
    }
    
    // Try multiple date parsing strategies
    let parsedDate: Date | null = null;
    
    // Strategy 1: Try ISO format (YYYY-MM-DD)
    const isoMatch = extractedDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      parsedDate = new Date(isoMatch[0]);
    }
    
    // Strategy 2: Try natural language date parsing (e.g., "January 31, 2014")
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      const naturalDate = new Date(extractedDate);
      if (!isNaN(naturalDate.getTime())) {
        parsedDate = naturalDate;
      }
    }
    
    // Strategy 3: Try to extract date components from text
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const lowerText = extractedDate.toLowerCase();
      const monthMatch = monthNames.findIndex(m => lowerText.includes(m));
      const yearMatch = extractedDate.match(/\b(19|20)\d{2}\b/);
      const dayMatch = extractedDate.match(/\b(\d{1,2})\b/);
      
      if (monthMatch >= 0 && yearMatch && dayMatch) {
        const year = parseInt(yearMatch[0]);
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          parsedDate = new Date(year, monthMatch, day);
        }
      }
    }
    
    // Validate the parsed date is reasonable (not in the future, not too old)
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const now = new Date();
      const minDate = new Date("1900-01-01");
      
      if (parsedDate <= now && parsedDate >= minDate) {
        await db
          .update(schema.recordedStatements)
          .set({ statementDate: parsedDate, updatedAt: new Date() })
          .where(eq(schema.recordedStatements.id, statementId));
        
        console.log(`[RecordedStatements] AI extracted document date: ${parsedDate.toISOString().split('T')[0]}`);
        return parsedDate;
      }
    }
    
    console.log(`[RecordedStatements] No valid date extracted for ${statementId}`);
    return null;
  } catch (error: any) {
    console.error(`[RecordedStatements] Document date extraction failed:`, error.message);
    return null;
  }
}

export async function generateStatementSummary(
  statementId: string,
  transcriptText: string,
  metadata: { speakerName: string; statementType: string; title: string }
): Promise<string> {
  console.log(`[RecordedStatements] Generating summary for statement ${statementId}`);

  const prompt = `You are analyzing a ${metadata.statementType} transcript from ${metadata.speakerName}.

Title: ${metadata.title}

TRANSCRIPT:
${transcriptText.slice(0, 15000)}

Please provide a comprehensive summary of this statement that includes:
1. Key claims and assertions made by the speaker
2. Timeline of events mentioned
3. Names and entities referenced
4. Any admissions, denials, or qualifications
5. Notable quotes (with approximate position in transcript)

Format your response as a structured summary suitable for legal review.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const summary = response.content[0].type === "text" ? response.content[0].text : "";

  await db
    .update(schema.recordedStatements)
    .set({ aiSummary: summary, updatedAt: new Date() })
    .where(eq(schema.recordedStatements.id, statementId));

  console.log(`[RecordedStatements] Summary generated for ${statementId}`);
  return summary;
}

export async function analyzeCredibility(
  statementId: string,
  transcriptText: string,
  metadata: { speakerName: string; statementType: string }
): Promise<CredibilityAnalysis> {
  console.log(`[RecordedStatements] Analyzing credibility for statement ${statementId}`);

  await db
    .update(schema.recordedStatements)
    .set({ analysisStatus: "processing", updatedAt: new Date() })
    .where(eq(schema.recordedStatements.id, statementId));

  const prompt = `You are an expert witness credibility analyst. Analyze the following ${metadata.statementType} transcript from ${metadata.speakerName}.

TRANSCRIPT:
${transcriptText.slice(0, 15000)}

Evaluate the statement's credibility across these dimensions:
1. CONSISTENCY - Internal consistency of the narrative
2. SPECIFICITY - Level of detail and precision in recollections
3. EMOTIONAL CUES - Appropriate emotional responses and language patterns
4. LOGICAL COHERENCE - Whether the account makes logical sense

For each dimension, provide:
- A score from 0-100
- Brief notes explaining the score

Also identify:
- RED FLAGS: Concerning elements that may indicate deception or unreliability
- STRENGTHS: Elements that support credibility
- RECOMMENDATIONS: Suggested follow-up questions or areas to investigate

Respond in JSON format:
{
  "overallScore": number,
  "breakdown": {
    "consistency": { "score": number, "notes": "string" },
    "specificity": { "score": number, "notes": "string" },
    "emotionalCues": { "score": number, "notes": "string" },
    "logicalCoherence": { "score": number, "notes": "string" }
  },
  "redFlags": ["string"],
  "strengths": ["string"],
  "recommendations": ["string"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const analysis: CredibilityAnalysis = jsonMatch 
      ? JSON.parse(jsonMatch[0])
      : { overallScore: 50, breakdown: {}, redFlags: [], strengths: [], recommendations: [] };

    await db
      .update(schema.recordedStatements)
      .set({
        credibilityStatus: "completed",
        credibilityScore: analysis.overallScore,
        credibilityAnalysis: analysis.breakdown,
        redFlags: analysis.redFlags,
        updatedAt: new Date(),
      })
      .where(eq(schema.recordedStatements.id, statementId));

    console.log(`[RecordedStatements] Credibility analysis completed for ${statementId}`);
    return analysis;
  } catch (error) {
    console.error(`[RecordedStatements] Credibility analysis failed:`, error);
    await db
      .update(schema.recordedStatements)
      .set({ credibilityStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.recordedStatements.id, statementId));
    throw error;
  }
}

export async function extractKeyMoments(
  statementId: string,
  transcriptText: string,
  segments: any[]
): Promise<KeyMoment[]> {
  console.log(`[RecordedStatements] Extracting key moments for statement ${statementId}`);

  const prompt = `Analyze this transcript and identify the KEY MOMENTS - pivotal statements, admissions, contradictions, or important claims.

TRANSCRIPT:
${transcriptText.slice(0, 15000)}

For each key moment, provide:
1. Approximate position (as a percentage through the transcript, 0-100)
2. Brief description of what was said/admitted
3. Importance level: "high", "medium", or "low"
4. Category: "admission", "denial", "claim", "contradiction", "emotional", "evasion", or "clarification"

Respond in JSON format:
{
  "keyMoments": [
    {
      "position": number,
      "description": "string",
      "importance": "high" | "medium" | "low",
      "category": "string"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { keyMoments: [] };

    const totalDuration = segments.length > 0 
      ? Math.max(...segments.map((s: any) => s.timestampMs || 0)) / 1000
      : 0;

    const keyMoments: KeyMoment[] = parsed.keyMoments.map((m: any) => ({
      timestampSeconds: Math.round((m.position / 100) * totalDuration),
      description: m.description,
      importance: m.importance,
      category: m.category,
    }));

    await db
      .update(schema.recordedStatements)
      .set({ keyMoments, updatedAt: new Date() })
      .where(eq(schema.recordedStatements.id, statementId));

    console.log(`[RecordedStatements] Extracted ${keyMoments.length} key moments for ${statementId}`);
    return keyMoments;
  } catch (error) {
    console.error(`[RecordedStatements] Key moment extraction failed:`, error);
    return [];
  }
}

export async function processUploadedStatement(
  statementId: string,
  audioBuffer: Buffer | null,
  transcriptText: string | null,
  options: { mimeType?: string; filename?: string } = {}
): Promise<void> {
  console.log(`[RecordedStatements] Processing statement ${statementId}`);

  try {
    const [statement] = await db
      .select()
      .from(schema.recordedStatements)
      .where(eq(schema.recordedStatements.id, statementId))
      .limit(1);

    if (!statement) {
      throw new Error(`Statement ${statementId} not found`);
    }

    await db
      .update(schema.recordedStatements)
      .set({ analysisStatus: "processing", updatedAt: new Date() })
      .where(eq(schema.recordedStatements.id, statementId));

    let finalTranscript = transcriptText;
    let segments: any[] = [];

    if (!finalTranscript && audioBuffer) {
      const transcriptionResult = await transcribeRecordedStatement(
        statementId,
        audioBuffer,
        options
      );
      finalTranscript = transcriptionResult.fullText;
      segments = transcriptionResult.segments;
    } else if (finalTranscript) {
      await db
        .update(schema.recordedStatements)
        .set({
          transcriptText: finalTranscript,
          transcriptionStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(schema.recordedStatements.id, statementId));
    }

    if (finalTranscript && finalTranscript.length > 100) {
      // Generate AI title and extract document date (both run quickly)
      const [generatedTitle] = await Promise.all([
        generateAITitle(statementId, finalTranscript, statement.title),
        extractDocumentDate(statementId, finalTranscript, statement.statementDate),
      ]);
      
      const analysisResults = await Promise.allSettled([
        generateStatementSummary(statementId, finalTranscript, {
          speakerName: statement.speakerName,
          statementType: statement.statementType || "interview",
          title: generatedTitle, // Use AI-generated title if available
        }),
        analyzeCredibility(statementId, finalTranscript, {
          speakerName: statement.speakerName,
          statementType: statement.statementType || "interview",
        }),
        extractKeyMoments(statementId, finalTranscript, segments),
      ]);

      const failedCount = analysisResults.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        console.warn(`[RecordedStatements] ${failedCount}/3 analysis tasks failed for ${statementId}`);
      }

      const [updatedStatement] = await db
        .update(schema.recordedStatements)
        .set({ 
          isIndexed: true, 
          indexedAt: new Date(), 
          updatedAt: new Date(), 
          analysisStatus: failedCount === 3 ? "failed" : "completed" 
        })
        .where(eq(schema.recordedStatements.id, statementId))
        .returning();

      if (updatedStatement && updatedStatement.caseId) {
        await indexStatementToRAG(updatedStatement, finalTranscript);
        
        // Trigger auto-update of case summary with new recording evidence
        triggerCaseSummaryUpdate(updatedStatement.caseId, "recording").catch((error) => {
          console.warn(`[RecordedStatements] Case summary auto-update failed for case ${updatedStatement.caseId}:`, error.message);
        });
      } else if (!statement.caseId) {
        console.warn(`[RecordedStatements] Skipping RAG indexing - statement ${statementId} has no caseId`);
      }
    } else {
      await db
        .update(schema.recordedStatements)
        .set({ analysisStatus: "completed", updatedAt: new Date() })
        .where(eq(schema.recordedStatements.id, statementId));
    }

    console.log(`[RecordedStatements] Processing completed for ${statementId}`);
  } catch (error) {
    console.error(`[RecordedStatements] Processing failed for ${statementId}:`, error);
    await db
      .update(schema.recordedStatements)
      .set({ analysisStatus: "failed", updatedAt: new Date() })
      .where(eq(schema.recordedStatements.id, statementId));
    throw error;
  }
}
