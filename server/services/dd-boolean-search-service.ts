import { db } from "../db";
import { 
  ddBooleanQueries, 
  ddDealQueries, 
  ddAnalysisRuns, 
  ddSectionResults, 
  ddDocumentMatches,
  ddChecklistSections,
  dataRoomDocuments,
  communications,
  courtPleadings,
  peDealDocuments,
  users
} from "@shared/schema";
import { eq, and, or, ilike, sql, desc, inArray } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "" });

interface ParsedQuery {
  terms: string[];
  andGroups: string[][];
  orGroups: string[][];
  notTerms: string[];
  originalQuery: string;
}

interface DocumentSearchResult {
  id: string;
  source: "data_room" | "case_evidence" | "transaction_folder" | "court_pleading" | "communication";
  title: string;
  path?: string;
  content?: string;
  matchedTerms: string[];
  matchedExcerpts: { text: string; page?: number; location?: string }[];
  relevanceScore: number;
  metadata?: any;
}

interface SectionAnalysisResult {
  sectionId: string;
  sectionName: string;
  documentsMatched: number;
  documentsAnalyzed: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  summary: string;
  keyFindings: { finding: string; severity: string; documentRefs: string[]; pageRefs?: string[] }[];
  riskFlags: { flag: string; severity: string; evidence: string; documentRef?: string }[];
  recommendations: { recommendation: string; priority: string; rationale?: string }[];
  matchedDocuments: DocumentSearchResult[];
}

export class DDBooleanSearchService {
  
  parseBoolean(query: string): ParsedQuery {
    const result: ParsedQuery = {
      terms: [],
      andGroups: [],
      orGroups: [],
      notTerms: [],
      originalQuery: query
    };

    let workingQuery = query.trim();
    
    const notWithParenMatches = workingQuery.match(/NOT\s*\([^)]+\)/gi) || [];
    for (const match of notWithParenMatches) {
      const innerTerms = match.replace(/NOT\s*\(/i, '').replace(/\)$/, '').trim();
      const terms = innerTerms.split(/\s+OR\s+/i).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
      result.notTerms.push(...terms);
      workingQuery = workingQuery.replace(match, ' ');
    }
    
    const notWordMatches = workingQuery.match(/NOT\s+(\w+)/gi) || [];
    for (const match of notWordMatches) {
      const term = match.replace(/NOT\s+/i, '').trim().toLowerCase();
      if (term.length > 0) {
        result.notTerms.push(term);
      }
      workingQuery = workingQuery.replace(match, ' ');
    }
    
    workingQuery = workingQuery.replace(/\bNOT\b/gi, ' ');
    workingQuery = workingQuery.replace(/\s+/g, ' ').trim();
    
