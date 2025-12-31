/**
 * Corporate Research API Service
 * 
 * Provides corporate entity research including:
 * - OpenCorporates company data (free tier)
 * - UCC filing search structure (requires provider API key)
 * - AI-enhanced corporate intelligence synthesis
 */

export interface CorporateEntityInfo {
  name: string;
  companyNumber: string;
  jurisdiction: string;
  status: string;
  incorporationDate: string | null;
  companyType: string;
  registeredAddress: string | null;
  agentName: string | null;
  agentAddress: string | null;
  sourceUrl: string;
}

export interface UCCFiling {
  filingNumber: string;
  filingDate: string;
  filingType: string;
  securedParty: string;
  debtor: string;
  collateralDescription: string;
  status: string;
  jurisdiction: string;
  expirationDate: string | null;
}

export interface OfficerInfo {
  name: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export interface CorporateResearchResult {
  entityFound: boolean;
  companyInfo: CorporateEntityInfo | null;
  officers: OfficerInfo[];
  uccFilings: UCCFiling[];
  subsidiaries: CorporateEntityInfo[];
  relatedEntities: CorporateEntityInfo[];
  errors: string[];
  dataSource: string;
}

class CorporateResearchService {
  private readonly openCorporatesBaseUrl = 'https://api.opencorporates.com/v0.4';
  private readonly openCorporatesApiKey = process.env.OPENCORPORATES_API_KEY;

  /**
   * Main entry point: Research a company
   */
  async researchCompany(companyName: string, jurisdiction?: string): Promise<CorporateResearchResult> {
    const result: CorporateResearchResult = {
      entityFound: false,
      companyInfo: null,
      officers: [],
      uccFilings: [],
      subsidiaries: [],
      relatedEntities: [],
      errors: [],
      dataSource: 'opencorporates',
    };

    try {
      // Step 1: Search OpenCorporates for the company
      const searchResults = await this.searchOpenCorporates(companyName, jurisdiction);
      
      if (searchResults.length === 0) {
        result.errors.push('No matching companies found in OpenCorporates database');
        return result;
      }

      // Get the best match (first result)
      const bestMatch = searchResults[0];
      result.entityFound = true;
      result.companyInfo = bestMatch;

      // Step 2: Get officers if available
      if (bestMatch.jurisdiction && bestMatch.companyNumber) {
        result.officers = await this.getCompanyOfficers(bestMatch.jurisdiction, bestMatch.companyNumber);
      }

      // Step 3: Search for related entities
      result.relatedEntities = searchResults.slice(1, 5);

    } catch (error: any) {
      result.errors.push(`Corporate research error: ${error.message}`);
    }

    return result;
  }

  /**
   * Search OpenCorporates for companies
   */
  async searchOpenCorporates(companyName: string, jurisdiction?: string): Promise<CorporateEntityInfo[]> {
    try {
      let url = `${this.openCorporatesBaseUrl}/companies/search?q=${encodeURIComponent(companyName)}`;
      
      if (jurisdiction) {
        url += `&jurisdiction_code=${encodeURIComponent(jurisdiction.toLowerCase())}`;
      }
      
      if (this.openCorporatesApiKey) {
        url += `&api_token=${this.openCorporatesApiKey}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('OpenCorporates API key invalid or missing');
        }
        return [];
      }

      const data = await response.json();
      const companies = data.results?.companies || [];

      return companies.map((item: any) => {
        const company = item.company;
        return {
          name: company.name,
          companyNumber: company.company_number,
          jurisdiction: company.jurisdiction_code?.toUpperCase() || '',
          status: company.current_status || 'Unknown',
          incorporationDate: company.incorporation_date,
          companyType: company.company_type || 'Unknown',
          registeredAddress: this.formatAddress(company.registered_address),
          agentName: company.agent_name || null,
          agentAddress: company.agent_address || null,
          sourceUrl: company.opencorporates_url || '',
        };
      });
    } catch (error) {
      console.error('OpenCorporates search failed:', error);
      return [];
    }
  }

  /**
   * Get company officers from OpenCorporates
   */
  async getCompanyOfficers(jurisdiction: string, companyNumber: string): Promise<OfficerInfo[]> {
    try {
      let url = `${this.openCorporatesBaseUrl}/companies/${jurisdiction.toLowerCase()}/${companyNumber}`;
      
      if (this.openCorporatesApiKey) {
        url += `?api_token=${this.openCorporatesApiKey}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) return [];

      const data = await response.json();
      const officers = data.results?.company?.officers || [];

      return officers.map((item: any) => {
        const officer = item.officer;
        return {
          name: officer.name,
          position: officer.position || 'Unknown',
          startDate: officer.start_date,
          endDate: officer.end_date,
          status: officer.end_date ? 'Inactive' : 'Active',
        };
      });
    } catch (error) {
      console.error('Failed to get company officers:', error);
      return [];
    }
  }

