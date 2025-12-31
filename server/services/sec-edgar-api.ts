/**
 * SEC EDGAR API Service
 * 
 * The SEC provides free, public API access to all EDGAR filings.
 * No API key required - just need to provide a User-Agent header with contact info.
 * 
 * API Documentation: https://www.sec.gov/developer
 * Rate Limits: 10 requests per second
 */

export interface EdgarCompanyInfo {
  cik: string;
  entityType: string;
  name: string;
  sic: string;
  sicDescription: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  stateOfIncorporation: string;
  fiscalYearEnd: string;
  website?: string;
  formerNames?: Array<{ name: string; from: string; to: string }>;
}

export interface EdgarFiling {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  primaryDocument: string;
  primaryDocDescription: string;
  documentUrl: string;
  size: number;
}

export interface EdgarSearchResult {
  cik: string;
  companyName: string;
  filingType: string;
  filedDate: string;
  accessionNumber: string;
}

export interface FinancialSummary {
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  stockholdersEquity: number | null;
  cashAndEquivalents: number | null;
  longTermDebt: number | null;
  earningsPerShare: number | null;
  periodEnd: string | null;
}

export interface MaterialEvent {
  date: string;
  form: string;
  description: string;
  url: string;
  items: string[];
  requiresReview: boolean;
}

export interface SecEdgarResearchResult {
  isPublicCompany: boolean;
  companyInfo: EdgarCompanyInfo | null;
  financialSummary: FinancialSummary | null;
  recentFilings: EdgarFiling[];
  materialEvents: MaterialEvent[];
  searchMatches: EdgarSearchResult[];
  errors: string[];
}

class SecEdgarApiService {
  private readonly BASE_URL = 'https://data.sec.gov';
  private readonly SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index';
  private readonly headers: Record<string, string>;
  
  constructor() {
    const userAgent = process.env.SEC_EDGAR_USER_AGENT || 'Sentinel Counsel LLP compliance@sentinelcounsel.com';
    this.headers = {
      'User-Agent': userAgent,
      'Accept': 'application/json',
    };
  }

  /**
   * Main entry point: Research a company by name
   */
  async researchCompany(companyName: string): Promise<SecEdgarResearchResult> {
    const result: SecEdgarResearchResult = {
      isPublicCompany: false,
      companyInfo: null,
      financialSummary: null,
      recentFilings: [],
      materialEvents: [],
      searchMatches: [],
      errors: [],
    };

    try {
      // Step 1: Search for the company
      const searchResults = await this.searchCompany(companyName);
      result.searchMatches = searchResults;

      if (searchResults.length === 0) {
        return result;
      }

      // Step 2: Get the best match (first result)
      const bestMatch = searchResults[0];
      result.isPublicCompany = true;

      // Step 3: Get company info
      const companyInfo = await this.getCompanyInfo(bestMatch.cik);
      result.companyInfo = companyInfo;

      // Step 4: Get recent filings (parallel requests)
      const [filings, financials, materialEvents] = await Promise.all([
        this.getCompanyFilings(bestMatch.cik, undefined, 20),
        this.getFinancialSummary(bestMatch.cik),
        this.getMaterialEvents(bestMatch.cik, 10),
      ]);

      result.recentFilings = filings;
      result.financialSummary = financials;
      result.materialEvents = materialEvents;

    } catch (error: any) {
      result.errors.push(`SEC EDGAR search error: ${error.message}`);
    }

    return result;
  }

