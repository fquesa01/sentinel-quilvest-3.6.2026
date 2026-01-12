-- Sentinel Counsel LLP
-- Due Diligence Boolean Query Seed Data
-- Generated: January 2026

-- =====================================================
-- SEED DATA: DD_SECTIONS
-- =====================================================

INSERT INTO dd_sections (section_number, name, description, requires_web_search, display_order, is_active) VALUES
(1, 'Corporate Structure & Organization', 'Formation documents, governance, organizational charts, and corporate records', FALSE, 1, TRUE),
(2, 'Capitalization & Ownership', 'Cap tables, equity ownership, stock ledgers, and equity instruments', FALSE, 2, TRUE),
(3, 'Subsidiaries & Joint Ventures', 'Subsidiary entities, JV agreements, and intercompany relationships', FALSE, 3, TRUE),
(4, 'Financial Due Diligence', 'Financial statements, audit reports, and accounting policies', FALSE, 4, TRUE),
(5, 'Quality of Earnings Analysis', 'EBITDA adjustments, earnings quality, and pro forma analysis', FALSE, 5, TRUE),
(6, 'Working Capital Analysis', 'Net working capital, A/R, A/P, inventory, and accruals', FALSE, 6, TRUE),
(7, 'Debt & Capital Structure', 'Credit agreements, security documents, and debt instruments', FALSE, 7, TRUE),
(8, 'Tax Matters & Compliance', 'Tax returns, provisions, audits, and compliance matters', FALSE, 8, TRUE),
(9, 'Legal & Litigation Review', 'Pending/threatened litigation, settlements, and disputes', FALSE, 9, TRUE),
(10, 'Material Contracts Analysis', 'Key customer/supplier agreements and material contracts', FALSE, 10, TRUE),
(11, 'Intellectual Property Assessment', 'Patents, trademarks, copyrights, and IP licenses', FALSE, 11, TRUE),
(12, 'Real Property & Leases', 'Real estate holdings, leases, and property matters', FALSE, 12, TRUE),
(13, 'Environmental Compliance', 'Environmental permits, compliance, and contamination issues', FALSE, 13, TRUE),
(14, 'Human Resources & Labor', 'Employment matters, HR policies, and labor relations', FALSE, 14, TRUE),
(15, 'Insurance Coverage Review', 'Insurance policies, coverage analysis, and claims history', FALSE, 15, TRUE),
(16, 'IT & Cybersecurity', 'IT infrastructure, security assessments, and data protection', FALSE, 16, TRUE),
(17, 'Regulatory & Compliance', 'Licenses, permits, and regulatory compliance matters', FALSE, 17, TRUE),
(18, 'Customer & Vendor Analysis', 'Customer/vendor concentration and key relationships', FALSE, 18, TRUE),
(19, 'Integration Considerations', 'Integration planning, synergies, and transition matters', FALSE, 19, TRUE),
(20, 'Risk Summary & Red Flags', 'Material risks, red flags, and deal issues', FALSE, 20, TRUE),
(21, 'Media Coverage Analysis', 'External news and media coverage via web search', TRUE, 21, TRUE),
(22, 'External Litigation Research', 'Public court records and litigation research', TRUE, 22, TRUE),
(23, 'Regulatory Actions & Enforcement', 'Government enforcement actions and regulatory penalties', TRUE, 23, TRUE);

-- =====================================================
-- SEED DATA: DD_BOOLEAN_QUERIES (Primary)
-- =====================================================

INSERT INTO dd_boolean_queries (section_id, query_type, query_text, description, version, is_active) VALUES
-- Section 1: Corporate Structure
(1, 'primary', '(certificate of incorporation OR articles of incorporation OR articles of organization OR certificate of formation OR bylaws OR operating agreement OR partnership agreement OR organizational chart OR org chart) AND (company OR corporation OR LLC OR entity)', 'Core corporate formation and governance documents', 1, TRUE),
(1, 'secondary', '(board minutes OR board resolution OR written consent OR stockholder consent OR shareholder resolution OR unanimous consent OR corporate records OR minute book OR stock ledger OR membership ledger)', 'Corporate actions and meeting records', 1, TRUE),
(1, 'risk_indicator', '(amendment OR restatement OR merger OR conversion OR dissolution OR default OR breach)', 'Risk-related terms for corporate structure', 1, TRUE),

