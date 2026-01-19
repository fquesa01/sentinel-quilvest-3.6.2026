import { db } from "../db";
import { sql } from "drizzle-orm";
import { documentSearchTags, searchTermItems } from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface SearchTerm {
  id: string;
  term: string;
  type: "boolean" | "phrase" | "proximity" | "wildcard";
  enabled: boolean;
  aiGenerated: boolean;
  rationale?: string;
}

export interface SearchResult {
  documentId: string;
  matchedTerms: string[];
  snippets: { term: string; context: string; position: number }[];
  score: number;
}

export interface TaggingResult {
  documentsTagged: number;
  documentsSearched: number;
  matchedDocuments: string[];
}

export class BooleanSearchService {
  parseBooleanToTsquery(booleanString: string): string {
    let query = booleanString;

    query = query.replace(/"([^"]+)"/g, (_, phrase) => {
      return phrase.split(/\s+/).join(" <-> ");
    });

    query = query.replace(/\bOR\b/gi, " | ");
    query = query.replace(/\bAND\b/gi, " & ");
    query = query.replace(/\bNOT\b/gi, " !");
    query = query.replace(/(\w+)\*/g, "$1:*");

    query = query.replace(/(\S+)\s+W\/(\d+)\s+(\S+)/gi, (_, term1, distance, term2) => {
      return `${term1} <${distance}> ${term2}`;
    });

    return query;
  }

  async searchDocuments(
    caseId: string,
    booleanString: string,
    options: {
      documentSetId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    try {
      const tsquery = this.parseBooleanToTsquery(booleanString);

      const searchResults = await db.execute(sql`
        SELECT 
          d.id as document_id,
          ts_headline('english', COALESCE(d.extracted_text, d.content, ''), 
            to_tsquery('english', ${tsquery}),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') as snippet,
          ts_rank_cd(
            to_tsvector('english', COALESCE(d.extracted_text, d.content, '')),
            to_tsquery('english', ${tsquery})
          ) as score
        FROM (
          SELECT id, extracted_text, NULL as content FROM case_evidence WHERE case_id = ${caseId}
          UNION ALL
          SELECT id, extracted_text, NULL as content FROM court_pleadings WHERE case_id = ${caseId}
          UNION ALL
          SELECT id, extracted_text, NULL as content FROM data_room_documents WHERE data_room_id IN (
            SELECT id FROM data_rooms WHERE transaction_id IN (
              SELECT id FROM transactions WHERE id = ${caseId}
            )
          )
        ) d
        WHERE to_tsvector('english', COALESCE(d.extracted_text, d.content, '')) 
          @@ to_tsquery('english', ${tsquery})
        ORDER BY score DESC
        LIMIT ${options.limit || 1000}
        OFFSET ${options.offset || 0}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM (
          SELECT id, extracted_text FROM case_evidence WHERE case_id = ${caseId}
          UNION ALL
          SELECT id, extracted_text FROM court_pleadings WHERE case_id = ${caseId}
          UNION ALL
          SELECT id, extracted_text FROM data_room_documents WHERE data_room_id IN (
            SELECT id FROM data_rooms WHERE transaction_id IN (
              SELECT id FROM transactions WHERE id = ${caseId}
            )
          )
        ) d
        WHERE to_tsvector('english', COALESCE(d.extracted_text, '')) 
          @@ to_tsquery('english', ${tsquery})
      `);

      return {
        results: (searchResults.rows as any[]).map((row) => ({
          documentId: row.document_id,
          matchedTerms: [booleanString],
          snippets: [{ term: booleanString, context: row.snippet || "", position: 0 }],
          score: parseFloat(row.score) || 0,
        })),
        totalCount: parseInt((countResult.rows[0] as any)?.total || "0"),
      };
    } catch (error) {
      console.error("[BooleanSearch] Error executing search:", error);
      return { results: [], totalCount: 0 };
    }
  }

  async executeAndTagDocuments(
    caseId: string,
    searchTermItemId: string,
    searchTerms: SearchTerm[],
    tagInfo: { tagName: string; tagCategory: string; tagColor: string },
    options: { documentSetId?: string } = {}
  ): Promise<TaggingResult> {
    const enabledTerms = searchTerms.filter((t) => t.enabled);

    if (enabledTerms.length === 0) {
      return { documentsTagged: 0, documentsSearched: 0, matchedDocuments: [] };
    }

    const combinedBoolean = enabledTerms.map((t) => `(${t.term})`).join(" OR ");

    try {
      const { results, totalCount } = await this.searchDocuments(caseId, combinedBoolean, options);

      let documentsTagged = 0;
      const matchedDocuments: string[] = [];

      for (const result of results) {
        try {
          await db
            .insert(documentSearchTags)
            .values({
              id: nanoid(),
              caseId,
              documentId: result.documentId,
              searchTermItemId,
              tagSource: "search_term",
              tagName: tagInfo.tagName,
              tagCategory: tagInfo.tagCategory,
              tagColor: tagInfo.tagColor,
              matchedTerms: result.matchedTerms,
              matchSnippets: result.snippets,
              confidenceScore: Math.round(result.score * 100),
            })
            .onConflictDoNothing();

          documentsTagged++;
          matchedDocuments.push(result.documentId);
        } catch (tagError) {
          console.error("[BooleanSearch] Error tagging document:", tagError);
        }
      }

      return {
        documentsTagged,
        documentsSearched: totalCount,
        matchedDocuments,
      };
    } catch (error) {
      console.error("[BooleanSearch] Error in executeAndTagDocuments:", error);
      return { documentsTagged: 0, documentsSearched: 0, matchedDocuments: [] };
    }
  }
}
