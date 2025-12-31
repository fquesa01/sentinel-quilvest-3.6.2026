// Business Summary Types - 14-section structure for comprehensive company analysis
// Includes internal document analysis + external web research (media coverage, litigation, regulatory)

export interface BusinessSummarySource {
  id: string;
  type: 'email' | 'contract' | 'slide' | 'sheet' | 'pdf' | 'doc' | 'txt' | 'other';
  snippet: string;
  redaction_reason?: string | null;
}

export interface BusinessSummaryMeta {
  company_name: string;
  report_date: string;
  sources: BusinessSummarySource[];
  overall_confidence: number;
}

export interface TopMetrics {
  revenue_estimate?: string | null;
  clients_count?: number | null;
  geography?: string | null;
  [key: string]: any;
}

export interface ExecutiveSummary {
  one_paragraph: string;
  top_metrics: TopMetrics;
  top_risks: string[];
}

export interface Evidence {
  source: string;
  lines?: string | null;
  confidence: number;
}

export interface BusinessLine {
  name: string;
  description: string;
  data_sources: string[];
  workflow_summary: string;
  estimated_value_per_case: number | string | null;
  evidence: Evidence[];
}

export interface TimelineEntry {
  date: string;
  event: string;
  source?: string | string[] | null;
  date_certainty?: 'day' | 'month' | 'year' | null;
}

export interface OrgChartEntry {
  name: string;
  role: string;
  source?: string | null;
}

export interface CorporateHistory {
  timeline: TimelineEntry[];
  entities: string[];
  org_chart: OrgChartEntry[];
}

export interface Transaction {
  date: string;
  parties: string[];
  summary: string;
  documents: string[];
}

export interface Transactions {
  timeline: Transaction[];
}

export interface Client {
  name: string;
  contract_summary: string;
  source?: string | null;
}

export interface Partner {
  name: string;
  role: string;
  documents: string[];
}

export interface SoftwareSystem {
  name: string;
  category: string;
  purpose: string;
  source?: string | null;
}

export interface HardwareSystem {
  name: string;
  type: string;
  purpose?: string | null;
  source?: string | null;
}

export interface TechStack {
  summary: string | null;
  software: SoftwareSystem[];
  hardware: HardwareSystem[];
  tools: string[];
}

export interface PersonnelMember {
  name: string;
  title: string;
  role: string;
  email?: string | null;
  department?: string | null;
  source?: string | null;
  is_c_suite?: boolean | null;
}

export interface Personnel {
  summary: string | null;
  org_structure: string | null;
  members: PersonnelMember[];
}

export interface ActiveCase {
  case_name: string;
  court?: string | null;
  status?: string | null;
  source?: string | null;
  confidence?: number | null;
}

export interface RegulatoryContact {
  agency: string;
  notes: string;
  source?: string | null;
}

export interface LitigationAndRisk {
  active_cases: ActiveCase[];
  regulatory_contacts: RegulatoryContact[];
}

export interface Financials {
  summary?: string | null;
}

export interface Exhibit {
  type: string;
  title: string;
  source?: string | null;
  page?: number | null;
}

export interface Appendix {
  glossary: string[];
  raw_source_index: string[];
}

// Entity Involvement Types - Track participants across communications
export interface EntityInvolvementEntry {
  name: string;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  communication_count: number;
  document_count: number;
  as_sender: number;
  as_recipient: number;
  mentioned_in_body: number;
  first_seen?: string | null;
  last_seen?: string | null;
}

export interface EntityInvolvement {
  employees: EntityInvolvementEntry[];
  third_parties: EntityInvolvementEntry[];
  vendors: EntityInvolvementEntry[];
  total_unique_entities: number;
  total_communications_analyzed: number;
  extraction_date: string;
}

// External Web Research Types - Section 13 & 14

export interface MediaCoverageItem {
  headline: string;
  source: string;
  date: string;
  url: string | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  relevance_score: number;
}

export interface MediaCoverage {
  positive: MediaCoverageItem[];
  negative: MediaCoverageItem[];
  neutral: MediaCoverageItem[];
  summary: string;
}

export interface ExternalLitigationItem {
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

export interface ExternalLitigation {
  pending_cases: ExternalLitigationItem[];
  resolved_cases: ExternalLitigationItem[];
  summary: string;
}

export interface RegulatoryActionItem {
  agency: string;
  action_type: string;
  date: string | null;
  description: string;
  status: string;
  penalties: string | null;
  source_url: string | null;
}

export interface ExternalRegulatoryActions {
  actions: RegulatoryActionItem[];
  summary: string;
}

export interface WebResearch {
  research_date: string;
  media_coverage: MediaCoverage;
  external_litigation: ExternalLitigation;
  regulatory_actions: ExternalRegulatoryActions;
  overall_risk_assessment: string;
  research_sources: string[];
  search_method?: 'web_search' | 'ai_knowledge';
}

// Behavioral Assessment - Extracted from communication patterns
export interface BehavioralAssessment {
  trust_and_transparency: string;
  conflict_management: string;
  accountability: string;
  cultural_concerns: string[];
}

// Operational Risk Item
export interface OperationalRiskItem {
  risk: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  description: string;
}

// Strategic Recommendation
export interface StrategicRecommendation {
  category: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'immediate' | string;
}

// Relationship Mapping - Enhanced entity relationships and influence
export interface PersonToPersonRelation {
  person1: string;
  person2: string;
  relationship_type: string;
  frequency: string;
}

export interface PersonToOrgRelation {
  person: string;
  organization: string;
  role: string;
}

export interface OrgToOrgRelation {
  org1: string;
  org2: string;
  relationship_type: string;
}

export interface InfluenceAnalysis {
  central_people: string[];
  core_inner_circle: string;
  secondary_circle: string;
  outliers: string;
}

export interface RelationshipMapping {
  person_to_person: PersonToPersonRelation[];
  person_to_org: PersonToOrgRelation[];
  org_to_org: OrgToOrgRelation[];
  influence_analysis: InfluenceAnalysis;
}

export interface BusinessSummary {
  meta: BusinessSummaryMeta;
  executive_summary: ExecutiveSummary;
  business_lines: BusinessLine[];
  corporate_history: CorporateHistory;
  transactions: Transactions;
  clients: Client[];
  partners: Partner[];
  tech_stack: TechStack;
  personnel: Personnel;
  litigation_and_risk: LitigationAndRisk;
  financials: Financials;
  exhibits: Exhibit[];
  appendix: Appendix;
  // Entity involvement - extracted from communications metadata
  entity_involvement?: EntityInvolvement | null;
  // External web research sections (optional - populated when web research is enabled)
  web_research?: WebResearch | null;
  // Enhanced analysis sections (optional - populated by comprehensive prompts)
  behavioral_assessment?: BehavioralAssessment | null;
  operational_risks?: OperationalRiskItem[] | null;
  recommendations?: StrategicRecommendation[] | null;
  relationship_mapping?: RelationshipMapping | null;
  // Master report - Full 18-section narrative report from AI synthesis
  // This is the primary report content generated using the comprehensive bi-prompts
  master_report?: string | null;
}