-- Section 2: Capitalization
(2, 'primary', '(cap table OR capitalization table OR stock ledger OR membership interest OR equity ownership OR shareholder register OR unit ledger OR ownership schedule) AND (shares OR units OR interests OR equity)', 'Equity ownership and capitalization records', 1, TRUE),
(2, 'secondary', '(stock purchase agreement OR subscription agreement OR option agreement OR warrant OR convertible note OR SAFE OR equity incentive plan OR stock option plan OR restricted stock OR RSU OR phantom equity OR profits interest)', 'Equity instruments and incentive plans', 1, TRUE),
(2, 'risk_indicator', '(anti-dilution OR liquidation preference OR participating preferred OR ratchet OR preemptive rights OR ROFR OR drag-along OR tag-along)', 'Risk-related capitalization terms', 1, TRUE),

-- Section 3: Subsidiaries
(3, 'primary', '(subsidiary OR subsidiaries OR affiliate OR joint venture OR JV OR minority interest OR holding company OR parent company OR controlled entity) AND (ownership OR equity OR interest)', 'Subsidiary and affiliate entities', 1, TRUE),
(3, 'secondary', '(intercompany agreement OR management agreement OR services agreement OR JV agreement OR joint venture agreement OR shareholders agreement OR LLC agreement OR contribution agreement)', 'Intercompany arrangements', 1, TRUE),
(3, 'risk_indicator', '(minority holder rights OR deadlock OR buyout OR put option OR call option OR dissolution OR wind-down)', 'Subsidiary risk terms', 1, TRUE),

-- Section 4: Financial DD
(4, 'primary', '(financial statement OR balance sheet OR income statement OR P&L OR profit and loss OR cash flow statement OR statement of operations OR audited financials OR reviewed financials) AND (annual OR quarterly OR monthly OR YTD OR year-to-date)', 'Core financial statements', 1, TRUE),
(4, 'secondary', '(audit report OR management letter OR GAAP OR accounting policy OR revenue recognition OR deferred revenue OR accounts receivable aging OR accounts payable aging OR inventory valuation OR fixed asset schedule OR depreciation schedule)', 'Supporting financial documents', 1, TRUE),
(4, 'risk_indicator', '(qualified opinion OR going concern OR material weakness OR restatement OR adjustment OR write-off OR impairment OR contingent liability)', 'Financial risk indicators', 1, TRUE),

-- Section 5: Quality of Earnings
(5, 'primary', '(quality of earnings OR QofE OR earnings quality OR EBITDA OR adjusted EBITDA OR normalized earnings OR pro forma) AND (analysis OR adjustment OR reconciliation)', 'QofE analysis documents', 1, TRUE),
(5, 'secondary', '(add-back OR adjustment schedule OR one-time OR non-recurring OR normalization OR run-rate OR synergy OR cost savings OR revenue bridge OR EBITDA bridge)', 'EBITDA adjustment details', 1, TRUE),
(5, 'risk_indicator', '(aggressive add-back OR unsupported adjustment OR related party OR unusual transaction OR timing difference OR classification error)', 'QofE risk terms', 1, TRUE),

-- Section 6: Working Capital
(6, 'primary', '(working capital OR net working capital OR NWC OR current assets OR current liabilities OR working capital target OR peg OR true-up)', 'Working capital documents', 1, TRUE),
(6, 'secondary', '(accounts receivable OR A/R OR accounts payable OR A/P OR inventory OR prepaid expense OR accrued expense OR deferred revenue OR unbilled revenue OR WIP OR work in progress)', 'Working capital components', 1, TRUE),
(6, 'risk_indicator', '(concentration OR past due OR slow moving OR obsolete OR disputed OR reserve adequacy OR seasonality)', 'Working capital risk terms', 1, TRUE),

