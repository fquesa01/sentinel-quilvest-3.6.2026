import { openai } from "../ai";

export interface MediaCoverageItem {
  headline: string;
  source: string;
  date: string;
  url: string | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  relevance_score: number;
}

export interface LitigationItem {
  case_name: string;
  case_number: string | null;
  court: string | null;
  filing_date: string | null;
  status: 'pending' | 'settled' | 'dismissed' | 'judgment' | 'unknown';
  parties: string[];
  case_type: string;
  summary: string;
  outcome: string | null;
  source_url: string | null;
  monetary_amount: string | null;
}

export interface RegulatoryAction {
  agency: string;
  action_type: string;
  date: string | null;
  description: string;
  status: string;
  penalties: string | null;
  source_url: string | null;
}

export interface WebResearchResults {
  company_name: string;
  research_date: string;
  media_coverage: {
    positive: MediaCoverageItem[];
    negative: MediaCoverageItem[];
    neutral: MediaCoverageItem[];
    summary: string;
  };
  litigation_history: {
    pending_cases: LitigationItem[];
    resolved_cases: LitigationItem[];
    summary: string;
  };
  regulatory_actions: {
    actions: RegulatoryAction[];
    summary: string;
  };
  overall_risk_assessment: string;
  research_sources: string[];
  search_method: 'web_search' | 'ai_knowledge';
}

interface WebSearchResult {
  content: string;
  citations: string[];
  usedWebSearch: boolean;
}

async function performWebSearch(query: string): Promise<WebSearchResult> {
  try {
    console.log(`[WebSearch] Attempting live web search: ${query.substring(0, 80)}...`);
    
    const response = await (openai as any).responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: query,
    });

    let outputText = '';
    const citations: string[] = [];
    
    if (response.output_text) {
      outputText = response.output_text;
    }
    
    if (response.output && Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          if (Array.isArray(item.content)) {
            for (const contentBlock of item.content) {
              if (contentBlock.type === 'output_text' && contentBlock.text) {
                outputText += contentBlock.text + '\n';
              } else if (contentBlock.type === 'text' && contentBlock.text) {
                outputText += contentBlock.text + '\n';
              }
            }
          } else if (typeof item.content === 'string') {
            outputText += item.content + '\n';
          }
        }
        
        if (item.type === 'web_search_call' && item.results) {
          for (const result of item.results) {
            if (result.url && !citations.includes(result.url)) {
              citations.push(result.url);
            }
          }
        }
      }
    }
    
    if (response.citations && Array.isArray(response.citations)) {
      for (const cite of response.citations) {
        if (typeof cite === 'string' && !citations.includes(cite)) {
          citations.push(cite);
        } else if (cite?.url && !citations.includes(cite.url)) {
          citations.push(cite.url);
        }
      }
    }
    
    outputText = outputText.trim();
    
    const hasContent = outputText.length > 20;
    const hasCitations = citations.length > 0;
    
    console.log(`[WebSearch] Web search result: ${outputText.length} chars, ${citations.length} citations`);
    
    if (hasCitations) {
      console.log(`[WebSearch] Web search succeeded with ${citations.length} citations`);
      return {
        content: hasContent ? outputText : `Web search found ${citations.length} sources. See citations for details.`,
        citations: citations,
        usedWebSearch: true,
      };
    }
    
    if (hasContent) {
      console.log('[WebSearch] Web search returned content but no citations, treating as AI knowledge');
      return {
        content: outputText,
        citations: [],
        usedWebSearch: false,
      };
    }
    
    console.log('[WebSearch] Web search returned no useful data, falling back to AI knowledge...');
    return performAIKnowledgeFallback(query);
    
  } catch (error: any) {
    console.error('[WebSearch] Web search error:', error?.message || error);
    console.log('[WebSearch] Falling back to AI knowledge search...');
    return performAIKnowledgeFallback(query);
  }
}

async function performAIKnowledgeFallback(query: string): Promise<WebSearchResult> {
  try {
    console.log(`[AIKnowledge] Using AI knowledge fallback...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional corporate research analyst. Provide information based on your training data knowledge.
Include specific details like dates, case numbers, monetary amounts when known.
Be honest about uncertainty - if you are not sure about something, say so.
Format your response as research findings.`
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 4000,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      citations: [],
      usedWebSearch: false,
    };
  } catch (error) {
    console.error('[AIKnowledge] Fallback search error:', error);
    return { content: '', citations: [], usedWebSearch: false };
  }
}