  private formatAddress(address: any): string | null {
    if (!address) return null;
    if (typeof address === 'string') return address;
    
    const parts = [
      address.street_address,
      address.locality,
      address.region,
      address.postal_code,
      address.country,
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Placeholder for UCC search
   * This would integrate with providers like InfoTrack, CSC, CT Corp, etc.
   */
  async searchUCCFilings(companyName: string, state?: string): Promise<UCCFiling[]> {
    const provider = process.env.UCC_PROVIDER;
    const apiKey = process.env.UCC_PROVIDER_API_KEY;
    
    if (!provider || !apiKey) {
      console.log('UCC search not configured - no provider API key set');
      return [];
    }

    // Provider-specific implementations would go here
    switch (provider.toLowerCase()) {
      case 'infotrack':
        return this.searchInfoTrack(companyName, state);
      case 'csc':
        return this.searchCSC(companyName, state);
      default:
        console.warn(`Unknown UCC provider: ${provider}`);
        return [];
    }
  }

  private async searchInfoTrack(companyName: string, state?: string): Promise<UCCFiling[]> {
    // InfoTrack UCC search implementation would go here
    console.log('InfoTrack UCC search not yet implemented');
    return [];
  }

  private async searchCSC(companyName: string, state?: string): Promise<UCCFiling[]> {
    // CSC UCC search implementation would go here
    console.log('CSC UCC search not yet implemented');
    return [];
  }

  /**
   * Generate a summary report for AI analysis
   */
  generateSummaryForAI(result: CorporateResearchResult): string {
    const lines: string[] = [];
    
    if (!result.entityFound) {
      lines.push('CORPORATE RESEARCH: No matching entity found in corporate databases.');
      lines.push('This may indicate the company is newly formed, operates under a DBA, or is not registered in searched jurisdictions.');
      return lines.join('\n');
    }

    const info = result.companyInfo;
    if (info) {
      lines.push('=== CORPORATE ENTITY INFORMATION ===');
      lines.push(`Legal Name: ${info.name}`);
      lines.push(`Company Number: ${info.companyNumber}`);
      lines.push(`Jurisdiction: ${info.jurisdiction}`);
      lines.push(`Status: ${info.status}`);
      lines.push(`Entity Type: ${info.companyType}`);
      lines.push(`Incorporation Date: ${info.incorporationDate || 'N/A'}`);
      lines.push(`Registered Address: ${info.registeredAddress || 'N/A'}`);
      if (info.agentName) {
        lines.push(`Registered Agent: ${info.agentName}`);
        lines.push(`Agent Address: ${info.agentAddress || 'N/A'}`);
      }
      lines.push(`Source: ${info.sourceUrl}`);
      lines.push('');
    }

    if (result.officers.length > 0) {
      lines.push('=== OFFICERS & DIRECTORS ===');
      for (const officer of result.officers) {
        const status = officer.status === 'Active' ? '' : ' (Inactive)';
        lines.push(`- ${officer.name}: ${officer.position}${status}`);
        if (officer.startDate) {
          lines.push(`    Started: ${officer.startDate}`);
        }
      }
      lines.push('');
    }

    if (result.uccFilings.length > 0) {
      lines.push('=== UCC FILINGS ===');
      for (const ucc of result.uccFilings) {
        lines.push(`- Filing #${ucc.filingNumber} (${ucc.filingDate})`);
        lines.push(`    Type: ${ucc.filingType} | Status: ${ucc.status}`);
        lines.push(`    Secured Party: ${ucc.securedParty}`);
        lines.push(`    Collateral: ${ucc.collateralDescription}`);
      }
      lines.push('');
    } else {
      lines.push('=== UCC FILINGS ===');
      lines.push('No UCC filings search was performed (UCC provider not configured).');
      lines.push('');
    }

    if (result.relatedEntities.length > 0) {
      lines.push('=== RELATED ENTITIES (Possible Matches) ===');
      for (const entity of result.relatedEntities) {
        lines.push(`- ${entity.name} (${entity.jurisdiction}) - ${entity.status}`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('=== RESEARCH NOTES ===');
      for (const error of result.errors) {
        lines.push(`- ${error}`);
      }
    }

    return lines.join('\n');
  }
}

export const corporateResearchApi = new CorporateResearchService();