-- Section 7: Debt
(7, 'primary', '(credit agreement OR loan agreement OR term loan OR revolving credit OR revolver OR promissory note OR indenture OR bond OR debenture) AND (debt OR loan OR credit OR borrowing)', 'Debt instruments', 1, TRUE),
(7, 'secondary', '(security agreement OR pledge agreement OR guaranty OR guarantee OR subordination agreement OR intercreditor OR collateral OR lien OR UCC OR mortgage OR deed of trust)', 'Security and collateral documents', 1, TRUE),
(7, 'risk_indicator', '(default OR event of default OR covenant breach OR cross-default OR acceleration OR prepayment penalty OR change of control)', 'Debt risk indicators', 1, TRUE),

-- Section 8: Tax
(8, 'primary', '(tax return OR Form 1120 OR Form 1065 OR K-1 OR Schedule K-1 OR tax provision OR tax liability OR tax asset) AND (federal OR state OR local OR income OR franchise)', 'Tax returns and provisions', 1, TRUE),
(8, 'secondary', '(tax audit OR IRS OR notice of deficiency OR tax assessment OR tax controversy OR transfer pricing OR nexus OR sales tax OR use tax OR property tax OR payroll tax OR withholding)', 'Tax compliance and audits', 1, TRUE),
(8, 'risk_indicator', '(audit OR assessment OR deficiency OR penalty OR interest OR uncertain tax position OR NOL limitation OR 382 limitation)', 'Tax risk terms', 1, TRUE),

-- Section 9: Litigation
(9, 'primary', '(litigation OR lawsuit OR legal action OR complaint OR petition OR arbitration OR mediation OR dispute OR claim) AND (pending OR threatened OR potential OR settled)', 'Litigation matters', 1, TRUE),
(9, 'secondary', '(settlement agreement OR consent decree OR judgment OR verdict OR injunction OR restraining order OR class action OR derivative action OR demand letter OR cease and desist)', 'Litigation outcomes and settlements', 1, TRUE),
(9, 'risk_indicator', '(material litigation OR class action OR government investigation OR qui tam OR whistleblower OR injunction OR punitive damages)', 'Litigation risk indicators', 1, TRUE),

-- Section 10: Material Contracts
(10, 'primary', '(material contract OR significant agreement OR key contract OR major customer OR major supplier OR material agreement) AND (revenue OR sales OR supply OR purchase)', 'Material contracts', 1, TRUE),
(10, 'secondary', '(master services agreement OR MSA OR supply agreement OR distribution agreement OR licensing agreement OR OEM agreement OR co-marketing OR reseller agreement OR purchase order OR blanket order)', 'Contract types', 1, TRUE),
(10, 'risk_indicator', '(termination for convenience OR auto-renewal OR price adjustment OR MFN OR exclusivity OR non-compete OR change of control OR assignment restriction)', 'Contract risk terms', 1, TRUE),

-- Section 11: IP
(11, 'primary', '(patent OR trademark OR copyright OR trade secret OR intellectual property OR IP) AND (owned OR licensed OR registered OR pending OR application)', 'IP assets', 1, TRUE),
(11, 'secondary', '(patent application OR patent prosecution OR trademark registration OR copyright registration OR IP assignment OR invention assignment OR license agreement OR IP license OR royalty OR open source)', 'IP documentation', 1, TRUE),
(11, 'risk_indicator', '(infringement OR invalidity OR opposition OR cancellation OR expiration OR freedom to operate OR encumbrance OR open source contamination)', 'IP risk indicators', 1, TRUE),