// Options for enhanced research including key persons and organizations
export interface ResearchOptions {
  keyPersons?: string[];  // Key individuals to include in litigation search
  keyOrganizations?: string[];  // Related organizations to include in search
}

export async function conductCompanyResearch(
  companyName: string, 
  options?: ResearchOptions
): Promise<WebResearchResults> {
  console.log(`[WebResearch] Starting comprehensive research for: ${companyName}`);
  
  const keyPersons = options?.keyPersons || [];
  const keyOrganizations = options?.keyOrganizations || [];
  
  if (keyPersons.length > 0) {
    console.log(`[WebResearch] Including ${keyPersons.length} key persons in litigation search`);
  }
  if (keyOrganizations.length > 0) {
    console.log(`[WebResearch] Including ${keyOrganizations.length} related organizations in litigation search`);
  }
  
  const researchDate = new Date().toISOString().split('T')[0];
  
  // Build enhanced litigation search query including key persons and organizations
  const litigationEntities = [companyName, ...keyOrganizations.slice(0, 5)];
  const litigationPersons = keyPersons.slice(0, 10); // Top 10 key persons
  
  let litigationQuery = `Search the web for litigation, lawsuits, and legal cases involving the following entities and persons:

PRIMARY ENTITY: "${companyName}"

${keyOrganizations.length > 0 ? `RELATED ORGANIZATIONS:\n${keyOrganizations.slice(0, 5).map(org => `- "${org}"`).join('\n')}\n` : ''}
${keyPersons.length > 0 ? `KEY PERSONS (executives, employees, or individuals mentioned in documents):\n${keyPersons.slice(0, 10).map(person => `- "${person}"`).join('\n')}\n` : ''}

Search for cases where any of these entities or persons appear as plaintiff, defendant, witness, or party of interest.
Include: case names, court/jurisdiction, filing dates, current status, case type (e.g., antitrust, employment, securities fraud, patent, class action, personal liability, breach of fiduciary duty), 
key parties involved, and outcomes if resolved.
Include both pending and historical cases. Focus on significant cases with substantial monetary amounts or reputational impact.
For each case, clearly indicate which entity or person from the list above is involved.`;

  const [mediaResults, litigationResults, regulatoryResults] = await Promise.all([
    performWebSearch(`Search the web for recent news and media coverage about "${companyName}". 
Find both positive coverage (awards, achievements, positive press) and negative coverage (scandals, controversies, negative press).
For each item found, include: the headline, source publication, date, and a brief summary.
Focus on the most significant and recent news articles.`),
    
    performWebSearch(litigationQuery),
    
    performWebSearch(`Search the web for regulatory actions, investigations, enforcement actions, fines, or compliance issues involving "${companyName}".
Include actions by: SEC, DOJ, FTC, FDA, EPA, OSHA, state attorneys general, or international regulators.
For each, provide: agency name, type of action, date, description, current status, and any penalties or settlements.`)
  ]);

  const allCitations = [
    ...mediaResults.citations,
    ...litigationResults.citations,
    ...regulatoryResults.citations,
  ].filter((url, index, self) => url && self.indexOf(url) === index);
  
  const usedWebSearch = mediaResults.usedWebSearch || litigationResults.usedWebSearch || regulatoryResults.usedWebSearch;
  const searchMethod: 'web_search' | 'ai_knowledge' = usedWebSearch ? 'web_search' : 'ai_knowledge';

  console.log(`[WebResearch] Research completed using ${searchMethod}. Total unique citations: ${allCitations.length}`);

  const citationsContext = allCitations.length > 0 
    ? `\n\nSOURCE URLS FROM WEB SEARCH (include these in source_url and url fields where relevant):\n${allCitations.map((url, i) => `[${i+1}] ${url}`).join('\n')}`
    : '';

  const structuredAnalysis = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a legal research analyst. Analyze the provided research findings and extract structured data.
Output valid JSON matching the exact schema specified. Be accurate and use the actual source URLs provided.
If information is not found or uncertain, use null or empty arrays - do not fabricate data.
IMPORTANT: Use the provided source URLs in the url and source_url fields. Do not make up URLs.`
      },
      {
        role: 'user',
        content: `Analyze the following research findings about "${companyName}" and structure them into the required format.

MEDIA COVERAGE RESEARCH:
${mediaResults.content}
${mediaResults.citations.length > 0 ? `\nMedia Sources: ${mediaResults.citations.join(', ')}` : ''}

LITIGATION RESEARCH:
${litigationResults.content}
${litigationResults.citations.length > 0 ? `\nLitigation Sources: ${litigationResults.citations.join(', ')}` : ''}

REGULATORY RESEARCH:
${regulatoryResults.content}
${regulatoryResults.citations.length > 0 ? `\nRegulatory Sources: ${regulatoryResults.citations.join(', ')}` : ''}
${citationsContext}

Output JSON with this exact structure:
{
  "media_coverage": {
    "positive": [{"headline": "", "source": "", "date": "", "url": "use actual URL from sources above or null", "sentiment": "positive", "summary": "", "relevance_score": 0.0-1.0}],
    "negative": [{"headline": "", "source": "", "date": "", "url": "use actual URL from sources above or null", "sentiment": "negative", "summary": "", "relevance_score": 0.0-1.0}],
    "neutral": [{"headline": "", "source": "", "date": "", "url": "use actual URL from sources above or null", "sentiment": "neutral", "summary": "", "relevance_score": 0.0-1.0}],
    "summary": "Overall media coverage analysis paragraph"
  },
  "litigation_history": {
    "pending_cases": [{"case_name": "", "case_number": null, "court": null, "filing_date": null, "status": "pending", "parties": [], "case_type": "", "summary": "", "outcome": null, "source_url": "use actual URL from sources above or null", "monetary_amount": null}],
    "resolved_cases": [{"case_name": "", "case_number": null, "court": null, "filing_date": null, "status": "settled|dismissed|judgment", "parties": [], "case_type": "", "summary": "", "outcome": "", "source_url": "use actual URL from sources above or null", "monetary_amount": null}],
    "summary": "Overall litigation history analysis paragraph"
  },
  "regulatory_actions": {
    "actions": [{"agency": "", "action_type": "", "date": null, "description": "", "status": "", "penalties": null, "source_url": "use actual URL from sources above or null"}],
    "summary": "Overall regulatory action analysis paragraph"
  },
  "overall_risk_assessment": "Comprehensive risk assessment paragraph combining media, litigation, and regulatory findings",
  "research_sources": ["List all source URLs that were used - use the actual URLs provided above"]
}`
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const content = structuredAnalysis.choices[0]?.message?.content;
  if (!content) {
    console.error('[WebResearch] No structured analysis returned');
    return createEmptyResults(companyName, researchDate, searchMethod);
  }

  try {
    const parsed = JSON.parse(content);
    console.log('[WebResearch] Successfully structured research results');
    
    const combinedSources = [
      ...allCitations,
      ...(parsed.research_sources || []),
    ].filter((url, index, self) => url && self.indexOf(url) === index);
    
    return {
      company_name: companyName,
      research_date: researchDate,
      media_coverage: parsed.media_coverage || { positive: [], negative: [], neutral: [], summary: 'No media coverage data available.' },
      litigation_history: parsed.litigation_history || { pending_cases: [], resolved_cases: [], summary: 'No litigation history data available.' },
      regulatory_actions: parsed.regulatory_actions || { actions: [], summary: 'No regulatory action data available.' },
      overall_risk_assessment: parsed.overall_risk_assessment || 'Unable to complete risk assessment due to insufficient data.',
      research_sources: combinedSources,
      search_method: searchMethod,
    };
  } catch (parseError) {
    console.error('[WebResearch] Failed to parse structured analysis:', parseError);
    return createEmptyResults(companyName, researchDate, searchMethod);
  }
}

function createEmptyResults(companyName: string, researchDate: string, searchMethod: 'web_search' | 'ai_knowledge' = 'ai_knowledge'): WebResearchResults {
  return {
    company_name: companyName,
    research_date: researchDate,
    media_coverage: {
      positive: [],
      negative: [],
      neutral: [],
      summary: 'Web research could not be completed at this time.',
    },
    litigation_history: {
      pending_cases: [],
      resolved_cases: [],
      summary: 'Web research could not be completed at this time.',
    },
    regulatory_actions: {
      actions: [],
      summary: 'Web research could not be completed at this time.',
    },
    overall_risk_assessment: 'Risk assessment unavailable due to research limitations.',
    research_sources: [],
    search_method: searchMethod,
  };
}

export async function searchCompanyLitigation(companyName: string): Promise<LitigationItem[]> {
  const results = await conductCompanyResearch(companyName);
  return [
    ...results.litigation_history.pending_cases,
    ...results.litigation_history.resolved_cases
  ];
}

export async function searchCompanyMedia(companyName: string): Promise<{positive: MediaCoverageItem[], negative: MediaCoverageItem[]}> {
  const results = await conductCompanyResearch(companyName);
  return {
    positive: results.media_coverage.positive,
    negative: results.media_coverage.negative
  };
}