    const parenGroups = workingQuery.match(/\([^)]+\)/g) || [];
    parenGroups.forEach(group => {
      const innerTerms = group.replace(/[()]/g, '').trim();
      
      if (innerTerms.includes(' OR ')) {
        const orTerms = innerTerms.split(/\s+OR\s+/i).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        if (orTerms.length > 0) result.orGroups.push(orTerms);
      } else if (innerTerms.includes(' AND ')) {
        const andTerms = innerTerms.split(/\s+AND\s+/i).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        if (andTerms.length > 0) result.andGroups.push(andTerms);
      } else {
        const term = innerTerms.toLowerCase();
        if (term.length > 0) result.terms.push(term);
      }
      workingQuery = workingQuery.replace(group, ' ');
    });
    
    workingQuery = workingQuery.replace(/\s+/g, ' ').trim();
    workingQuery = workingQuery.replace(/^\s*(AND|OR)\s+/gi, '').replace(/\s+(AND|OR)\s*$/gi, '');
    workingQuery = workingQuery.replace(/\s+(AND|OR)\s+(AND|OR)\s+/gi, ' AND ');
    workingQuery = workingQuery.trim();
    
    if (workingQuery.length === 0) {
      return result;
    }
    
    const remainingParts = workingQuery.split(/\s+AND\s+/i);
    remainingParts.forEach(part => {
      const cleanPart = part.trim();
      if (cleanPart.length === 0) return;
      
      if (cleanPart.includes(' OR ')) {
        const orTerms = cleanPart.split(/\s+OR\s+/i)
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0 && t !== 'and' && t !== 'or' && t !== 'not');
        if (orTerms.length > 0) result.orGroups.push(orTerms);
      } else {
        const term = cleanPart.toLowerCase();
        if (term.length > 0 && term !== 'and' && term !== 'or' && term !== 'not') {
          result.terms.push(term);
        }
      }
    });

    return result;
  }

  buildSearchPatternStructured(parsed: ParsedQuery): { 
    requiredTerms: string[]; 
    andGroups: string[][];
    orGroups: string[][];
    notTerms: string[];
  } {
    return {
      requiredTerms: parsed.terms.map(t => t.toLowerCase()),
      andGroups: parsed.andGroups.map(g => g.map(t => t.toLowerCase())),
      orGroups: parsed.orGroups.map(g => g.map(t => t.toLowerCase())),
      notTerms: parsed.notTerms.map(t => t.toLowerCase())
    };
  }

  async searchDocumentsWithQuery(
    query: string,
    dealId: string,
    sourceType: "pe_deal" | "transaction" | "data_room" | "case",
    options?: {
      limit?: number;
      includeContent?: boolean;
    }
  ): Promise<DocumentSearchResult[]> {
    const parsed = this.parseBoolean(query);
    const structured = this.buildSearchPatternStructured(parsed);
    
    const hasPatterns = structured.requiredTerms.length > 0 || 
                        structured.andGroups.length > 0 || 
                        structured.orGroups.length > 0;
    
    if (!hasPatterns) {
      return [];
    }
    
    const results: DocumentSearchResult[] = [];
    const limit = options?.limit || 100;
    
    const searchDataRoom = await this.searchDataRoomDocuments(dealId, structured, limit);
    results.push(...searchDataRoom);
    
    const searchPeDealDocs = await this.searchPeDealDocumentsTable(dealId, structured, limit);
    results.push(...searchPeDealDocs);
    
    const searchCommunications = await this.searchCommunicationsTable(dealId, structured, limit);
    results.push(...searchCommunications);
    
    const searchCourtPleadings = await this.searchCourtPleadingsTable(dealId, structured, limit);
    results.push(...searchCourtPleadings);
    
    return this.rankResults(results, parsed);
  }

  private matchesDocument(text: string, structured: { 
    requiredTerms: string[]; 
    andGroups: string[][];
    orGroups: string[][];
    notTerms: string[];
  }): boolean {
    const lowerText = text.toLowerCase();
    
    for (const notTerm of structured.notTerms) {
      if (lowerText.includes(notTerm)) {
        return false;
      }
    }
    
    for (const term of structured.requiredTerms) {
      if (!lowerText.includes(term)) {
        return false;
      }
    }
    
    for (const andGroup of structured.andGroups) {
      const allMatch = andGroup.every(term => lowerText.includes(term));
      if (!allMatch) {
        return false;
      }
    }
    
    for (const orGroup of structured.orGroups) {
      const anyMatch = orGroup.some(term => lowerText.includes(term));
      if (!anyMatch) {
        return false;
      }
    }
    
    return true;
  }

  private getMatchedTermsFromStructured(text: string, structured: { 
    requiredTerms: string[]; 
    andGroups: string[][];
    orGroups: string[][];
    notTerms: string[];
  }): string[] {
    const lowerText = text.toLowerCase();
    const matched: string[] = [];
    
    for (const term of structured.requiredTerms) {
      if (lowerText.includes(term)) {
        matched.push(term);
      }
    }
    
    for (const group of structured.andGroups) {
      for (const term of group) {
        if (lowerText.includes(term) && !matched.includes(term)) {
          matched.push(term);
        }
      }
    }
    
    for (const group of structured.orGroups) {
      for (const term of group) {
        if (lowerText.includes(term) && !matched.includes(term)) {
          matched.push(term);
        }
      }
    }
    
    return matched;
  }

  private getAllSearchTerms(structured: { 
    requiredTerms: string[]; 
    andGroups: string[][];
    orGroups: string[][];
    notTerms: string[];
  }): string[] {
    const allTerms = new Set<string>();
    structured.requiredTerms.forEach(t => allTerms.add(t));
    structured.andGroups.forEach(g => g.forEach(t => allTerms.add(t)));
    structured.orGroups.forEach(g => g.forEach(t => allTerms.add(t)));
    return Array.from(allTerms);
  }

  private async searchDataRoomDocuments(
    dealId: string,
    structured: { 
      requiredTerms: string[]; 
      andGroups: string[][];
      orGroups: string[][];
      notTerms: string[];
    },
    limit: number
  ): Promise<DocumentSearchResult[]> {
    try {
      const allTerms = this.getAllSearchTerms(structured);
      if (allTerms.length === 0) return [];
      
      const orConditions = allTerms.map(pattern => 
        or(
          ilike(dataRoomDocuments.fileName, `%${pattern}%`),
          ilike(dataRoomDocuments.description || "", `%${pattern}%`),
          ilike(dataRoomDocuments.extractedText || "", `%${pattern}%`)
        )
      );

      const docs = await db
        .select()
        .from(dataRoomDocuments)
        .where(
          and(
            eq(dataRoomDocuments.dataRoomId, dealId),
            or(...orConditions)
          )
        )
        .limit(limit * 5);

      const filteredResults: DocumentSearchResult[] = [];
      for (const doc of docs) {
        const fullText = `${doc.fileName} ${doc.description || ''} ${doc.extractedText || ''}`;
        
        if (!this.matchesDocument(fullText, structured)) {
          continue;
        }
        
        const matchedTerms = this.getMatchedTermsFromStructured(fullText, structured);
        
        filteredResults.push({
          id: doc.id,
          source: "data_room" as const,
          title: doc.fileName,
          path: doc.folderId || undefined,
          content: doc.extractedText?.substring(0, 500),
          matchedTerms,
          matchedExcerpts: this.extractExcerpts(doc.extractedText || '', allTerms),
          relevanceScore: matchedTerms.length / Math.max(allTerms.length, 1),
          metadata: {
            fileSize: doc.fileSize,
            fileType: doc.fileType,
            uploadedAt: doc.uploadedAt
          }
        });
        
        if (filteredResults.length >= limit) break;
      }
      
      return filteredResults;
    } catch (error) {
      console.error("Error searching data room documents:", error);
      return [];
    }
  }

  private async searchPeDealDocumentsTable(
    dealId: string,
    structured: { 
      requiredTerms: string[]; 
      andGroups: string[][];
      orGroups: string[][];
      notTerms: string[];
    },
    limit: number
  ): Promise<DocumentSearchResult[]> {
    try {
      const allTerms = this.getAllSearchTerms(structured);
      if (allTerms.length === 0) return [];
      
      const orConditions = allTerms.map(pattern => 
        or(
          ilike(peDealDocuments.filename, `%${pattern}%`),
          ilike(peDealDocuments.summary || "", `%${pattern}%`),
          ilike(peDealDocuments.extractedText || "", `%${pattern}%`)
        )
      );

      const docs = await db
        .select()
        .from(peDealDocuments)
        .where(
          and(
            eq(peDealDocuments.dealId, dealId),
            or(...orConditions)
          )
        )
        .limit(limit * 5);

      const filteredResults: DocumentSearchResult[] = [];
      for (const doc of docs) {
        const fullText = `${doc.filename} ${doc.summary || ''} ${doc.extractedText || ''}`;
        
        if (!this.matchesDocument(fullText, structured)) {
          continue;
        }
        
        const matchedTerms = this.getMatchedTermsFromStructured(fullText, structured);
        
        filteredResults.push({
          id: doc.id.toString(),
          source: "pe_deal" as const,
          title: doc.filename,
          path: doc.category || undefined,
          content: doc.extractedText?.substring(0, 500),
          matchedTerms,
          matchedExcerpts: this.extractExcerpts(doc.extractedText || '', allTerms),
          relevanceScore: matchedTerms.length / Math.max(allTerms.length, 1),
          metadata: {
            sizeBytes: doc.sizeBytes,
            mimeType: doc.mimeType,
            category: doc.category
          }
        });
        
        if (filteredResults.length >= limit) break;
      }
      
      return filteredResults;
    } catch (error) {
      console.error("Error searching PE deal documents:", error);
      return [];
    }
  }

  private async searchCommunicationsTable(
    dealId: string,
    structured: { 
      requiredTerms: string[]; 
      andGroups: string[][];
      orGroups: string[][];
      notTerms: string[];
    },
    limit: number
  ): Promise<DocumentSearchResult[]> {
    try {
      const allTerms = this.getAllSearchTerms(structured);
      if (allTerms.length === 0) return [];
      
      const orConditions = allTerms.map(pattern => 
        or(
          ilike(communications.subject || "", `%${pattern}%`),
          ilike(communications.bodyText || "", `%${pattern}%`),
          ilike(communications.sender || "", `%${pattern}%`)
        )
      );

      const docs = await db
        .select()
        .from(communications)
        .where(
          and(
            eq(communications.caseId, dealId),
            or(...orConditions)
          )
        )
        .limit(limit * 5);

      const filteredResults: DocumentSearchResult[] = [];
      for (const doc of docs) {
        const fullText = `${doc.subject || ''} ${doc.bodyText || ''} ${doc.sender || ''}`;
        
        if (!this.matchesDocument(fullText, structured)) {
          continue;
        }
        
        const matchedTerms = this.getMatchedTermsFromStructured(fullText, structured);
        
        filteredResults.push({
          id: doc.id.toString(),
          source: "communication" as const,
          title: doc.subject || 'No Subject',
          content: doc.bodyText?.substring(0, 500),
          matchedTerms,
          matchedExcerpts: this.extractExcerpts(doc.bodyText || '', allTerms),
          relevanceScore: matchedTerms.length / Math.max(allTerms.length, 1),
          metadata: {
            sender: doc.sender,
            recipients: doc.recipients,
            sentAt: doc.timestamp,
            source: doc.source
          }
        });
        
        if (filteredResults.length >= limit) break;
      }
      
      return filteredResults;
    } catch (error) {
      console.error("Error searching communications:", error);
      return [];
    }
  }

  private async searchCourtPleadingsTable(
    dealId: string,
    structured: { 
      requiredTerms: string[]; 
      andGroups: string[][];
      orGroups: string[][];
      notTerms: string[];
    },
    limit: number
  ): Promise<DocumentSearchResult[]> {
    try {
      const allTerms = this.getAllSearchTerms(structured);
      if (allTerms.length === 0) return [];
      
      const orConditions = allTerms.map(pattern => 
        or(
          ilike(courtPleadings.title, `%${pattern}%`),
          ilike(courtPleadings.summary || "", `%${pattern}%`),
          ilike(courtPleadings.extractedText || "", `%${pattern}%`)
        )
      );

      const docs = await db
        .select()
        .from(courtPleadings)
        .where(
          and(
            eq(courtPleadings.caseId, dealId),
            or(...orConditions)
          )
        )
        .limit(limit * 5);

      const filteredResults: DocumentSearchResult[] = [];
      for (const doc of docs) {
        const fullText = `${doc.title} ${doc.summary || ''} ${doc.extractedText || ''}`;
        
        if (!this.matchesDocument(fullText, structured)) {
          continue;
        }
        
        const matchedTerms = this.getMatchedTermsFromStructured(fullText, structured);
        
        filteredResults.push({
          id: doc.id,
          source: "court_pleading" as const,
          title: doc.title,
          content: doc.extractedText?.substring(0, 500),
          matchedTerms,
          matchedExcerpts: this.extractExcerpts(doc.extractedText || '', allTerms),
          relevanceScore: matchedTerms.length / Math.max(allTerms.length, 1),
          metadata: {
            pleadingType: doc.pleadingType,
            filingDate: doc.filingDate,
            fileSize: doc.fileSize
          }
        });
        
        if (filteredResults.length >= limit) break;
      }
      
      return filteredResults;
    } catch (error) {
      console.error("Error searching court pleadings:", error);
      return [];
    }
  }

  private findMatchedTerms(text: string, patterns: string[]): string[] {
    const lowerText = text.toLowerCase();
    return patterns.filter(pattern => lowerText.includes(pattern.toLowerCase()));
  }

  private extractExcerpts(
    text: string,
    patterns: string[],
    contextChars: number = 100
  ): { text: string; page?: number; location?: string }[] {
    const excerpts: { text: string; page?: number; location?: string }[] = [];
    const lowerText = text.toLowerCase();
    
    for (const pattern of patterns) {
      const index = lowerText.indexOf(pattern.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - contextChars);
        const end = Math.min(text.length, index + pattern.length + contextChars);
        const excerpt = text.substring(start, end);
        excerpts.push({
          text: (start > 0 ? '...' : '') + excerpt + (end < text.length ? '...' : ''),
          location: `char ${index}`
        });
      }
    }
    
    return excerpts.slice(0, 5);
  }

  private rankResults(results: DocumentSearchResult[], parsed: ParsedQuery): DocumentSearchResult[] {
    return results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.matchedTerms.length - a.matchedTerms.length;
    });
  }

  async getMasterQueries(): Promise<any[]> {
    return db
      .select({
        id: ddBooleanQueries.id,
        sectionId: ddBooleanQueries.sectionId,
        sectionName: ddChecklistSections.name,
        queryType: ddBooleanQueries.queryType,
        queryText: ddBooleanQueries.queryText,
        description: ddBooleanQueries.description,
        expectedDocTypes: ddBooleanQueries.expectedDocTypes,
        isActive: ddBooleanQueries.isActive
      })
      .from(ddBooleanQueries)
      .leftJoin(ddChecklistSections, eq(ddBooleanQueries.sectionId, ddChecklistSections.id))
      .where(eq(ddBooleanQueries.isActive, true))
      .orderBy(ddChecklistSections.displayOrder, ddBooleanQueries.queryType);
  }

  async initializeDealQueries(
    dealId: string,
    sourceType: "pe_deal" | "transaction" | "data_room" | "case" = "pe_deal"
  ): Promise<void> {
    const existingQueries = await db
      .select()
      .from(ddDealQueries)
      .where(
        and(
          eq(ddDealQueries.dealId, dealId),
          eq(ddDealQueries.sourceType, sourceType)
        )
      )
      .limit(1);

    if (existingQueries.length > 0) {
      return;
    }

    const masterQueries = await db.select().from(ddBooleanQueries).where(eq(ddBooleanQueries.isActive, true));

    for (const mq of masterQueries) {
      await db.insert(ddDealQueries).values({
        dealId,
        sourceType,
        sectionId: mq.sectionId,
        sourceQueryId: mq.id,
        queryType: mq.queryType,
        queryText: mq.queryText,
        isCustomized: false,
        isActive: true,
        version: 1
      });
    }
  }

  async getDealQueries(
    dealId: string,
    sourceType: "pe_deal" | "transaction" | "data_room" | "case" = "pe_deal"
  ): Promise<any[]> {
    return db
      .select({
        id: ddDealQueries.id,
        sectionId: ddDealQueries.sectionId,
        sectionName: ddChecklistSections.name,
        sectionDisplayOrder: ddChecklistSections.displayOrder,
        queryType: ddDealQueries.queryType,
        queryText: ddDealQueries.queryText,
        isCustomized: ddDealQueries.isCustomized,
        isActive: ddDealQueries.isActive,
        lastEditedAt: ddDealQueries.lastEditedAt
      })
      .from(ddDealQueries)
      .leftJoin(ddChecklistSections, eq(ddDealQueries.sectionId, ddChecklistSections.id))
      .where(
        and(
          eq(ddDealQueries.dealId, dealId),
          eq(ddDealQueries.sourceType, sourceType)
        )
      )
      .orderBy(ddChecklistSections.displayOrder, ddDealQueries.queryType);
  }

  async updateDealQuery(
    queryId: string,
    queryText: string,
    userId: string
  ): Promise<void> {
    await db
      .update(ddDealQueries)
      .set({
        queryText,
        isCustomized: true,
        lastEditedBy: userId,
        lastEditedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(ddDealQueries.id, queryId));
  }

  async runAnalysis(
    dealId: string,
    sourceType: "pe_deal" | "transaction" | "data_room" | "case",
    userId: string,
    targetCompanyName?: string
  ): Promise<string> {
    await this.initializeDealQueries(dealId, sourceType);

    const [analysisRun] = await db
      .insert(ddAnalysisRuns)
      .values({
        dealId,
        sourceType,
        initiatedBy: userId,
        status: "processing",
        inputSummary: {
          sectionsAnalyzed: 23,
          queriesExecuted: 0,
          documentSources: ["data_room", "case_evidence", "court_pleading", "communication"],
          targetCompanyName
        }
      })
      .returning();

    this.executeAnalysis(analysisRun.id, dealId, sourceType, targetCompanyName).catch(err => {
      console.error("Analysis execution error:", err);
      db.update(ddAnalysisRuns)
        .set({ status: "failed", errorMessage: err.message })
        .where(eq(ddAnalysisRuns.id, analysisRun.id));
    });

    return analysisRun.id;
  }

  private async executeAnalysis(
    runId: string,
    dealId: string,
    sourceType: "pe_deal" | "transaction" | "data_room" | "case",
    targetCompanyName?: string
  ): Promise<void> {
    const dealQueries = await this.getDealQueries(dealId, sourceType);
    
    const sections = await db.select().from(ddChecklistSections).where(eq(ddChecklistSections.isActive, true));
    
    let totalDocsSearched = 0;
    let totalDocsMatched = 0;
    let sectionsWithFindings = 0;
    let totalFindings = 0;
    let riskFlagsCount = 0;
    let overallRiskLevel = "low";

    for (const section of sections) {
      const sectionQueries = dealQueries.filter(q => q.sectionId === section.id);
      
      let allMatchedDocs: DocumentSearchResult[] = [];
      
      for (const query of sectionQueries) {
        let queryText = query.queryText;
        if (targetCompanyName) {
          queryText = queryText
            .replace(/\[COMPANY_NAME\]/g, targetCompanyName)
            .replace(/\[BRAND_NAME\]/g, targetCompanyName)
            .replace(/\[PRINCIPALS\]/g, targetCompanyName);
        }
        
        const results = await this.searchDocumentsWithQuery(queryText, dealId, sourceType);
        allMatchedDocs.push(...results);
      }
      
      const uniqueDocs = this.deduplicateResults(allMatchedDocs);
      totalDocsSearched += uniqueDocs.length;
      
      if (uniqueDocs.length > 0) {
        totalDocsMatched += uniqueDocs.length;
        
        const analysisResult = await this.analyzeDocumentsWithAI(section, uniqueDocs, targetCompanyName);
        
        await db.insert(ddSectionResults).values({
          analysisRunId: runId,
          sectionId: section.id,
          documentsMatched: uniqueDocs.length,
          documentsAnalyzed: Math.min(uniqueDocs.length, 50),
          confidence: analysisResult.confidence,
          riskLevel: analysisResult.riskLevel,
          summary: analysisResult.summary,
          keyFindings: analysisResult.keyFindings,
          riskFlags: analysisResult.riskFlags,
          recommendations: analysisResult.recommendations,
          aiFindings: analysisResult.aiFindings
        });
        
        for (const doc of uniqueDocs.slice(0, 100)) {
          await db.insert(ddDocumentMatches).values({
            analysisRunId: runId,
            sectionId: section.id,
            documentId: doc.id,
            documentSource: doc.source,
            documentTitle: doc.title,
            documentPath: doc.path,
            matchType: "boolean_hit",
            relevanceScore: doc.relevanceScore?.toString(),
            matchedTerms: doc.matchedTerms,
            matchedExcerpts: doc.matchedExcerpts
          }).onConflictDoNothing();
        }
        
        if (analysisResult.keyFindings.length > 0) {
          sectionsWithFindings++;
          totalFindings += analysisResult.keyFindings.length;
        }
        riskFlagsCount += analysisResult.riskFlags.length;
        
        if (analysisResult.riskLevel === "critical") overallRiskLevel = "critical";
        else if (analysisResult.riskLevel === "high" && overallRiskLevel !== "critical") overallRiskLevel = "high";
        else if (analysisResult.riskLevel === "medium" && overallRiskLevel === "low") overallRiskLevel = "medium";
      }
    }

    await db
      .update(ddAnalysisRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        totalDocumentsSearched: totalDocsSearched,
        totalDocumentsMatched: totalDocsMatched,
        outputSummary: {
          riskFlagsCount,
          sectionsWithFindings,
          totalFindings,
          overallRiskLevel
        },
        aiModel: "gemini-2.5-flash-preview-05-20"
      })
      .where(eq(ddAnalysisRuns.id, runId));
  }

  private deduplicateResults(results: DocumentSearchResult[]): DocumentSearchResult[] {
    const seen = new Map<string, DocumentSearchResult>();
    for (const result of results) {
      const key = `${result.source}:${result.id}`;
      if (!seen.has(key) || (seen.get(key)!.relevanceScore < result.relevanceScore)) {
        seen.set(key, result);
      }
    }
    return Array.from(seen.values());
  }

  private async analyzeDocumentsWithAI(
    section: any,
    documents: DocumentSearchResult[],
    targetCompanyName?: string
  ): Promise<{
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    summary: string;
    keyFindings: any[];
    riskFlags: any[];
    recommendations: any[];
    aiFindings: any;
  }> {
    try {
      const docsToAnalyze = documents.slice(0, 20);
      const docSummaries = docsToAnalyze.map((doc, i) => {
        const excerpts = doc.matchedExcerpts.slice(0, 3).map(e => e.text).join('\n');
        return `Document ${i + 1}: "${doc.title}" (${doc.source})
Matched terms: ${doc.matchedTerms.join(', ')}
Excerpts:
${excerpts}`;
      }).join('\n\n');

      const prompt = `You are a senior M&A due diligence analyst reviewing documents for "${section.name}" analysis.
${targetCompanyName ? `Target company: ${targetCompanyName}` : ''}

Section Description: ${section.description || 'Standard due diligence review'}

Documents found (${documents.length} total, showing first ${docsToAnalyze.length}):
${docSummaries}

Analyze these documents and provide:
1. A brief summary of findings (2-3 sentences)
2. Key findings with severity (low/medium/high/critical) and document references
3. Risk flags that require attention
4. Recommendations for follow-up

Respond in JSON format:
{
  "summary": "...",
  "riskLevel": "low|medium|high|critical",
  "confidence": 0.0-1.0,
  "keyFindings": [{"finding": "...", "severity": "...", "documentRefs": ["Doc 1", "Doc 2"]}],
  "riskFlags": [{"flag": "...", "severity": "...", "evidence": "...", "documentRef": "..."}],
  "recommendations": [{"recommendation": "...", "priority": "low|medium|high", "rationale": "..."}]
}`;

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-05-20",
        contents: prompt
      });
      const responseText = result.text || "";
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: parsed.confidence || 0.7,
          riskLevel: parsed.riskLevel || "low",
          summary: parsed.summary || "Analysis complete",
          keyFindings: parsed.keyFindings || [],
          riskFlags: parsed.riskFlags || [],
          recommendations: parsed.recommendations || [],
          aiFindings: parsed
        };
      }
      
      return {
        confidence: 0.5,
        riskLevel: "low",
        summary: "Unable to parse AI analysis",
        keyFindings: [],
        riskFlags: [],
        recommendations: [],
        aiFindings: null
      };
    } catch (error) {
      console.error("AI analysis error:", error);
      return {
        confidence: 0,
        riskLevel: "low",
        summary: "AI analysis failed",
        keyFindings: [],
        riskFlags: [],
        recommendations: [],
        aiFindings: null
      };
    }
  }

  async getAnalysisRuns(dealId: string, sourceType?: string): Promise<any[]> {
    const conditions = [eq(ddAnalysisRuns.dealId, dealId)];
    if (sourceType) {
      conditions.push(eq(ddAnalysisRuns.sourceType, sourceType as any));
    }
    
    return db
      .select({
        id: ddAnalysisRuns.id,
        dealId: ddAnalysisRuns.dealId,
        status: ddAnalysisRuns.status,
        initiatedAt: ddAnalysisRuns.initiatedAt,
        completedAt: ddAnalysisRuns.completedAt,
        totalDocumentsSearched: ddAnalysisRuns.totalDocumentsSearched,
        totalDocumentsMatched: ddAnalysisRuns.totalDocumentsMatched,
        outputSummary: ddAnalysisRuns.outputSummary,
        initiatedByEmail: users.email
      })
      .from(ddAnalysisRuns)
      .leftJoin(users, eq(ddAnalysisRuns.initiatedBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(ddAnalysisRuns.initiatedAt));
  }

  async getAnalysisResults(runId: string): Promise<{
    run: any;
    sectionResults: any[];
    documentMatches: any[];
  }> {
    const [run] = await db
      .select()
      .from(ddAnalysisRuns)
      .where(eq(ddAnalysisRuns.id, runId));

    if (!run) {
      throw new Error("Analysis run not found");
    }

    const sectionResults = await db
      .select({
        id: ddSectionResults.id,
        sectionId: ddSectionResults.sectionId,
        sectionName: ddChecklistSections.name,
        sectionDisplayOrder: ddChecklistSections.displayOrder,
        documentsMatched: ddSectionResults.documentsMatched,
        documentsAnalyzed: ddSectionResults.documentsAnalyzed,
        riskLevel: ddSectionResults.riskLevel,
        summary: ddSectionResults.summary,
        keyFindings: ddSectionResults.keyFindings,
        riskFlags: ddSectionResults.riskFlags,
        recommendations: ddSectionResults.recommendations
      })
      .from(ddSectionResults)
      .leftJoin(ddChecklistSections, eq(ddSectionResults.sectionId, ddChecklistSections.id))
      .where(eq(ddSectionResults.analysisRunId, runId))
      .orderBy(ddChecklistSections.displayOrder);

    const documentMatches = await db
      .select({
        id: ddDocumentMatches.id,
        sectionId: ddDocumentMatches.sectionId,
        sectionName: ddChecklistSections.name,
        documentId: ddDocumentMatches.documentId,
        documentSource: ddDocumentMatches.documentSource,
        documentTitle: ddDocumentMatches.documentTitle,
        documentPath: ddDocumentMatches.documentPath,
        matchType: ddDocumentMatches.matchType,
        relevanceScore: ddDocumentMatches.relevanceScore,
        matchedTerms: ddDocumentMatches.matchedTerms,
        matchedExcerpts: ddDocumentMatches.matchedExcerpts,
        userTags: ddDocumentMatches.userTags,
        isReviewed: ddDocumentMatches.isReviewed
      })
      .from(ddDocumentMatches)
      .leftJoin(ddChecklistSections, eq(ddDocumentMatches.sectionId, ddChecklistSections.id))
      .where(eq(ddDocumentMatches.analysisRunId, runId))
      .orderBy(ddChecklistSections.displayOrder, desc(ddDocumentMatches.relevanceScore));

    return { run, sectionResults, documentMatches };
  }

  async tagDocument(
    matchId: string,
    tags: string[],
    notes: string | null,
    userId: string
  ): Promise<void> {
    await db
      .update(ddDocumentMatches)
      .set({
        userTags: tags,
        userNotes: notes,
        isReviewed: true,
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(ddDocumentMatches.id, matchId));
  }

  async generatePDFReport(runId: string): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;
    const { format } = await import('date-fns');
    
    const { run, sectionResults, documentMatches } = await this.getAnalysisResults(runId);
    
    const COLORS = {
      primary: '#1e3a5f',
      accent: '#0ea5e9',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      muted: '#64748b',
      text: '#334155',
      cardBg: '#f8fafc',
      cardBorder: '#e2e8f0',
    };

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 60, bottom: 60, left: 56, right: 56 },
      bufferPages: true,
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 112;
    const leftMargin = 56;

    doc.rect(0, 0, pageWidth, 180).fill(COLORS.primary);
    doc.rect(0, 180, pageWidth, 6).fill(COLORS.accent);
    
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.accent);
    doc.text('SENTINEL COUNSEL LLP', leftMargin, 50);
    
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#ffffff');
    doc.text('DD Boolean Search Report', leftMargin, 85);
    
    doc.font('Helvetica').fontSize(14).fillColor('#94b8db');
    doc.text('Due Diligence Document Analysis', leftMargin, 125);
    
    doc.font('Helvetica').fontSize(10).fillColor('#94b8db');
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, leftMargin, 150);

    let y = 210;
    
    const totalDocs = sectionResults.reduce((sum: number, s: any) => sum + (s.documentsMatched || 0), 0);
    const highRiskCount = sectionResults.filter((s: any) => s.riskLevel === 'high' || s.riskLevel === 'critical').length;
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.primary);
    doc.text('ANALYSIS SUMMARY', leftMargin, y);
    y += 25;
    
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
    doc.text(`Sections Analyzed: ${sectionResults.length}`, leftMargin, y);
    y += 16;
    doc.text(`Documents Matched: ${totalDocs}`, leftMargin, y);
    y += 16;
    doc.text(`High Risk Sections: ${highRiskCount}`, leftMargin, y);
    y += 16;
    doc.text(`Status: ${run.status}`, leftMargin, y);
    y += 30;

    for (const section of sectionResults) {
      if (y > doc.page.height - 200) {
        doc.addPage();
        y = 60;
      }

      const riskColor = section.riskLevel === 'critical' ? COLORS.danger :
                       section.riskLevel === 'high' ? COLORS.warning :
                       section.riskLevel === 'medium' ? '#eab308' : COLORS.success;

      doc.roundedRect(leftMargin, y, contentWidth, 24, 4).fillAndStroke(COLORS.cardBg, COLORS.cardBorder);
      doc.rect(leftMargin, y, 4, 24).fill(riskColor);
      
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
      doc.text(section.sectionName || 'Unknown Section', leftMargin + 12, y + 6, { width: contentWidth - 100 });
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(riskColor);
      doc.text((section.riskLevel || 'low').toUpperCase(), pageWidth - 100, y + 7);
      
      y += 32;

      if (section.summary) {
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        const summaryText = section.summary.length > 300 ? section.summary.substring(0, 297) + '...' : section.summary;
        doc.text(summaryText, leftMargin + 8, y, { width: contentWidth - 16 });
        y += doc.heightOfString(summaryText, { width: contentWidth - 16 }) + 10;
      }

      if (section.keyFindings && section.keyFindings.length > 0) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
        doc.text('Key Findings:', leftMargin + 8, y);
        y += 14;
        
        for (const finding of section.keyFindings.slice(0, 3)) {
          const findingObj = typeof finding === 'string' ? { finding } : finding;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
          doc.text(`• ${findingObj.finding || finding}`, leftMargin + 12, y, { width: contentWidth - 24 });
          y += 12;
        }
        y += 6;
      }

      if (section.riskFlags && section.riskFlags.length > 0) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.danger);
        doc.text('Risk Flags:', leftMargin + 8, y);
        y += 14;
        
        for (const flag of section.riskFlags.slice(0, 2)) {
          const flagObj = typeof flag === 'string' ? { flag } : flag;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
          doc.text(`! ${flagObj.flag || flag}`, leftMargin + 12, y, { width: contentWidth - 24 });
          y += 12;
        }
        y += 6;
      }

      y += 15;
    }

    if (documentMatches.length > 0) {
      doc.addPage();
      y = 60;
      
      doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
      doc.text('DOCUMENT MATCHES', leftMargin, 20);
      
      y = 70;
      
      for (const match of documentMatches.slice(0, 50)) {
        if (y > doc.page.height - 80) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 50).fill(COLORS.primary);
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
          doc.text('DOCUMENT MATCHES (continued)', leftMargin, 20);
          y = 70;
        }

        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary);
        const title = (match.documentTitle || 'Untitled').substring(0, 60);
        doc.text(title, leftMargin, y, { width: contentWidth - 80 });
        
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
        doc.text(`[${match.documentSource}]`, pageWidth - 120, y);
        
        y += 14;
        
        if (match.matchedTerms && match.matchedTerms.length > 0) {
          doc.font('Helvetica').fontSize(7).fillColor(COLORS.muted);
          doc.text(`Terms: ${match.matchedTerms.slice(0, 5).join(', ')}`, leftMargin + 8, y);
          y += 10;
        }
        
        y += 8;
      }
    }

    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted);
    doc.text('CONFIDENTIAL - ATTORNEY WORK PRODUCT', 0, doc.page.height - 40, { align: 'center', width: pageWidth });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }
}

export const ddBooleanSearchService = new DDBooleanSearchService();