-- Section 12: Real Property
(12, 'primary', '(real estate OR real property OR lease OR leasehold OR owned property OR facility OR premises) AND (property OR building OR land OR space)', 'Real property documents', 1, TRUE),
(12, 'secondary', '(lease agreement OR sublease OR ground lease OR deed OR title OR title insurance OR survey OR environmental assessment OR Phase I OR Phase II OR zoning OR certificate of occupancy)', 'Property documentation', 1, TRUE),
(12, 'risk_indicator', '(lease expiration OR renewal option OR rent escalation OR restoration obligation OR environmental contamination OR title defect OR zoning non-compliance)', 'Real property risks', 1, TRUE),

-- Section 13: Environmental
(13, 'primary', '(environmental OR EPA OR environmental protection OR pollution OR contamination OR hazardous OR toxic) AND (compliance OR permit OR license OR violation OR remediation)', 'Environmental compliance', 1, TRUE),
(13, 'secondary', '(Phase I OR Phase II OR environmental site assessment OR ESA OR CERCLA OR Superfund OR RCRA OR Clean Air Act OR Clean Water Act OR hazardous waste OR underground storage tank OR UST OR asbestos OR lead OR PCB)', 'Environmental assessments', 1, TRUE),
(13, 'risk_indicator', '(contamination OR release OR spill OR violation OR notice of violation OR consent order OR remediation cost OR successor liability)', 'Environmental risks', 1, TRUE),

-- Section 14: HR
(14, 'primary', '(employee OR employment OR workforce OR personnel OR staff OR labor) AND (agreement OR policy OR handbook OR benefit OR compensation)', 'Employment documents', 1, TRUE),
(14, 'secondary', '(employment agreement OR offer letter OR severance OR non-compete OR non-solicitation OR confidentiality agreement OR NDA OR employee handbook OR personnel policy OR collective bargaining OR union OR CBA)', 'HR documentation', 1, TRUE),
(14, 'risk_indicator', '(WARN Act OR layoff OR termination OR discrimination OR harassment OR wage and hour OR misclassification OR NLRA OR unfair labor practice)', 'HR risk terms', 1, TRUE),

-- Section 15: Insurance
(15, 'primary', '(insurance OR insurance policy OR coverage OR insured OR carrier OR underwriter) AND (general liability OR D&O OR E&O OR property OR cyber OR workers compensation)', 'Insurance policies', 1, TRUE),
(15, 'secondary', '(certificate of insurance OR COI OR policy declaration OR endorsement OR exclusion OR deductible OR retention OR claims made OR occurrence OR tail coverage OR retroactive date)', 'Insurance documentation', 1, TRUE),
(15, 'risk_indicator', '(gap in coverage OR exclusion OR sublimit OR claims history OR loss run OR tail exposure OR underinsured OR pending claim)', 'Insurance risks', 1, TRUE),

-- Section 16: IT
(16, 'primary', '(information technology OR IT OR cybersecurity OR cyber security OR data security OR information security OR infosec) AND (system OR infrastructure OR network OR application)', 'IT infrastructure', 1, TRUE),
(16, 'secondary', '(SOC 2 OR ISO 27001 OR penetration test OR vulnerability assessment OR security audit OR data breach OR incident response OR disaster recovery OR business continuity OR backup OR encryption)', 'IT security documentation', 1, TRUE),
(16, 'risk_indicator', '(data breach OR security incident OR vulnerability OR legacy system OR end of life OR unsupported OR single point of failure OR inadequate backup)', 'IT risk indicators', 1, TRUE),

-- Section 17: Regulatory
(17, 'primary', '(regulatory OR compliance OR license OR permit OR registration OR authorization) AND (federal OR state OR local OR industry OR sector)', 'Regulatory compliance', 1, TRUE),
(17, 'secondary', '(FDA OR FCC OR SEC OR FINRA OR HIPAA OR PCI OR GDPR OR CCPA OR antitrust OR export control OR ITAR OR OFAC OR sanctions OR AML OR BSA OR KYC)', 'Industry-specific regulations', 1, TRUE),
(17, 'risk_indicator', '(violation OR enforcement action OR consent decree OR fine OR penalty OR license suspension OR recall OR warning letter)', 'Regulatory risks', 1, TRUE),