  /**
   * Search for companies by name
   */
  async searchCompany(companyName: string): Promise<EdgarSearchResult[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `${this.SEARCH_URL}?q="${encodeURIComponent(companyName)}"&dateRange=custom&startdt=2020-01-01&enddt=${today}&forms=10-K,10-Q,8-K`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        console.error(`SEC search failed: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      const companiesMap = new Map<string, EdgarSearchResult>();
      
      for (const hit of data.hits?.hits || []) {
        const cik = hit._source?.ciks?.[0];
        if (cik && !companiesMap.has(cik)) {
          companiesMap.set(cik, {
            cik: String(cik),
            companyName: hit._source?.display_names?.[0] || hit._source?.entity || companyName,
            filingType: hit._source?.form || '',
            filedDate: hit._source?.file_date || '',
            accessionNumber: hit._source?.adsh || '',
          });
        }
      }
      
      return Array.from(companiesMap.values());
    } catch (error) {
      console.error('SEC company search failed:', error);
      return [];
    }
  }

  /**
   * Look up a company by ticker symbol
   */
  async getCompanyByTicker(ticker: string): Promise<EdgarCompanyInfo | null> {
    try {
      const tickerResponse = await fetch(
        'https://www.sec.gov/files/company_tickers.json',
        { headers: this.headers }
      );
      
      if (!tickerResponse.ok) return null;
      
      const tickerData = await tickerResponse.json();
      
      for (const key in tickerData) {
        if (tickerData[key].ticker?.toUpperCase() === ticker.toUpperCase()) {
          const cik = String(tickerData[key].cik_str);
          return this.getCompanyInfo(cik);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ticker lookup failed:', error);
      return null;
    }
  }

  /**
   * Get detailed company information by CIK
   */
  async getCompanyInfo(cik: string): Promise<EdgarCompanyInfo | null> {
    try {
      const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
      
      const response = await fetch(
        `${this.BASE_URL}/submissions/CIK${paddedCik}.json`,
        { headers: this.headers }
      );
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get company info: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        cik: data.cik,
        entityType: data.entityType || 'Unknown',
        name: data.name,
        sic: data.sic || '',
        sicDescription: data.sicDescription || '',
        tickers: data.tickers || [],
        exchanges: data.exchanges || [],
        ein: data.ein || '',
        stateOfIncorporation: data.stateOfIncorporation || '',
        fiscalYearEnd: data.fiscalYearEnd || '',
        formerNames: data.formerNames || [],
      };
    } catch (error) {
      console.error('Get company info failed:', error);
      return null;
    }
  }

  /**
   * Get filings for a company
   */
  async getCompanyFilings(cik: string, formTypes?: string[], limit: number = 50): Promise<EdgarFiling[]> {
    try {
      const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
      
      const response = await fetch(
        `${this.BASE_URL}/submissions/CIK${paddedCik}.json`,
        { headers: this.headers }
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const recent = data.filings?.recent;
      
      if (!recent) return [];
      
      const filings: EdgarFiling[] = [];
      const maxItems = Math.min(recent.form.length, limit);
      
      for (let i = 0; i < maxItems; i++) {
        const form = recent.form[i];
        
        if (formTypes && formTypes.length > 0 && !formTypes.includes(form)) {
          continue;
        }
        
        const accessionNumber = recent.accessionNumber[i];
        const primaryDocument = recent.primaryDocument[i];
        
        filings.push({
          accessionNumber,
          form,
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate[i] || '',
          acceptanceDateTime: recent.acceptanceDateTime[i] || '',
          primaryDocument,
          primaryDocDescription: recent.primaryDocDescription[i] || '',
          size: recent.size[i] || 0,
          documentUrl: this.buildDocumentUrl(data.cik, accessionNumber, primaryDocument),
        });
      }
      
      return filings;
    } catch (error) {
      console.error('Get company filings failed:', error);
      return [];
    }
  }

  private buildDocumentUrl(cik: string, accessionNumber: string, document: string): string {
    const accessionFormatted = accessionNumber.replace(/-/g, '');
    return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionFormatted}/${document}`;
  }

  /**
   * Get structured financial data (XBRL)
   */
  async getCompanyFacts(cik: string): Promise<any> {
    try {
      const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
      
      const response = await fetch(
        `${this.BASE_URL}/api/xbrl/companyfacts/CIK${paddedCik}.json`,
        { headers: this.headers }
      );
      
      if (!response.ok) return null;
      
      return response.json();
    } catch (error) {
      console.error('Get company facts failed:', error);
      return null;
    }
  }

  /**
   * Extract key financial metrics from XBRL data
   */
  async getFinancialSummary(cik: string): Promise<FinancialSummary> {
    const empty: FinancialSummary = {
      revenue: null,
      netIncome: null,
      totalAssets: null,
      totalLiabilities: null,
      stockholdersEquity: null,
      cashAndEquivalents: null,
      longTermDebt: null,
      earningsPerShare: null,
      periodEnd: null,
    };

    const facts = await this.getCompanyFacts(cik);
    if (!facts) return empty;
    
    const usgaap = facts.facts?.['us-gaap'] || {};
    
    const getMostRecent = (concepts: string[], unit: string = 'USD'): { value: number | null; period: string | null } => {
      for (const concept of concepts) {
        const values = usgaap[concept]?.units?.[unit];
        if (values?.length) {
          const annual = values
            .filter((v: any) => v.form === '10-K' && v.frame)
            .sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
          
          if (annual.length > 0) {
            return { value: annual[0].val, period: annual[0].end };
          }
        }
      }
      return { value: null, period: null };
    };

    const revenue = getMostRecent([
      'Revenues',
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'SalesRevenueNet',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
    ]);

    return {
      revenue: revenue.value,
      netIncome: getMostRecent(['NetIncomeLoss', 'ProfitLoss']).value,
      totalAssets: getMostRecent(['Assets']).value,
      totalLiabilities: getMostRecent(['Liabilities']).value,
      stockholdersEquity: getMostRecent(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']).value,
      cashAndEquivalents: getMostRecent(['CashAndCashEquivalentsAtCarryingValue', 'Cash']).value,
      longTermDebt: getMostRecent(['LongTermDebt', 'LongTermDebtNoncurrent']).value,
      earningsPerShare: getMostRecent(['EarningsPerShareBasic'], 'USD/shares').value,
      periodEnd: revenue.period,
    };
  }

  /**
   * Get recent 8-K filings and identify material events
   */
  async getMaterialEvents(cik: string, limit: number = 20): Promise<MaterialEvent[]> {
    const eightKFilings = await this.getCompanyFilings(cik, ['8-K', '8-K/A'], limit);
    
    const significantItems: Record<string, string> = {
      '1.01': 'Entry into Material Definitive Agreement',
      '1.02': 'Termination of Material Definitive Agreement',
      '1.03': 'Bankruptcy or Receivership',
      '2.01': 'Completion of Acquisition or Disposition of Assets',
      '2.02': 'Results of Operations and Financial Condition',
      '2.03': 'Creation of Direct Financial Obligation',
      '2.04': 'Triggering Events That Accelerate or Increase Obligations',
      '2.05': 'Exit or Disposal Activities',
      '2.06': 'Material Impairments',
      '3.01': 'Notice of Delisting',
      '3.02': 'Unregistered Sales of Equity Securities',
      '3.03': 'Material Modification to Rights of Security Holders',
      '4.01': 'Changes in Registrant\'s Certifying Accountant',
      '4.02': 'Non-Reliance on Previously Issued Financial Statements',
      '5.01': 'Changes in Control of Registrant',
      '5.02': 'Departure of Directors or Certain Officers; Election of Directors',
      '5.03': 'Amendments to Articles of Incorporation or Bylaws',
      '5.05': 'Amendments to Registrant\'s Code of Ethics',
      '5.06': 'Change in Shell Company Status',
      '5.07': 'Submission of Matters to a Vote of Security Holders',
      '7.01': 'Regulation FD Disclosure',
      '8.01': 'Other Events',
      '9.01': 'Financial Statements and Exhibits',
    };
    
    const highPriorityItems = ['1.01', '1.02', '1.03', '2.01', '2.05', '2.06', '3.01', '4.01', '4.02', '5.01', '5.02'];
    
    return eightKFilings.map(filing => {
      const items: string[] = [];
      let requiresReview = false;
      
      const description = filing.primaryDocDescription || '';
      for (const [itemNum, itemDesc] of Object.entries(significantItems)) {
        if (description.includes(itemNum) || description.includes(itemDesc)) {
          items.push(`${itemNum}: ${itemDesc}`);
          if (highPriorityItems.includes(itemNum)) {
            requiresReview = true;
          }
        }
      }
      
      return {
        date: filing.filingDate,
        form: filing.form,
        description: filing.primaryDocDescription || 'Form 8-K Filing',
        url: filing.documentUrl,
        items,
        requiresReview,
      };
    });
  }

  /**
   * Format financial number for display
   */
  formatFinancialNumber(value: number | null): string {
    if (value === null) return 'N/A';
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1e12) {
      return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
      return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
    }
    return `${sign}$${absValue.toFixed(2)}`;
  }

  /**
   * Generate a summary report for AI analysis
   */
  generateSummaryForAI(result: SecEdgarResearchResult): string {
    const lines: string[] = [];
    
    if (!result.isPublicCompany) {
      lines.push('SEC EDGAR Search: No public company filings found for this entity.');
      lines.push('This may indicate the company is privately held, a subsidiary, or operates under a different name.');
      return lines.join('\n');
    }
    
    const info = result.companyInfo;
    if (info) {
      lines.push('=== SEC EDGAR COMPANY INFORMATION ===');
      lines.push(`Company Name: ${info.name}`);
      lines.push(`CIK: ${info.cik}`);
      lines.push(`Entity Type: ${info.entityType}`);
      lines.push(`State of Incorporation: ${info.stateOfIncorporation || 'N/A'}`);
      lines.push(`SIC Industry: ${info.sicDescription} (${info.sic})`);
      lines.push(`Stock Tickers: ${info.tickers.length > 0 ? info.tickers.join(', ') : 'None'}`);
      lines.push(`Exchanges: ${info.exchanges.length > 0 ? info.exchanges.join(', ') : 'N/A'}`);
      lines.push(`EIN: ${info.ein || 'N/A'}`);
      lines.push(`Fiscal Year End: ${info.fiscalYearEnd || 'N/A'}`);
      
      if (info.formerNames && info.formerNames.length > 0) {
        lines.push(`Former Names: ${info.formerNames.map(fn => fn.name).join('; ')}`);
      }
      lines.push('');
    }
    
    const fin = result.financialSummary;
    if (fin) {
      lines.push('=== FINANCIAL SUMMARY (Most Recent 10-K) ===');
      lines.push(`Period Ending: ${fin.periodEnd || 'N/A'}`);
      lines.push(`Revenue: ${this.formatFinancialNumber(fin.revenue)}`);
      lines.push(`Net Income: ${this.formatFinancialNumber(fin.netIncome)}`);
      lines.push(`Total Assets: ${this.formatFinancialNumber(fin.totalAssets)}`);
      lines.push(`Total Liabilities: ${this.formatFinancialNumber(fin.totalLiabilities)}`);
      lines.push(`Stockholders Equity: ${this.formatFinancialNumber(fin.stockholdersEquity)}`);
      lines.push(`Cash & Equivalents: ${this.formatFinancialNumber(fin.cashAndEquivalents)}`);
      lines.push(`Long-term Debt: ${this.formatFinancialNumber(fin.longTermDebt)}`);
      lines.push(`EPS: ${fin.earningsPerShare !== null ? `$${fin.earningsPerShare.toFixed(2)}` : 'N/A'}`);
      lines.push('');
    }
    
    if (result.recentFilings.length > 0) {
      lines.push('=== RECENT SEC FILINGS ===');
      const keyFilings = result.recentFilings.slice(0, 10);
      for (const filing of keyFilings) {
        lines.push(`- ${filing.filingDate}: ${filing.form} - ${filing.primaryDocDescription || 'N/A'}`);
      }
      lines.push('');
    }
    
    const criticalEvents = result.materialEvents.filter(e => e.requiresReview);
    if (criticalEvents.length > 0) {
      lines.push('=== MATERIAL EVENTS REQUIRING REVIEW ===');
      for (const event of criticalEvents) {
        lines.push(`- ${event.date}: ${event.description}`);
        for (const item of event.items) {
          lines.push(`    * ${item}`);
        }
      }
      lines.push('');
    }
    
    if (result.errors.length > 0) {
      lines.push('=== SEC RESEARCH ERRORS ===');
      for (const error of result.errors) {
        lines.push(`- ${error}`);
      }
    }
    
    return lines.join('\n');
  }
}

export const secEdgarApi = new SecEdgarApiService();
