import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const CHUNK_SIZE = 4000;
const MAX_CHUNKS_PER_PASS = 5;
const MAX_SUMMARY_TOKENS = 8000;
const RATE_LIMIT_CONCURRENCY = 3;
const DELAY_BETWEEN_BATCHES_MS = 1000;

const rateLimiter = pLimit(RATE_LIMIT_CONCURRENCY);

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ChunkSummary {
  chunkIndex: number;
  startChar: number;
  endChar: number;
  summary: string;
}

export interface HierarchicalSummaryResult {
  comprehensiveSummary: string;
  chunkSummaries: ChunkSummary[];
  totalChunks: number;
  totalCharacters: number;
  processingPasses: number;
}

function splitIntoChunks(text: string, chunkSize: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.7) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  
  return chunks.filter(c => c.length > 50);
}

async function summarizeChunk(chunk: string, chunkIndex: number, totalChunks: number, fileName: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `You are analyzing document "${fileName}" (chunk ${chunkIndex + 1} of ${totalChunks}).

Extract and summarize the KEY INFORMATION from this section. Focus on:
- Specific facts, figures, values, dates, and names
- Key terms, conditions, or requirements
- Important findings, conclusions, or risks
- Any dollar amounts, percentages, or metrics

Be concise but include ALL important data points. Do not use generic language.

CONTENT:
${chunk}`
        }]
      }]
    });
    
    if ((response as any).text) {
      return (response as any).text.trim();
    }
    
    if ((response as any).candidates?.length) {
      const parts = (response as any).candidates[0]?.content?.parts ?? [];
      return parts.map((p: any) => p.text || '').join('\n').trim();
    }
    
    return `[Chunk ${chunkIndex + 1}]: Unable to summarize`;
  } catch (error: any) {
    console.error(`Failed to summarize chunk ${chunkIndex}:`, error.message);
    return `[Chunk ${chunkIndex + 1}]: Summarization failed - ${error.message}`;
  }
}

async function aggregateSummaries(summaries: string[], fileName: string): Promise<string> {
  const combinedText = summaries.join('\n\n---\n\n');
  
  if (combinedText.length < MAX_SUMMARY_TOKENS * 4) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `Create a comprehensive summary of the document "${fileName}" by synthesizing these section summaries.

REQUIREMENTS:
1. Preserve ALL specific data points: dollar amounts, dates, names, percentages, key terms
2. Organize by topic/theme rather than section order
3. Highlight key findings, risks, and important conclusions
4. Include specific citations where possible (e.g., "Section 3.2 states...")
5. Do NOT use vague language - be specific and data-driven

SECTION SUMMARIES:
${combinedText}`
          }]
        }]
      });
      
      if ((response as any).text) {
        return (response as any).text.trim();
      }
      
      if ((response as any).candidates?.length) {
        const parts = (response as any).candidates[0]?.content?.parts ?? [];
        return parts.map((p: any) => p.text || '').join('\n').trim();
      }
    } catch (error: any) {
      console.error('Failed to aggregate summaries:', error.message);
    }
  }
  
  return combinedText;
}

export async function generateHierarchicalSummary(
  text: string, 
  fileName: string
): Promise<HierarchicalSummaryResult> {
  if (!text || text.trim().length < 100) {
    return {
      comprehensiveSummary: 'Document contains insufficient text for analysis.',
      chunkSummaries: [],
      totalChunks: 0,
      totalCharacters: text?.length || 0,
      processingPasses: 0,
    };
  }

  console.log(`[HierarchicalSummary] Processing "${fileName}" (${text.length} chars)`);
  
  const chunks = splitIntoChunks(text, CHUNK_SIZE);
  console.log(`[HierarchicalSummary] Split into ${chunks.length} chunks`);
  
  if (chunks.length <= 1) {
    const summary = await summarizeChunk(text.slice(0, 8000), 0, 1, fileName);
    return {
      comprehensiveSummary: summary,
      chunkSummaries: [{
        chunkIndex: 0,
        startChar: 0,
        endChar: text.length,
        summary,
      }],
      totalChunks: 1,
      totalCharacters: text.length,
      processingPasses: 1,
    };
  }
  
  const chunkSummaries: ChunkSummary[] = [];
  let currentPosition = 0;
  let passes = 0;
  
  for (let i = 0; i < chunks.length; i += MAX_CHUNKS_PER_PASS) {
    const batch = chunks.slice(i, i + MAX_CHUNKS_PER_PASS);
    passes++;
    
    console.log(`[HierarchicalSummary] Processing batch ${passes} (chunks ${i + 1}-${i + batch.length} of ${chunks.length})`);
    
    const batchPromises = batch.map((chunk, batchIndex) => 
      rateLimiter(() => summarizeChunk(chunk, i + batchIndex, chunks.length, fileName))
    );
    
    const batchSummaries = await Promise.all(batchPromises);
    
    for (let j = 0; j < batch.length; j++) {
      const startChar = currentPosition;
      currentPosition += batch[j].length;
      
      chunkSummaries.push({
        chunkIndex: i + j,
        startChar,
        endChar: currentPosition,
        summary: batchSummaries[j],
      });
    }
    
    if (i + MAX_CHUNKS_PER_PASS < chunks.length) {
      await delay(DELAY_BETWEEN_BATCHES_MS);
    }
  }
  
  console.log(`[HierarchicalSummary] Aggregating ${chunkSummaries.length} chunk summaries`);
  
  let allSummaries = chunkSummaries.map(cs => cs.summary);
  
  while (allSummaries.join('\n').length > MAX_SUMMARY_TOKENS * 4 && allSummaries.length > 1) {
    passes++;
    console.log(`[HierarchicalSummary] Reduction pass ${passes}: ${allSummaries.length} summaries`);
    
    const reducedSummaries: string[] = [];
    for (let i = 0; i < allSummaries.length; i += 3) {
      const group = allSummaries.slice(i, i + 3);
      const groupText = group.join('\n\n');
      
      if (group.length > 1) {
        const reduced = await summarizeChunk(groupText, Math.floor(i / 3), Math.ceil(allSummaries.length / 3), fileName);
        reducedSummaries.push(reduced);
      } else {
        reducedSummaries.push(group[0]);
      }
    }
    
    allSummaries = reducedSummaries;
  }
  
  const comprehensiveSummary = await aggregateSummaries(allSummaries, fileName);
  
  console.log(`[HierarchicalSummary] Complete: ${comprehensiveSummary.length} chars, ${passes} passes`);
  
  return {
    comprehensiveSummary,
    chunkSummaries,
    totalChunks: chunks.length,
    totalCharacters: text.length,
    processingPasses: passes,
  };
}

export async function generateQuickSummary(text: string, fileName: string): Promise<string | null> {
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
    
    if ((response as any).text) {
      return (response as any).text.trim() || null;
    }
    
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
    console.error("Failed to generate quick summary:", error.message);
    return null;
  }
}