-- Section 18: Customer/Vendor
(18, 'primary', '(customer OR client OR account OR vendor OR supplier OR contractor) AND (list OR schedule OR concentration OR relationship OR top)', 'Customer/vendor analysis', 1, TRUE),
(18, 'secondary', '(customer agreement OR vendor agreement OR supplier contract OR master agreement OR terms and conditions OR SLA OR service level OR pricing OR rebate OR volume commitment)', 'Relationship documentation', 1, TRUE),
(18, 'risk_indicator', '(concentration OR single source OR termination notice OR dispute OR credit risk OR key man OR relationship dependency)', 'Concentration risks', 1, TRUE),

-- Section 19: Integration
(19, 'primary', '(integration OR transition OR synergy OR merger integration OR PMI OR post-merger OR carve-out OR separation) AND (plan OR planning OR cost OR savings)', 'Integration planning', 1, TRUE),
(19, 'secondary', '(transition services agreement OR TSA OR shared services OR stranded cost OR dis-synergy OR integration timeline OR Day 1 OR 100-day plan OR change management OR communication plan)', 'Transition documentation', 1, TRUE),
(19, 'risk_indicator', '(stranded cost OR key employee retention OR system migration OR customer notification OR regulatory approval OR HSR OR antitrust)', 'Integration risks', 1, TRUE),

-- Section 20: Risk Summary
(20, 'primary', '(risk OR red flag OR issue OR concern OR deficiency OR weakness OR exposure) AND (material OR significant OR critical OR major)', 'Risk identification', 1, TRUE),
(20, 'secondary', '(risk factor OR risk assessment OR risk matrix OR mitigation OR remediation OR contingency OR escrow OR indemnity OR holdback OR representation OR warranty)', 'Risk documentation', 1, TRUE),
(20, 'risk_indicator', '(material adverse change OR MAC OR deal breaker OR walk-away OR price adjustment OR indemnity claim OR special indemnity)', 'Critical risk terms', 1, TRUE),

-- Section 21: Media (Web Search)
(21, 'primary', '([COMPANY_NAME] OR [BRAND_NAME]) AND (news OR press OR media OR article OR report)', 'Media coverage search', 1, TRUE),
(21, 'secondary', '([COMPANY_NAME]) AND (scandal OR controversy OR investigation OR lawsuit OR bankruptcy OR layoff OR recall OR data breach OR executive departure OR restructuring)', 'Negative media coverage', 1, TRUE),
(21, 'risk_indicator', '(negative press OR scandal OR investigation OR reputational risk OR viral OR trending)', 'Media risk terms', 1, TRUE),

-- Section 22: External Litigation (Web Search)
(22, 'primary', '([COMPANY_NAME] OR [PRINCIPALS]) AND (litigation OR lawsuit OR sued OR plaintiff OR defendant OR court OR legal action)', 'External litigation search', 1, TRUE),
(22, 'secondary', '([COMPANY_NAME]) AND (class action OR securities fraud OR EEOC OR discrimination OR OSHA OR EPA enforcement OR FTC OR DOJ OR SEC enforcement OR whistleblower)', 'Government/class actions', 1, TRUE),
(22, 'risk_indicator', '(undisclosed litigation OR pattern of claims OR serial plaintiff OR government investigation)', 'Litigation risk terms', 1, TRUE),

-- Section 23: Regulatory Actions (Web Search)
(23, 'primary', '([COMPANY_NAME]) AND (enforcement OR penalty OR fine OR sanction OR consent order OR settlement) AND (regulatory OR agency OR government)', 'Regulatory enforcement search', 1, TRUE),
(23, 'secondary', '([COMPANY_NAME]) AND (FDA warning letter OR EPA violation OR OSHA citation OR SEC action OR FTC complaint OR DOJ investigation OR state attorney general)', 'Agency-specific enforcement', 1, TRUE),
(23, 'risk_indicator', '(undisclosed enforcement OR pattern of violations OR debarment OR exclusion list OR criminal referral)', 'Enforcement risk terms', 1, TRUE);

-- =====================================================
-- SEED DATA: DD_INDUSTRIES
-- =====================================================

INSERT INTO dd_industries (code, name, description, is_active) VALUES
('healthcare', 'Healthcare & Life Sciences', 'Hospitals, pharma, biotech, medical devices, healthcare IT', TRUE),
('technology', 'Technology & SaaS', 'Software, SaaS, cloud services, AI/ML, fintech', TRUE),
('manufacturing', 'Manufacturing & Industrial', 'Industrial manufacturing, automotive, aerospace, chemicals', TRUE),
('financial', 'Financial Services', 'Banking, insurance, asset management, fintech', TRUE),
('retail', 'Retail & Consumer', 'Retail, e-commerce, CPG, restaurants, franchises', TRUE),
('energy', 'Energy & Utilities', 'Oil & gas, renewable energy, utilities, infrastructure', TRUE),
('realestate', 'Real Estate', 'Commercial, residential, REITs, property management', TRUE);

-- =====================================================
-- SEED DATA: DD_INDUSTRY_VARIANTS
-- =====================================================

-- Healthcare variants
INSERT INTO dd_industry_variants (industry_id, section_id, variant_type, query_modification, priority, is_active) VALUES
((SELECT id FROM dd_industries WHERE code = 'healthcare'), 17, 'append', 'OR (HIPAA OR PHI OR protected health information OR BAA OR business associate OR covered entity OR meaningful use OR 340B OR Stark OR anti-kickback OR AKS OR CMS OR Medicare OR Medicaid)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'healthcare'), 9, 'append', 'OR (malpractice OR medical negligence OR patient safety OR qui tam OR False Claims Act OR FCA)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'healthcare'), 11, 'append', 'OR (FDA approval OR 510k OR PMA OR clinical trial OR NDA OR ANDA OR orphan drug OR breakthrough therapy)', 1, TRUE);

-- Technology variants
INSERT INTO dd_industry_variants (industry_id, section_id, variant_type, query_modification, priority, is_active) VALUES
((SELECT id FROM dd_industries WHERE code = 'technology'), 11, 'append', 'OR (source code OR API OR SDK OR open source license OR GPL OR MIT license OR Apache OR LGPL OR copyleft OR proprietary code OR code escrow)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'technology'), 16, 'append', 'OR (SaaS OR cloud OR AWS OR Azure OR GCP OR SOC 2 Type II OR penetration test OR bug bounty OR zero-day OR uptime OR SLA)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'technology'), 10, 'append', 'OR (subscription agreement OR SaaS agreement OR software license OR EULA OR terms of service OR privacy policy OR DPA OR data processing)', 1, TRUE);

-- Manufacturing variants
INSERT INTO dd_industry_variants (industry_id, section_id, variant_type, query_modification, priority, is_active) VALUES
((SELECT id FROM dd_industries WHERE code = 'manufacturing'), 10, 'append', 'OR (supplier agreement OR raw material OR component OR bill of materials OR BOM OR sole source OR single source OR supply chain)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'manufacturing'), 13, 'append', 'OR (emissions OR discharge permit OR NPDES OR air permit OR waste manifest OR TSCA OR REACH)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'manufacturing'), 9, 'append', 'OR (product liability OR product recall OR warranty claim OR consumer safety OR CPSC)', 1, TRUE);

-- Financial Services variants
INSERT INTO dd_industry_variants (industry_id, section_id, variant_type, query_modification, priority, is_active) VALUES
((SELECT id FROM dd_industries WHERE code = 'financial'), 17, 'append', 'OR (OCC OR FDIC OR Federal Reserve OR state banking OR money transmitter OR securities license OR broker-dealer OR investment adviser OR RIA OR Reg D OR Reg A)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'financial'), 8, 'append', 'OR (bank secrecy OR suspicious activity report OR SAR OR CTR OR currency transaction OR OFAC OR sanctions screening)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'financial'), 16, 'append', 'OR (PCI DSS OR GLBA OR SOX OR Sarbanes-Oxley OR FFIEC OR cyber assessment)', 1, TRUE);

-- Retail variants
INSERT INTO dd_industry_variants (industry_id, section_id, variant_type, query_modification, priority, is_active) VALUES
((SELECT id FROM dd_industries WHERE code = 'retail'), 10, 'append', 'OR (franchise agreement OR FDD OR franchise disclosure OR franchisee OR area developer OR master franchise)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'retail'), 12, 'append', 'OR (retail lease OR percentage rent OR CAM OR common area OR anchor tenant OR co-tenancy OR radius restriction)', 1, TRUE),
((SELECT id FROM dd_industries WHERE code = 'retail'), 14, 'append', 'OR (tip credit OR minimum wage OR tip pooling OR joint employer OR seasonal worker)', 1, TRUE);

-- =====================================================
-- SEED DATA: DD_DOCUMENT_TYPES
-- =====================================================

INSERT INTO dd_document_types (section_id, document_type, description, priority, is_required) VALUES
-- Section 1
(1, 'Certificate of Incorporation', 'State-filed formation document', 1, TRUE),
(1, 'Bylaws/Operating Agreement', 'Governance rules and procedures', 2, TRUE),
(1, 'Organizational Chart', 'Visual entity structure', 3, FALSE),
(1, 'Board Minutes', 'Records of board meetings', 4, FALSE),
-- Section 2
(2, 'Capitalization Table', 'Current equity ownership breakdown', 1, TRUE),
(2, 'Stock Purchase Agreements', 'Equity issuance documentation', 2, FALSE),
(2, 'Option Plan Documents', 'Equity incentive plan details', 3, FALSE),
-- Section 4
(4, 'Audited Financial Statements', 'CPA-audited annual financials', 1, TRUE),
(4, 'Monthly/Quarterly Financials', 'Interim financial reports', 2, TRUE),
(4, 'Audit Management Letter', 'Auditor findings and recommendations', 3, FALSE),
-- Section 7
(7, 'Credit Agreement', 'Primary debt facility documentation', 1, TRUE),
(7, 'Security Agreement', 'Collateral and security interests', 2, TRUE),
(7, 'Payoff Letter', 'Outstanding balance confirmation', 3, FALSE),
-- Section 10
(10, 'Top Customer Contracts', 'Material customer agreements', 1, TRUE),
(10, 'Top Supplier Contracts', 'Material vendor agreements', 2, TRUE),
(10, 'Contract Schedule', 'Summary of all material contracts', 3, FALSE);

-- =====================================================
-- SEED DATA: DD_SYNONYM_GROUPS
-- =====================================================

INSERT INTO dd_synonym_groups (canonical_term, domain) VALUES
('financial statements', 'finance'),
('agreement', 'legal'),
('corporation', 'corporate'),
('intellectual property', 'ip'),
('compliance', 'regulatory');

INSERT INTO dd_synonyms (group_id, synonym, confidence, source) VALUES
-- Financial statements synonyms
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'financial statements'), 'financials', 1.0, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'financial statements'), 'financial report', 0.9, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'financial statements'), 'fiscal report', 0.8, 'manual'),
-- Agreement synonyms
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'agreement'), 'contract', 1.0, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'agreement'), 'arrangement', 0.7, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'agreement'), 'understanding', 0.5, 'manual'),
-- Corporation synonyms
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'corporation'), 'company', 1.0, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'corporation'), 'entity', 0.9, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'corporation'), 'business', 0.8, 'manual'),
((SELECT id FROM dd_synonym_groups WHERE canonical_term = 'corporation'), 'firm', 0.7, 'manual');

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sections_active ON dd_sections(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_queries_section_type ON dd_boolean_queries(section_id, query_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_industry_variants_lookup ON dd_industry_variants(industry_id, section_id) WHERE is_active = TRUE;
