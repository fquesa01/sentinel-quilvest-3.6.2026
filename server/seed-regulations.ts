import type { InsertRegulation } from "@shared/schema";

/**
 * Comprehensive regulatory knowledge base seed data
 * Based on FCPA and SOX regulatory frameworks
 */
export const regulationsSeedData: InsertRegulation[] = [
  // ===== FCPA (Foreign Corrupt Practices Act) =====
  {
    title: "FCPA Anti-Bribery Provisions - Foreign Official Payments",
    violationType: "fcpa",
    description: "Prohibits corrupt payments to foreign officials, political parties, party officials, candidates for political office, or any person while knowing the payment will be passed to such individuals for the purpose of obtaining or retaining business.",
    citation: "15 USC §78dd-1, §78dd-2, §78dd-3",
    jurisdiction: "federal",
    content: `The Foreign Corrupt Practices Act (FCPA) anti-bribery provisions make it unlawful for any person or company to corruptly offer, promise, or provide anything of value to foreign officials for the purpose of obtaining or retaining business.

KEY PROHIBITIONS:
• Payments to foreign government officials
• Payments to foreign political parties or party officials
• Payments to candidates for foreign political office
• Payments to any person knowing it will be passed on to prohibited recipients

INTENT REQUIREMENT: The payment must be made "corruptly" - with the intent to wrongfully influence the recipient.

PURPOSE REQUIREMENT: The payment must be for the purpose of:
- Influencing any act or decision in official capacity
- Inducing the official to do or omit any act in violation of lawful duty
- Securing any improper advantage
- Inducing the official to use influence with a foreign government to affect governmental action

PENALTIES:
- Corporations: Up to $2,000,000 per violation
- Individuals: Up to $250,000 and/or 5 years imprisonment per violation
- Penalties cannot be paid by the employer on behalf of the individual`,
    tags: ["fcpa", "anti-bribery", "foreign-officials", "corruption"]
  },

  {
    title: "FCPA Definition of Foreign Official",
    violationType: "fcpa",
    description: "Comprehensive definition of who qualifies as a 'foreign official' under FCPA, including government employees, state-owned enterprise employees, and officials of public international organizations.",
    citation: "15 USC §78dd-1(f)(1)",
    jurisdiction: "federal",
    content: `The FCPA defines "foreign official" broadly to include:

GOVERNMENT OFFICIALS:
• Any officer or employee of a foreign government
• Any department, agency, or instrumentality of a foreign government
• Any person acting in an official capacity for or on behalf of a foreign government

STATE-OWNED ENTERPRISES (SOEs):
• Employees of companies where the government:
  - Owns a majority stake
  - Has effective control over operations
  - Designates the entity to perform governmental functions
  - Provides the entity with governmental authority

PUBLIC INTERNATIONAL ORGANIZATIONS:
• United Nations and affiliated agencies
• World Bank Group
• International Monetary Fund (IMF)
• Regional development banks
• Other multilateral organizations designated as public international organizations

POLITICAL ENTITIES:
• Foreign political parties
• Officials of foreign political parties
• Candidates for foreign political office

KEY CONSIDERATIONS FOR SOE ANALYSIS:
1. Degree of government ownership or control
2. Government's characterization of the entity
3. Whether entity performs government functions
4. Entity's level of autonomy from government
5. Whether entity exercises governmental authority

Even low-level employees of government-controlled entities may qualify as foreign officials.`,
    tags: ["fcpa", "foreign-officials", "state-owned-enterprises", "soe", "definitions"]
  },

  {
    title: "FCPA Third-Party Intermediary Red Flags",
    violationType: "fcpa",
    description: "Critical warning signs that a third-party intermediary (agent, consultant, distributor) may be involved in improper payments to foreign officials.",
    citation: "DOJ FCPA Resource Guide (2020)",
    jurisdiction: "federal",
    content: `Companies can be held liable for corrupt payments made through third parties if they have knowledge (actual, willful blindness, or conscious disregard) that payments will be made to foreign officials.

HIGH-RISK RED FLAGS:
1. COMPENSATION ISSUES:
   • Excessive commission or fee structure
   • Commission disproportionate to services rendered
   • Large up-front payments
   • Success fees tied to government action

2. PAYMENT ARRANGEMENTS:
   • Requests for payment to offshore accounts
   • Payments to tax havens
   • Cash payment requests
   • Requests for unusual payment structures
   • Invoices lacking detail or supporting documentation

3. QUALIFICATIONS & EXPERIENCE:
   • Lack of qualifications or relevant experience
   • No track record in the industry
   • Not listed in business directories
   • Lacks physical business premises
   • Recently formed entity
   • Shell company characteristics

4. RELATIONSHIPS & REPUTATION:
   • Close family or business relationship with foreign officials
   • Recommended by foreign official
   • Known reputation for paying bribes
   • History of FCPA violations
   • Unwilling to certify FCPA compliance

5. CONTRACTUAL RESISTANCE:
   • Resistance to anti-corruption contractual terms
   • Unwilling to provide transparency regarding ownership
   • Refuses audit rights or due diligence
   • Insists on confidentiality for no clear reason

6. GEOGRAPHIC & OPERATIONAL:
   • Location in high-corruption jurisdiction
   • Operates in industry known for corruption
   • Requests unusual confidentiality
   • Vague description of services

DUE DILIGENCE REQUIREMENTS:
• Risk-based approach to third-party screening
• Enhanced due diligence for high-risk relationships
• Ongoing monitoring throughout relationship
• Documented compliance decision-making
• Regular recertification of compliance`,
    tags: ["fcpa", "third-party", "intermediaries", "red-flags", "due-diligence"]
  },

  {
    title: "FCPA Facilitating Payments Exception",
    violationType: "fcpa",
    description: "Narrow affirmative defense for small payments to foreign officials to facilitate or expedite routine, non-discretionary governmental actions.",
    citation: "15 USC §78dd-1(b), §78dd-2(b), §78dd-3(b)",
    jurisdiction: "federal",
    content: `The FCPA provides a narrow exception for "facilitating payments" (also called "grease payments") - small payments to foreign officials to expedite or secure routine governmental actions.

PERMITTED ROUTINE GOVERNMENTAL ACTIONS:
• Obtaining permits, licenses, or other official documents
• Processing governmental papers (visas, work orders, permits)
• Providing police protection, mail pickup and delivery
• Providing phone service, power, water supply
• Loading and unloading cargo
• Protecting perishable products or commodities from deterioration
• Scheduling inspections associated with contract performance or transit of goods

CRITICAL LIMITATIONS:
1. NOT for obtaining or retaining business
2. Only for non-discretionary, ministerial actions
3. Official must already be required to perform the action
4. Cannot involve official exercising discretion
5. Must be small in amount (typically under $500)

DOCUMENTATION REQUIREMENTS:
• Detailed records of all facilitating payments
• Business purpose and description of service
• Amount and recipient
• Evidence payment was for routine action
• Internal approval documentation

IMPORTANT NOTES:
• UK Bribery Act and many other countries do NOT recognize facilitating payments
• DOJ and SEC discourage reliance on this exception
• Many companies prohibit facilitating payments entirely as a policy matter
• Even if permitted under FCPA, may violate local law
• Must still be accurately recorded in books and records

BEST PRACTICE: Establish clear company policy prohibiting or severely limiting facilitating payments, with centralized approval for any exceptions.`,
    tags: ["fcpa", "facilitating-payments", "grease-payments", "exceptions"]
  },

  {
    title: "FCPA Accounting Provisions - Books and Records",
    violationType: "fcpa",
    description: "Requirements for issuers to make and keep accurate books, records, and accounts that fairly reflect transactions and dispositions of assets in reasonable detail.",
    citation: "15 USC §78m(b)(2)(A)",
    jurisdiction: "federal",
    content: `The FCPA's accounting provisions require companies with securities registered in the U.S. to maintain accurate books and records.

BOOKS AND RECORDS REQUIREMENTS:
• Transactions must be accurately recorded
• Records must be maintained in "reasonable detail"
• Must "accurately and fairly reflect" transactions
• Must reflect dispositions of assets
• Cannot use off-books accounts or false entries

"REASONABLE DETAIL" STANDARD:
• Level of detail that would satisfy prudent management
• Sufficient to permit preparation of financial statements conforming to GAAP
• Allows users to determine if transactions were executed per management authorization
• Enough specificity to identify actual nature of transaction

PROHIBITED PRACTICES:
• Off-the-books accounts (slush funds)
• False or misleading entries
• Incomplete or inaccurate entries
• Use of euphemisms to disguise true nature of payments
• Inadequate description of transactions
• Failure to record liabilities or contingencies

COMMON VIOLATIONS:
• Recording bribes as "consulting fees" or "commissions"
• Using inadequate supporting documentation
• Making payments through unrecorded cash accounts
• Disguising nature of recipient or service
• Failing to maintain backup documentation

PENALTIES:
• Corporate: Up to $25,000,000 per violation
• Individual: Up to $5,000,000 and/or 20 years imprisonment

KEY COMPLIANCE MEASURES:
• Robust expense approval processes
• Detailed invoice and payment documentation
• Regular internal audits
• Training on accurate expense coding
• Whistleblower mechanisms
• Strong "tone at the top" for accurate reporting`,
    tags: ["fcpa", "accounting", "books-and-records", "financial-controls"]
  },

  {
    title: "FCPA Internal Accounting Controls",
    violationType: "fcpa",
    description: "Requirements for issuers to devise and maintain a system of internal accounting controls sufficient to provide reasonable assurances regarding authorized transactions and asset safeguarding.",
    citation: "15 USC §78m(b)(2)(B)",
    jurisdiction: "federal",
    content: `FCPA requires companies to devise and maintain a system of internal accounting controls providing reasonable assurances that:

1. TRANSACTION EXECUTION:
   Transactions are executed in accordance with management's general or specific authorization

2. TRANSACTION RECORDING:
   Transactions are recorded as necessary to:
   • Permit preparation of financial statements in conformity with GAAP
   • Maintain accountability for assets

3. ASSET ACCESS:
   Access to assets is permitted only in accordance with management's authorization

4. ASSET RECONCILIATION:
   Recorded accountability for assets is compared with existing assets at reasonable intervals
   Appropriate action is taken regarding any differences

REASONABLE ASSURANCES STANDARD:
• Cost-benefit balanced approach
• What prudent officials would consider reasonable
• Not absolute assurance or guarantee
• Considers likelihood and potential loss magnitude

CONTROL ENVIRONMENT ELEMENTS:
• Segregation of duties
• Authorization and approval processes  
• Physical safeguards over assets
• Independent reconciliations
• Management oversight and review
• Documentation requirements
• Information systems controls

HIGH-RISK AREAS REQUIRING STRONG CONTROLS:
• Gifts, travel, and entertainment
• Charitable contributions and sponsorships
• Third-party payments and commissions
• Government interactions and permit fees
• Political contributions
• Marketing and promotional expenses
• Acquisition due diligence and integration

PENALTIES (same as books and records):
• Corporate: Up to $25,000,000 per violation
• Individual: Up to $5,000,000 and/or 20 years imprisonment

RED FLAGS OF INADEQUATE CONTROLS:
• Lack of written policies and procedures
• Insufficient segregation of duties
• Inadequate approval thresholds
• Missing or incomplete documentation
• Failure to investigate control exceptions
• Overrides of controls without documentation
• Lack of periodic testing and monitoring`,
    tags: ["fcpa", "internal-controls", "accounting-controls", "compliance-programs"]
  },

  // ===== SOX (Sarbanes-Oxley) =====
  {
    title: "SOX Section 302 - CEO/CFO Certification Requirements",
    violationType: "sox",
    description: "Requires principal executive and financial officers to certify the accuracy of financial reports and the effectiveness of internal controls in quarterly and annual reports.",
    citation: "15 USC §7241 (SOX §302)",
    jurisdiction: "federal",
    content: `Section 302 of the Sarbanes-Oxley Act requires CEOs and CFOs to personally certify the accuracy and completeness of financial reports.

CERTIFICATION REQUIREMENTS:
Principal executive and financial officers must certify:

1. REVIEW AND ACCURACY:
   • Personally reviewed the report
   • Report does not contain material untrue statements
   • Report does not omit material facts
   • Financial statements fairly present financial condition and results

2. INTERNAL CONTROLS OVER FINANCIAL REPORTING:
   • Responsible for establishing and maintaining internal controls
   • Controls designed to ensure material information is made known
   • Evaluated effectiveness of controls within 90 days before report
   • Presented conclusions about control effectiveness in report

3. DISCLOSURE:
   • Disclosed to auditors and audit committee:
     - All significant deficiencies in internal control design/operation
     - Any material weaknesses in internal controls
     - Any fraud (material or not) involving management or employees with significant role in internal controls

4. CHANGES:
   • Indicated whether there were significant changes in internal controls after evaluation
   • Disclosed any corrective actions taken

TIMING:
• Required for all quarterly (10-Q) and annual (10-K) reports
• Certification must be made at time of filing

PENALTIES FOR FALSE CERTIFICATION:
• Knowing/Willful: Up to $5,000,000 fine and/or 20 years imprisonment
• Regular violations: Up to $1,000,000 fine and/or 10 years imprisonment

OFFICER RESPONSIBILITIES:
• Cannot delegate certification responsibility
• Must have reasonable basis for certification
• Should maintain documentation supporting certification
• Must establish sub-certification process for business units
• Requires robust disclosure controls and procedures

COMPLIANCE BEST PRACTICES:
• Quarterly sub-certifications from business unit leaders
• Regular testing of key controls
• Formal disclosure committee process
• Management representation letters from key personnel
• Documentation of control evaluation process
• Remediation tracking for identified deficiencies`,
    tags: ["sox", "section-302", "ceo-certification", "cfo-certification", "internal-controls"]
  },

  {
    title: "SOX Section 404 - Management Assessment of Internal Controls",
    violationType: "sox",
    description: "Requires management to assess and report on the effectiveness of internal control over financial reporting (ICFR), with external auditor attestation for accelerated and large filers.",
    citation: "15 USC §7262 (SOX §404)",
    jurisdiction: "federal",
    content: `Section 404 requires management to establish, maintain, assess, and report on internal control over financial reporting (ICFR).

MANAGEMENT REQUIREMENTS:

1. INTERNAL CONTROL REPORT (404(a)):
   Annual reports must include:
   • Statement of management's responsibility for establishing and maintaining adequate ICFR
   • Assessment of effectiveness of ICFR as of fiscal year end
   • Identification of framework used for evaluation (e.g., COSO 2013)
   • Statement that external auditors have issued attestation report

2. FRAMEWORK FOR EVALUATION:
   Must use suitable, recognized control framework such as:
   • COSO Internal Control—Integrated Framework (2013)
   • COSO Enterprise Risk Management Framework

3. SCOPE OF ASSESSMENT:
   Controls over:
   • Reliability of financial reporting
   • Preparation of financial statements for external purposes
   • GAAP compliance
   • Reasonable assurance regarding prevention/detection of unauthorized asset acquisition, use, or disposition

AUDITOR ATTESTATION (404(b)):
• Required for accelerated and large accelerated filers
• External auditor must attest to and report on management's assessment
• Integrated audit of financial statements and ICFR
• Auditor expresses opinion on effectiveness of ICFR

EXEMPTIONS:
• Emerging growth companies (under JOBS Act)
• Non-accelerated filers (under certain conditions)
• Recently public companies (transition period)

CONTROL DEFICIENCY CLASSIFICATIONS:

1. CONTROL DEFICIENCY:
   Weakness in design or operation that reduces likelihood controls will prevent or detect misstatements

2. SIGNIFICANT DEFICIENCY:
   Deficiency or combination of deficiencies less severe than material weakness, but important enough to merit attention by those charged with governance

3. MATERIAL WEAKNESS:
   Deficiency or combination of deficiencies such that there is reasonable possibility a material misstatement will not be prevented or detected on a timely basis

DISCLOSURE REQUIREMENTS:
• All material weaknesses must be disclosed
• Cannot conclude controls are effective if material weakness exists
• Must disclose changes in ICFR during most recent quarter
• Must remediate material weaknesses

COMPLIANCE COSTS & BENEFITS:
• Significant implementation and ongoing compliance costs
• Improved financial reporting quality
• Enhanced fraud detection
• Increased investor confidence
• Better risk management

KEY CONTROL AREAS:
• Financial close and reporting process
• Revenue recognition
• Inventory and cost of goods sold
• Investments and fair value measurements
• Income taxes
• Stock-based compensation
• Debt and derivatives
• IT general controls and application controls`,
    tags: ["sox", "section-404", "internal-controls", "icfr", "auditor-attestation"]
  },

  {
    title: "SOX Section 806 - Whistleblower Protection",
    violationType: "sox",
    description: "Protects employees who report fraud or securities violations from retaliation by their employers, with provisions for complaints and remedies.",
    citation: "18 USC §1514A (SOX §806)",
    jurisdiction: "federal",
    content: `Section 806 provides comprehensive whistleblower protection for employees who report potential violations of securities laws or fraud.

PROTECTED ACTIVITY:
Employees are protected when they provide information or assist in investigations regarding conduct they reasonably believe constitutes:

1. Securities fraud
2. Mail fraud
3. Wire fraud
4. Bank fraud
5. Violations of SEC rules or regulations
6. Any federal law relating to fraud against shareholders

REPORTING CHANNELS (Protected):
• Federal regulatory or law enforcement agency
• Any member or committee of Congress
• Any person with supervisory authority over the employee
• Any other person working for the employer with authority to investigate, discover, or terminate misconduct
• Filing, testifying, participating in proceeding relating to alleged violation

PROHIBITED RETALIATION:
Employers cannot discharge, demote, suspend, threaten, harass, or discriminate against employee for protected whistleblowing activity.

TYPES OF PROHIBITED RETALIATION:
• Termination or constructive discharge
• Demotion or failure to promote
• Suspension or disciplinary action
• Reduction in pay or hours
• Blacklisting or negative references
• Threats or intimidation
• Reassignment to less desirable position
• Changes in terms and conditions of employment

COMPLAINT PROCESS:
• File complaint with Department of Labor (OSHA) within 180 days
• DOL investigates and issues findings
• If DOL doesn't issue final decision within 180 days, employee can file in federal district court
• Jury trial available

BURDEN OF PROOF:
• Employee must show by preponderance of evidence that protected activity was contributing factor in adverse action
• Employer can defend by showing by clear and convincing evidence it would have taken same action absent protected activity

REMEDIES:
• Reinstatement with same seniority status
• Back pay with interest
• Compensation for special damages (litigation costs, expert witness fees, reasonable attorney's fees)

STATUTE OF LIMITATIONS:
• Administrative complaint: 180 days from alleged retaliation
• Court action: Varies by jurisdiction (typically 2-3 years)

COMPLIANCE REQUIREMENTS:
• Establish confidential reporting mechanisms
• Train management on whistleblower rights
• Investigate complaints promptly and thoroughly
• Document legitimate business reasons for employment actions
• Maintain anti-retaliation policies
• Protect whistleblower anonymity where possible

RELATED PROTECTIONS:
• Dodd-Frank whistleblower provisions (expanded protections and bounties)
• State whistleblower statutes
• Common law protections`,
    tags: ["sox", "section-806", "whistleblower", "retaliation", "employee-protection"]
  },

  {
    title: "SOX Section 906 - Criminal Penalties for CEO/CFO False Certifications",
    violationType: "sox",
    description: "Establishes criminal penalties for chief executives and chief financial officers who knowingly or willfully certify false periodic financial reports.",
    citation: "18 USC §1350 (SOX §906)",
    jurisdiction: "federal",
    content: `Section 906 creates criminal liability for CEOs and CFOs who certify financial reports knowing they do not comply with securities laws.

CERTIFICATION REQUIREMENT:
CEOs and CFOs must certify that periodic reports fully comply with:
• Section 13(a) or 15(d) of Securities Exchange Act of 1934
• Information in periodic report fairly presents, in all material respects, the financial condition and results of operations

CRIMINAL PENALTIES:

1. KNOWING VIOLATION:
   • Fine up to $1,000,000
   • Imprisonment up to 10 years
   • Or both

2. WILLFUL VIOLATION:
   • Fine up to $5,000,000
   • Imprisonment up to 20 years
   • Or both

DIFFERENCES FROM SECTION 302:
• Section 906: Criminal statute with higher penalties
• Section 302: Civil/administrative with certification requirements and civil penalties
• Section 906: Requires "knowing" or "willful" conduct
• Section 302: Strict liability for certification content

KNOWLEDGE STANDARDS:

KNOWING:
• Awareness that report does not comply
• Actual knowledge of non-compliance
• Conscious disregard or willful blindness may establish knowledge

WILLFUL:
• Intentional violation of known legal duty
• Purposeful non-compliance
• Bad faith or evil purpose
• Higher standard than "knowing"

DEFENSES:
• Good faith belief in compliance
• Reasonable reliance on others (limited)
• Lack of knowledge of non-compliance
• Delegation does NOT absolve responsibility

PROSECUTIONS:
• Relatively rare (reserved for egregious cases)
• Often charged alongside securities fraud
• Used in major accounting fraud cases (Enron, WorldCom, etc.)

COMPLIANCE STRATEGIES:
• Robust sub-certification process
• Personal review of financial statements and key disclosures
• Regular meetings with audit committee
• Direct communication with external auditors
• Documentation of certification basis
• Legal counsel review of disclosures
• Conservative approach to close calls
• Immediate investigation of potential issues

OFFICER PROTECTION:
• D&O insurance (though intentional violations typically excluded)
• Indemnification agreements (limited for criminal acts)
• Personal legal counsel
• Documentation of due diligence`,
    tags: ["sox", "section-906", "criminal-penalties", "ceo", "cfo", "false-certification"]
  },

  {
    title: "SOX Section 802 - Criminal Penalties for Document Destruction",
    violationType: "sox",
    description: "Makes it a crime to alter, destroy, mutilate, conceal, or falsify records or documents with intent to obstruct or influence federal investigations or bankruptcy proceedings.",
    citation: "18 USC §1519, §1520 (SOX §802)",
    jurisdiction: "federal",
    content: `Section 802 creates criminal penalties for document destruction and alteration intended to obstruct justice or influence investigations.

PROHIBITED CONDUCT (18 USC §1519):
Knowingly alters, destroys, mutilates, conceals, covers up, falsifies, or makes false entry in any record, document, or tangible object with intent to:
• Impede, obstruct, or influence investigation or proper administration of any matter
• Investigation or proceeding by federal agency or department
• Bankruptcy proceeding

COVERAGE:
• Applies to ANY federal investigation (not just SEC)
• Includes contemplated or pending investigations
• Covers bankruptcy proceedings
• No requirement investigation has commenced (anticipation is sufficient)

CRIMINAL PENALTIES:
• Fine
• Imprisonment up to 20 years
• Or both

TYPES OF PROHIBITED DOCUMENT DESTRUCTION:
• Physical destruction of documents
• Deletion of electronic records
• Alteration of existing documents or records
• Concealment or withholding of documents
• False entries in books or records
• Destruction of backup tapes or electronic storage

INTENT REQUIREMENT:
• Must act "knowingly"
• Must have intent to obstruct or influence
• Good faith document destruction under retention policy is NOT violation
• Routine destruction before investigation anticipated is permissible

AUDITOR WORK PAPER RETENTION (18 USC §1520):
• Auditors must retain audit work papers for 7 years
• Applies to public company audits under securities laws
• Knowing violation: Fine and/or imprisonment up to 10 years

LEGAL HOLDS:
When litigation or investigation is anticipated or commenced:
• Must immediately suspend document destruction
• Implement "litigation hold" or "legal hold"
• Preserve all potentially relevant documents
• Notify all custodians of preservation duty
• Suspend automatic deletion policies

DOCUMENT RETENTION POLICIES:
• Establish clear written policies
• Define retention periods by document type
• Implement consistent enforcement
• Train employees on policies
• Document policy compliance
• Exceptions for legal holds

COMPLIANCE BEST PRACTICES:
• Comprehensive document retention policy
• Regular training on preservation duties
• Clear litigation hold procedures
• Centralized management of legal holds
• Technology to suspend auto-deletion
• Documentation of retention decisions
• Legal counsel involvement in investigations

HIGH-RISK SITUATIONS:
• Receipt of subpoena or document request
• Knowledge of government investigation
• Shareholder derivative action
• Whistleblower complaints
• Internal investigation findings
• Regulatory examination

EMPLOYEE COMMUNICATIONS:
• Preservation of emails and instant messages
• Social media communications
• Text messages and other electronic communications
• Voice messages and recordings
• Shared drives and collaboration platforms`,
    tags: ["sox", "section-802", "document-destruction", "obstruction-of-justice", "records-retention"]
  },

  {
    title: "SOX Section 401 - Financial Statement Disclosures",
    violationType: "sox",
    description: "Requires financial statements to be accurate and presented in a manner that does not contain incorrect statements or omit material information necessary to make statements not misleading.",
    citation: "15 USC §7261 (SOX §401)",
    jurisdiction: "federal",
    content: `Section 401 enhances financial disclosure requirements to ensure accurate and complete financial reporting.

KEY REQUIREMENTS:

1. OFF-BALANCE SHEET ARRANGEMENTS:
   Must disclose all material off-balance sheet transactions, arrangements, and obligations including:
   • Guarantees
   • Retained or contingent interests in assets transferred
   • Derivative instruments
   • Material variable interests in unconsolidated entities

2. PRO FORMA FINANCIAL INFORMATION:
   When presenting pro forma financials:
   • Must not contain material misstatements or omissions
   • Must reconcile to GAAP financial condition and results
   • Must present results in manner that is not misleading

3. SPECIAL PURPOSE ENTITIES (SPEs):
   Enhanced disclosure of relationships with special purpose entities and structured finance arrangements

4. MATERIAL CHANGES:
   Real-time disclosure (rapid and current) of material changes in financial condition or operations

DISCLOSURE PRINCIPLES:

COMPLETENESS:
• All material information must be disclosed
• Cannot omit facts that make disclosed information misleading
• Duty extends beyond strict GAAP compliance

ACCURACY:
• Information must be factually correct
• Financial statements must fairly present financial condition
• No materially false or misleading statements

CLARITY:
• Plain English requirement
• Avoid unnecessary jargon
• Clear presentation and organization
• Understandable to reasonable investor

TIMING:
• Quarterly and annual reporting
• Current reports (Form 8-K) for material events
• Real-time disclosure of material changes

MATERIAL OFF-BALANCE SHEET ITEMS:

GUARANTEES:
• Standby letters of credit
• Performance guarantees
• Indemnification agreements
• Financial guarantees

RETAINED INTERESTS:
• Securitizations
• Asset sales with retained interests
• Contingent interests in transferred assets

DERIVATIVE INSTRUMENTS:
• Interest rate swaps
• Currency hedges
• Commodity derivatives
• Equity derivatives

VARIABLE INTEREST ENTITIES (VIEs):
• Primary beneficiary determination
• Consolidation analysis
• Related party VIEs
• Disclosure of nature and purpose

PRO FORMA PRESENTATION REQUIREMENTS:
• Clear reconciliation to GAAP
• Explanation of adjustments
• Consistent application
• Appropriate prominence of GAAP measures
• Substantive business purpose

COMMON VIOLATIONS:
• Hiding liabilities through SPEs
• Aggressive pro forma adjustments
• Inadequate VIE disclosures
• Failure to disclose material contingencies
• Misleading non-GAAP measures
• Omission of related party transactions

AUDIT COMMITTEE RESPONSIBILITIES:
• Review financial statement disclosures
• Evaluate off-balance sheet arrangements
• Assess adequacy of disclosures
• Question management on judgments
• Review pro forma presentations

MANAGEMENT CONSIDERATIONS:
• Conservative disclosure approach
• Legal counsel review of disclosures
• Substance over form analysis
• Continuous evaluation of disclosure adequacy
• Documentation of disclosure decisions`,
    tags: ["sox", "section-401", "financial-disclosures", "off-balance-sheet", "pro-forma"]
  },

  // ===== HR INVESTIGATIONS - DISCRIMINATION =====
  {
    title: "Title VII - Employment Discrimination Prohibition",
    violationType: "discrimination",
    description: "Prohibits employment discrimination based on race, color, religion, sex (including pregnancy, sexual orientation, and gender identity), and national origin.",
    citation: "42 USC §2000e et seq. (Title VII of the Civil Rights Act of 1964)",
    jurisdiction: "federal",
    authoritySource: "EEOC",
    regulatoryBody: "Equal Employment Opportunity Commission (EEOC)",
    content: `Title VII prohibits employers with 15+ employees from discriminating against employees or applicants in hiring, firing, compensation, terms, conditions, or privileges of employment.

PROTECTED CHARACTERISTICS:
• Race and Color
• Religion and Religious Practices
• Sex (including pregnancy, childbirth, related medical conditions)
• Sexual Orientation and Gender Identity (per Bostock v. Clayton County, 2020)
• National Origin

PROHIBITED EMPLOYMENT ACTIONS:
• Hiring and firing decisions
• Compensation, assignment, or classification of employees
• Transfer, promotion, layoff, or recall
• Job advertisements and recruitment
• Testing and use of company facilities
• Fringe benefits, pay, retirement plans, and disability leave
• Training and apprenticeship programs
• Harassment based on protected characteristics
• Retaliation for protected activity

TYPES OF DISCRIMINATION:

1. DISPARATE TREATMENT:
   Intentional discrimination where similarly situated individuals are treated differently based on protected characteristic

2. DISPARATE IMPACT:
   Facially neutral employment practices that disproportionately affect protected group and are not job-related and consistent with business necessity

3. HARASSMENT:
   Unwelcome conduct based on protected characteristic that creates hostile work environment or results in tangible employment action

EMPLOYER DEFENSES:
• Bona Fide Occupational Qualification (BFOQ) - very narrow exception
• Business necessity (for disparate impact claims)
• Legitimate non-discriminatory reason (McDonnell Douglas framework)

FILING REQUIREMENTS:
• Charge must be filed with EEOC within 180 days (or 300 days in states with fair employment practice agencies)
• EEOC investigates and may seek voluntary resolution
• Right to sue letter issued after investigation or 180 days
• Private lawsuit must be filed within 90 days of right to sue letter

REMEDIES:
• Back pay and front pay
• Compensatory damages (emotional distress, out-of-pocket expenses)
• Punitive damages (if willful or reckless conduct)
• Injunctive relief (hiring, reinstatement, promotion)
• Attorney's fees and costs

INVESTIGATION REQUIREMENTS:
• Prompt, thorough, and impartial investigation upon complaint
• Document all steps and findings
• Maintain confidentiality to extent possible
• Take immediate corrective action if violation found
• Prevent retaliation against complainant`,
    tags: ["discrimination", "title-vii", "eeoc", "protected-class", "civil-rights"]
  },

  {
    title: "Florida Civil Rights Act - Employment Discrimination",
    violationType: "discrimination",
    description: "Florida law prohibiting employment discrimination, covering additional protected classes including marital status and HIV/AIDS status.",
    citation: "Florida Statutes §760.10",
    jurisdiction: "florida",
    authoritySource: "Florida Commission on Human Relations (FCHR)",
    regulatoryBody: "Florida Commission on Human Relations",
    content: `The Florida Civil Rights Act (FCRA) prohibits discrimination by employers with 15+ employees on basis of protected characteristics.

PROTECTED CHARACTERISTICS (Florida includes additional classes):
• Race, Color, Religion, Sex, Pregnancy, National Origin (same as Title VII)
• Age (no minimum age threshold - broader than federal ADEA)
• Marital Status (unique to Florida)
• Disability/Handicap (parallel to ADA)
• HIV/AIDS Status (explicit protection under Florida law)

COVERED EMPLOYERS:
• Private employers with 15 or more employees
• State and local governments
• Employment agencies
• Labor organizations

PROHIBITED PRACTICES:
• Discharge, failure to hire, or discrimination in compensation
• Limiting, segregating, or classifying employees
• Creating hostile work environment through harassment
• Retaliation for opposing discriminatory practices
• Retaliation for filing charges or participating in investigations

FILING PROCESS:
• Complaint filed with Florida Commission on Human Relations (FCHR)
• Must be filed within 365 days of alleged discrimination (longer than federal 180/300 days)
• FCHR investigates and issues determination
• Right to file in circuit court if no-cause determination or after 180 days

RELATIONSHIP TO FEDERAL LAW:
• Dual-filing with EEOC common (work-sharing agreement)
• Florida provides broader protection in some areas (marital status, age)
• Can pursue both federal and state remedies
• Florida statute of limitations may be more favorable (365 days vs 180/300)

DAMAGES AND REMEDIES:
• Back pay (up to 2 years before filing)
• Compensatory damages (capped at $100,000)
• Punitive damages (available in some cases)
• Injunctive relief
• Attorney's fees to prevailing party

EMPLOYER INVESTIGATION DUTIES:
• Immediate investigation upon complaint receipt
• Thorough documentation of investigation process
• Interim protective measures during investigation
• Prompt corrective action if discrimination found
• Training and policy updates as preventive measures
• No retaliation against complainants or witnesses

SPECIAL FLORIDA CONSIDERATIONS:
• Marital status protection unique among states
• Explicit HIV/AIDS protection
• Broader age protection than ADEA
• Longer statute of limitations benefits employees`,
    tags: ["discrimination", "florida", "fcra", "fchr", "state-law"]
  },

  // ===== HR INVESTIGATIONS - HARASSMENT =====
  {
    title: "EEOC Guidance on Sexual Harassment",
    violationType: "harassment",
    description: "Comprehensive guidance defining sexual harassment as unlawful sex discrimination, including quid pro quo and hostile environment harassment.",
    citation: "EEOC Compliance Manual §615 (Sexual Harassment)",
    jurisdiction: "federal",
    authoritySource: "EEOC",
    regulatoryBody: "Equal Employment Opportunity Commission",
    content: `Sexual harassment is unwelcome sexual conduct that is term or condition of employment (quid pro quo) or creates hostile work environment.

TYPES OF SEXUAL HARASSMENT:

1. QUID PRO QUO:
   • Submission to sexual conduct made term or condition of employment
   • Employment decision based on acceptance or rejection of sexual advances
   • Examples: "Sleep with me or you're fired" / "Date me to get promotion"
   • Employer strictly liable regardless of knowledge

2. HOSTILE WORK ENVIRONMENT:
   • Unwelcome sexual conduct that is severe or pervasive
   • Conduct unreasonably interferes with work performance
   • Creates intimidating, hostile, or offensive work environment
   • Evaluated from perspective of reasonable person in victim's position

UNWELCOME CONDUCT INCLUDES:
• Unwanted sexual advances or requests for sexual favors
• Sexually suggestive comments, jokes, or innuendos
• Display of sexually explicit materials or images
• Inappropriate touching, gestures, or invasion of personal space
• Sexual comments about person's body, clothing, or appearance
• Sexually explicit emails, texts, or social media communications
• Repeatedly asking someone out after being rejected

EMPLOYER LIABILITY STANDARDS:

SUPERVISOR HARASSMENT (vicarious liability):
• If tangible employment action (firing, demotion): Strict liability
• If no tangible action: Affirmative defense available if employer shows:
  1. Exercised reasonable care to prevent/correct harassment (policy, training, investigation)
  2. Employee unreasonably failed to use preventive/corrective opportunities

CO-WORKER HARASSMENT:
• Employer liable if knew or should have known of harassment and failed to take prompt corrective action

NON-EMPLOYEE HARASSMENT:
• Employer liable if had control over non-employee and failed to address

INVESTIGATION REQUIREMENTS:

PROMPT ACTION:
• Begin investigation immediately (within 24-48 hours of complaint)
• Take interim measures to separate parties if necessary
• Ensure no retaliation during investigation

THOROUGH PROCESS:
• Interview complainant in detail about specific incidents
• Interview accused and allow them to respond
• Interview all witnesses and corroborating sources
• Review documents, emails, texts, and other evidence
• Document all steps with detailed written reports

CREDIBILITY ASSESSMENT:
• Consider inherent plausibility of each party's account
• Evaluate demeanor and candor
• Assess corroborating or conflicting evidence
• Review personnel files for patterns
• Consider any motive to lie

REMEDIAL ACTION:
If harassment found:
• Discipline proportionate to severity (counseling to termination)
• Implement or enhance anti-harassment training
• Modify policies and reporting procedures as needed
• Monitor workplace to ensure no recurrence or retaliation

PREVENTIVE MEASURES:
• Clear anti-harassment policy with examples
• Multiple reporting channels (including bypass of supervisor)
• Regular interactive training for all employees
• Training for managers on recognition and response duties
• Clear disciplinary consequences
• Periodic climate surveys`,
    tags: ["harassment", "sexual-harassment", "eeoc", "hostile-environment", "quid-pro-quo"]
  },

  // ===== HR INVESTIGATIONS - RETALIATION =====
  {
    title: "Title VII Retaliation Prohibition",
    violationType: "retaliation",
    description: "Prohibits retaliation against employees who oppose discrimination, file charges, or participate in investigations under Title VII.",
    citation: "42 USC §2000e-3(a) (Title VII §704)",
    jurisdiction: "federal",
    authoritySource: "EEOC",
    regulatoryBody: "Equal Employment Opportunity Commission",
    content: `Title VII prohibits retaliation against employees for engaging in protected activity related to discrimination.

PROTECTED ACTIVITY (Two Categories):

1. OPPOSITION:
   • Complaining to management about discrimination
   • Refusing to follow discriminatory orders
   • Resisting sexual advances or intervening to protect others
   • Requesting reasonable accommodation
   • Participating in employer's internal discrimination investigation
   • Protected even if underlying discrimination claim is ultimately found without merit (if reasonable belief)

2. PARTICIPATION:
   • Filing EEOC charge of discrimination
   • Cooperating with EEOC investigation
   • Testifying in EEOC proceeding or litigation
   • Serving as witness in discrimination case
   • Protected regardless of merit of underlying claim

PROHIBITED RETALIATORY ACTIONS:
• Termination, demotion, or reassignment
• Reduction in pay or hours
• Exclusion from meetings or training
• Negative performance evaluations
• Increased scrutiny or discipline
• Hostile work environment or harassment
• Threats or intimidation
• Blacklisting or negative references
• Changes in terms and conditions of employment

CAUSATION STANDARD:
• Protected activity must be "but-for" cause of adverse action
• Temporal proximity can establish causal link (close in time)
• Employer's knowledge of protected activity required
• Pattern of antagonism after protected activity is evidence

EMPLOYER DEFENSES:
• Legitimate, non-retaliatory reason for action
• Same action would have occurred absent protected activity
• Performance or conduct issues predating protected activity
• Business necessity
• Burden shifts to employer to articulate legitimate reason

INVESTIGATION PROCEDURES:

COMPLAINT RECEIPT:
• Document date, time, complainant identity
• Record protected activity allegedly triggering retaliation
• Identify adverse action(s) taken
• Establish timeline of events

EVIDENCE GATHERING:
• Personnel file review (discipline, evaluations before/after protected activity)
• Comparison with similarly situated employees
• Email and communication review for animus
• Interview decision-makers about reasons for action
• Document business justifications in contemporaneous records

CREDIBILITY AND CAUSATION:
• Evaluate temporal proximity (days/weeks = suspicious; months = weaker)
• Assess whether reasons are pretextual
• Review history of employer following through on stated reasons
• Consider inconsistent explanations
• Examine whether similarly situated employees treated differently

PREVENTIVE MEASURES:
• Anti-retaliation policy clearly communicated
• Training for managers on recognizing protected activity
• Documentation of legitimate employment decisions
• Avoid actions immediately following protected activity
• Separate decision-makers from those involved in discrimination complaint
• Regular audits of adverse actions post-complaints

PENALTIES:
• Unlimited compensatory and punitive damages (Title VII retaliation)
• Reinstatement and back pay
• Front pay if reinstatement not feasible
• Emotional distress damages
• Attorney's fees and costs
• Injunctive relief

BURLINGTON NORTHERN STANDARD:
• Retaliation includes any action that might deter reasonable person from engaging in protected activity
• Need not result in ultimate economic harm
• Broader than "adverse employment action" standard`,
    tags: ["retaliation", "title-vii", "eeoc", "protected-activity", "whistleblower"]
  },

  // ===== HR INVESTIGATIONS - WAGE & HOUR =====
  {
    title: "FLSA Overtime and Minimum Wage Requirements",
    violationType: "wage_hour",
    description: "Fair Labor Standards Act requirements for minimum wage, overtime pay, record keeping, and child labor standards.",
    citation: "29 USC §201 et seq. (Fair Labor Standards Act)",
    jurisdiction: "federal",
    authoritySource: "Department of Labor (DOL)",
    regulatoryBody: "Wage and Hour Division (WHD)",
    content: `FLSA establishes federal minimum wage, overtime pay, recordkeeping, and youth employment standards affecting full-time and part-time workers.

MINIMUM WAGE:
• Federal minimum: $7.25/hour (effective July 24, 2009)
• Applies to employees engaged in interstate commerce
• Tipped employees: $2.13/hour cash wage if tips bring total to minimum wage (tip credit)
• Employers must make up difference if tips insufficient

OVERTIME PAY:
• Required for hours worked over 40 in workweek
• Rate: 1.5 times regular rate of pay
• Workweek: Fixed, recurring period of 168 hours (7 consecutive 24-hour periods)
• No limit on hours that can be worked (adults)

EXEMPT VS. NON-EXEMPT EMPLOYEES:

WHITE COLLAR EXEMPTIONS (must meet ALL tests):
1. Salary Basis: Paid predetermined amount regardless of hours or quality of work (minimum $684/week = $35,568/year)
2. Salary Level: Meets minimum threshold
3. Duties Test: Primary duties are executive, administrative, professional, computer, or outside sales

EXECUTIVE EXEMPTION:
• Primary duty: Management of enterprise or department/subdivision
• Regularly directs work of 2+ other employees
• Authority to hire/fire or recommendations given particular weight

ADMINISTRATIVE EXEMPTION:
• Primary duty: Office/non-manual work directly related to management or general business operations
• Exercise discretion and independent judgment on significant matters

PROFESSIONAL EXEMPTION:
• Learned Professional: Advanced knowledge in field of science or learning, requiring prolonged specialized instruction
• Creative Professional: Invention, imagination, originality, or talent in artistic or creative field

COMPUTER EMPLOYEE EXEMPTION:
• Salary ≥$684/week OR hourly rate ≥$27.63/hour
• Primary duties: Application of systems analysis, design/development/testing of computer programs, or similar skilled work

COMMON VIOLATIONS:

MISCLASSIFICATION:
• Treating non-exempt employees as exempt (avoiding overtime)
• Misclassifying employees as independent contractors
• Improper use of job titles without meeting duties test

OFF-THE-CLOCK WORK:
• Requiring work before clocking in or after clocking out
• Uncompensated email/phone work outside hours
• Working through meal breaks without compensation

IMPROPER DEDUCTIONS:
• Deductions reducing pay below minimum wage (uniforms, tools, cash register shortages)
• Illegal deductions from exempt employees' salary

COMP TIME (prohibited in private sector):
• Cannot give comp time instead of overtime pay
• Public sector agencies have limited comp time rights

RECORDKEEPING REQUIREMENTS (3 years):
• Employee personal information
• Hours worked each day and workweek
• Regular hourly rate
• Overtime hours and overtime pay
• Deductions and additions to wages
• Total wages paid each pay period
• Date of payment and pay period covered

INVESTIGATION TRIGGERS:
• Employee complaint to DOL Wage & Hour Division
• Tip from another employee or third party
• Targeted industry investigation (high-violation industries)
• Retaliation complaint

PENALTIES:
• Back wages owed (up to 2-3 years)
• Liquidated damages (equal to back wages)
• Civil penalties up to $2,074 per violation
• Criminal prosecution for willful violations`,
    tags: ["wage-hour", "flsa", "overtime", "minimum-wage", "misclassification"]
  },

  {
    title: "Florida Minimum Wage Law",
    violationType: "wage_hour",
    description: "Florida constitutional amendment establishing minimum wage higher than federal rate, with annual adjustments for inflation.",
    citation: "Florida Constitution Article X, Section 24; Florida Statutes §448.110",
    jurisdiction: "florida",
    authoritySource: "Florida Department of Commerce",
    regulatoryBody: "Florida Department of Commerce",
    content: `Florida's minimum wage law, enacted by constitutional amendment, establishes state minimum wage requirements that exceed federal standards.

FLORIDA MINIMUM WAGE:
• Effective September 30, 2024: $13.00/hour
• Scheduled increases to $15.00/hour by September 30, 2026:
  - September 30, 2024: $13.00
  - September 30, 2025: $14.00
  - September 30, 2026: $15.00 (permanent rate)
• After reaching $15.00, adjusted annually for inflation using CPI

TIPPED EMPLOYEES:
• Cash wage: $3.02 plus tips (as of 2024)
• Total compensation must equal or exceed $13.00/hour
• Employer must make up difference if tips insufficient
• Same calculation as federal tip credit

COVERAGE:
• All employees working in Florida regardless of employer size
• No small business exemption (unlike federal FLSA 500k threshold)
• Broader coverage than federal law

POSTING REQUIREMENTS:
• Employers must display Florida minimum wage poster
• Poster available from Florida Department of Commerce
• Must be posted in conspicuous location
• Available in English and Spanish

ENFORCEMENT:
• Employees can file complaint with Florida Attorney General
• Private right of action in Florida courts
• No requirement to exhaust administrative remedies

DAMAGES AND PENALTIES:
• Back wages for all unpaid minimum wage amounts
• Liquidated damages (equal to back wages)
• Attorney's fees and costs for prevailing employee
• Administrative fines for willful violations

RETALIATION PROHIBITED:
• Employers cannot retaliate against employees for:
  - Exercising rights under minimum wage law
  - Filing complaint
  - Participating in investigation or proceeding
• Retaliation claims enforceable through civil action

RELATIONSHIP TO FEDERAL LAW:
• Florida wage applies when higher than federal
• Employees entitled to higher of state or federal minimum
• FLSA overtime rules still apply (Florida has no state overtime law)
• State posting required in addition to federal posting

INVESTIGATION BEST PRACTICES:
• Review time records for all hours worked
• Calculate total compensation including tips
• Verify tip pooling arrangements are lawful
• Check for improper deductions reducing pay below minimum
• Ensure posting requirements met
• Document all wage calculations and payment records`,
    tags: ["wage-hour", "florida", "minimum-wage", "state-law"]
  },

  // ===== HR INVESTIGATIONS - HEALTH & SAFETY =====
  {
    title: "OSHA General Duty Clause and Workplace Safety",
    violationType: "health_safety",
    description: "Occupational Safety and Health Act requirement that employers provide workplace free from recognized hazards causing or likely to cause death or serious physical harm.",
    citation: "29 USC §654(a)(1) (OSH Act Section 5(a)(1))",
    jurisdiction: "federal",
    authoritySource: "OSHA",
    regulatoryBody: "Occupational Safety and Health Administration",
    content: `The General Duty Clause requires every employer to furnish a place of employment free from recognized hazards causing or likely to cause death or serious physical harm.

GENERAL DUTY CLAUSE ELEMENTS:
1. Employer failed to keep workplace free of hazard
2. Hazard was recognized (industry, employer, or common sense recognition)
3. Hazard was causing or likely to cause death or serious physical harm
4. Feasible means existed to eliminate or materially reduce the hazard

RECOGNIZED HAZARDS:
• Industry recognition: Hazard recognized in employer's industry
• Employer recognition: Employer's own knowledge of hazard
• Common sense recognition: Obvious to reasonable person
• Based on expert consensus, industry standards, or prior citations

SERIOUS PHYSICAL HARM:
• Permanent impairment of body
• Chronic irreversible disease
• Temporary or minor injury requiring hospitalization
• Physical harm that causes significant restriction of body function

EMPLOYER DEFENSES:
• Unpreventable employee misconduct
• Greater hazard defense (abatement creates greater risk)
• Infeasibility (economic or technological)
• No feasible means of abatement

WORKPLACE VIOLENCE UNDER GENERAL DUTY CLAUSE:
• Employer may be cited if recognizable risk of violence exists
• Risk assessment should consider:
  - History of violence or threats
  - Nature of business (healthcare, retail, social services)
  - Working conditions (late night, isolated, cash handling)
  - Previous incidents or complaints

EMPLOYER OBLIGATIONS:

HAZARD ASSESSMENT:
• Regular workplace inspections
• Job hazard analyses
• Review of injury/illness records
• Employee safety committees
• Incident investigations

HAZARD PREVENTION:
• Engineering controls (primary method)
• Administrative controls (work practices, training)
• Personal protective equipment (last resort)
• Written safety and health program

TRAINING REQUIREMENTS:
• Hazard communication
• Emergency action procedures
• Proper use of equipment and PPE
• Reporting unsafe conditions

EMPLOYEE RIGHTS:
• Right to file safety complaint with OSHA
• Right to request OSHA inspection
• Protection from retaliation for safety complaints
• Right to refuse dangerous work (in limited circumstances)
• Access to exposure and medical records

OSHA INSPECTIONS:

INSPECTION TRIGGERS:
• Imminent danger situations
• Fatalities and catastrophes (hospitalizations of 3+ employees)
• Employee complaints
• Referrals from other agencies
• Targeted inspections (high-hazard industries)
• Follow-up inspections

INSPECTION PROCESS:
• Opening conference with employer
• Walkaround inspection
• Employee participation rights
• Documentation and evidence gathering
• Closing conference and findings

CITATIONS AND PENALTIES:

VIOLATION TYPES:
• Serious: Substantial probability death or serious harm could result ($1,000-$16,131 per violation)
• Willful: Intentional violation or plain indifference ($10,000-$161,323 per violation)
• Repeat: Same violation within 5 years ($16,131 per violation)
• Failure to Abate: Continuation of cited hazard ($16,131 per day beyond abatement date)

INVESTIGATION REQUIREMENTS:
• Document workplace hazard or safety complaint
• Inspect area and gather evidence
• Interview witnesses
• Review injury/illness records
• Assess feasibility of hazard abatement
• Implement interim protective measures
• Document corrective actions taken
• Follow up to ensure effectiveness`,
    tags: ["health-safety", "osha", "workplace-safety", "general-duty-clause"]
  },

  // ===== HR INVESTIGATIONS - WHISTLEBLOWER =====
  {
    title: "Florida Private Sector Whistleblower Protection",
    violationType: "whistleblower",
    description: "Florida law protecting private sector employees from retaliation for reporting violations of law, rule, or regulation to appropriate government agency.",
    citation: "Florida Statutes §448.102",
    jurisdiction: "florida",
    authoritySource: "Florida courts",
    regulatoryBody: "Florida Department of Legal Affairs",
    content: `Florida's Private Whistleblower Act protects employees who report employer's violations of law to appropriate government agencies.

PROTECTED ACTIVITY:
Employee is protected for:
• Disclosing or threatening to disclose violation of law, rule, or regulation
• Providing information to or testifying before government agency investigating violation
• Objecting to or refusing to participate in unlawful activity

SCOPE OF PROTECTION:

COVERED VIOLATIONS:
• Must be actual violation of law, rule, or regulation
• Includes federal, state, or local laws
• Good faith belief required but not sufficient alone
• Actual violation must exist for protection
• Violation must create substantial and specific danger to public health, safety, or welfare

REPORTING REQUIREMENT:
• Must first report violation to employer in writing
• Give employer reasonable opportunity to correct (unless emergency)
• Then may report to appropriate government agency
• No protection if only internal reporting without external disclosure

PROTECTED DISCLOSURES TO:
• Federal, state, or local government agency
• Law enforcement
• Court or administrative agency with jurisdiction
• Person with authority to investigate, discover, or correct violation

PROHIBITED RETALIATION:
• Discharge from employment
• Discipline or demotion
• Reduction in compensation or benefits
• Threats, intimidation, or harassment
• Other adverse employment actions

REMEDIES:
• Reinstatement to same position and seniority
• Back pay and benefits with interest
• Compensatory damages
• Attorney's fees and costs
• Injunctive relief

FILING REQUIREMENTS:
• File in Florida circuit court
• Must file within 3 years of retaliatory action (not 180 days like SOX)
• No administrative exhaustion required
• Jury trial available

BURDEN OF PROOF:
1. Employee must prove disclosure was of violation creating substantial danger
2. Employee must prove disclosure was contributing factor to adverse action
3. Employer can defend by clear and convincing evidence same action would have occurred absent disclosure

LIMITATIONS:
• Employee must have objective reasonable basis to believe violation exists
• Must follow internal reporting procedure first (give employer chance to correct)
• No protection for reckless or knowing false disclosures
• No protection for violations of employer's internal policies (must be law, rule, or regulation)

EMPLOYER BEST PRACTICES:
• Establish clear whistleblower reporting policy
• Provide multiple reporting channels
• Investigate all reports promptly and thoroughly
• Document legitimate business reasons for employment actions
• Train managers on whistleblower protection requirements
• Maintain anti-retaliation policies
• Separate decision-makers from those involved in whistleblower complaint

INVESTIGATION PROCEDURES:
• Verify report involves violation of law (not just policy)
• Confirm employee followed proper reporting procedure
• Establish timeline of protected activity and adverse action
• Assess causal connection and temporal proximity
• Interview decision-makers about legitimate reasons
• Review documentation of business justifications
• Ensure no continuing retaliation`,
    tags: ["whistleblower", "florida", "retaliation", "protected-activity"]
  },

  // ===== HR INVESTIGATIONS - ACCOMMODATION =====
  {
    title: "ADA Reasonable Accommodation Requirements",
    violationType: "accommodation",
    description: "Americans with Disabilities Act requirement that employers provide reasonable accommodations to qualified individuals with disabilities unless undue hardship.",
    citation: "42 USC §12112(b)(5)(A) (ADA)",
    jurisdiction: "federal",
    authoritySource: "EEOC",
    regulatoryBody: "Equal Employment Opportunity Commission",
    content: `The ADA requires employers to provide reasonable accommodations to qualified individuals with disabilities unless doing so would impose undue hardship.

QUALIFIED INDIVIDUAL WITH DISABILITY:
• Person with physical or mental impairment substantially limiting major life activity
• Who can perform essential functions of job with or without reasonable accommodation
• Meets legitimate skill, experience, education, or other job requirements

DISABILITY DEFINITION:
• Physical or mental impairment substantially limiting one or more major life activities
• Record of such impairment
• Being regarded as having such impairment
• Major life activities: Walking, seeing, hearing, speaking, breathing, learning, working, caring for oneself

REASONABLE ACCOMMODATION:
Modification or adjustment enabling qualified individual with disability to:
• Apply for a job
• Perform essential functions of job
• Enjoy equal benefits and privileges of employment

TYPES OF ACCOMMODATIONS:

JOB RESTRUCTURING:
• Modifying work schedule or shift
• Reallocating or redistributing marginal job functions
• Altering how/when job tasks are performed
• Providing part-time or modified work schedules

WORKPLACE MODIFICATIONS:
• Making facilities accessible
• Modifying equipment or devices
• Providing assistive technology
• Adjusting workstation setup

POLICY MODIFICATIONS:
• Modifying leave policies
• Allowing service animals
• Modifying break schedules
• Relaxing workplace conduct rules (if disability-related)

REASSIGNMENT:
• Last resort accommodation
• To equivalent vacant position
• Not required to create position or bump another employee
• Not required to promote

INTERACTIVE PROCESS:

INITIATION:
• Employee or representative requests accommodation
• No magic words required ("I need...because of medical condition")
• Employer may initiate if aware of need

ENGAGEMENT:
• Ongoing bilateral communication
• Identify precise limitations and barriers
• Explore potential accommodations
• Assess effectiveness of accommodations

MEDICAL DOCUMENTATION:
• Employer may request when disability or need not obvious
• Focus on functional limitations and work restrictions
• Cannot request entire medical file or diagnosis details
• Request must be limited in scope

UNDUE HARDSHIP:
Significant difficulty or expense considering:
• Nature and cost of accommodation
• Overall financial resources and size of employer
• Impact on facility operations
• Type of operations and composition of workforce

NOT REQUIRED ACCOMMODATIONS:
• Eliminating essential job functions
• Lowering production or quality standards
• Providing personal use items (glasses, hearing aids, wheelchairs)
• Accommodations imposing undue hardship
• Accommodations creating direct threat to safety

INVESTIGATION REQUIREMENTS:

ACCOMMODATION REQUEST:
• Document date and substance of request
• Verify disability and need for accommodation
• Engage in interactive process promptly
• Explore multiple accommodation options
• Document all communications and decisions

MEDICAL INQUIRY:
• Request only information necessary to verify disability and need
• Send to employee's healthcare provider
• Use EEOC-compliant questionnaire
• Limit scope to functional limitations
• Keep all medical information confidential

DECISION DOCUMENTATION:
• Document accommodation provided or denial reason
• If denied, show undue hardship or no effective accommodation
• Explain interactive process undertaken
• Maintain separate confidential medical file

ONGOING OBLIGATIONS:
• Periodically reassess accommodation effectiveness
• Adjust as employee's limitations change
• Continue interactive process if new issues arise

COMMON VIOLATIONS:
• Failing to engage in interactive process
• Requesting excessive medical information
• Denying accommodation without showing undue hardship
• Retaliating for requesting accommodation
• Disclosing employee's medical information`,
    tags: ["accommodation", "ada", "disability", "reasonable-accommodation", "interactive-process"]
  },

  {
    title: "FMLA Leave and Job Protection Requirements",
    violationType: "accommodation",
    description: "Family and Medical Leave Act entitlement to unpaid, job-protected leave for specified family and medical reasons with continuation of health coverage.",
    citation: "29 USC §2601 et seq. (FMLA)",
    jurisdiction: "federal",
    authoritySource: "Department of Labor",
    regulatoryBody: "Wage and Hour Division (WHD)",
    content: `FMLA entitles eligible employees to take unpaid, job-protected leave for specified family and medical reasons while maintaining health insurance coverage.

ELIGIBILITY REQUIREMENTS:

COVERED EMPLOYERS:
• Private employers with 50+ employees within 75 miles
• All public agencies (federal, state, local)
• Public and private elementary and secondary schools

ELIGIBLE EMPLOYEES:
• Worked for employer at least 12 months (need not be consecutive)
• Worked at least 1,250 hours during 12 months before leave
• Work at location with 50+ employees within 75 miles

QUALIFYING REASONS FOR LEAVE:

1. BIRTH AND BONDING:
   • Birth of child and care during first year
   • Placement of child for adoption or foster care and bonding during first year

2. SERIOUS HEALTH CONDITION:
   • Employee's own serious health condition making unable to perform job functions
   • Care for spouse, child, or parent with serious health condition

3. MILITARY FAMILY LEAVE:
   • Qualifying exigency arising from family member's covered active duty
   • Care for covered servicemember with serious injury or illness (up to 26 weeks)

SERIOUS HEALTH CONDITION:
• Illness, injury, impairment, or physical/mental condition involving:
  - Inpatient care (overnight hospital, hospice, residential medical facility)
  - Continuing treatment by healthcare provider:
    * Incapacity >3 consecutive days + 2 visits to healthcare provider OR 1 visit + continuing treatment
    * Chronic serious health condition (continues over extended period, periodic visits, episodic)
    * Permanent or long-term condition requiring supervision
    * Multiple treatments for restorative surgery or condition likely to result in >3 days incapacity

LEAVE ENTITLEMENTS:

BASIC LEAVE:
• 12 workweeks per 12-month period for qualifying reasons 1-2
• Employer chooses 12-month period method:
  - Calendar year
  - Fixed year (fiscal year)
  - 12-month period from first FMLA use
  - Rolling 12-month period (measured backward)

MILITARY CAREGIVER LEAVE:
• 26 workweeks per 12-month period
• Combined limit of 26 weeks including other FMLA leave

INTERMITTENT OR REDUCED SCHEDULE LEAVE:
• Available for serious health condition when medically necessary
• Available for military caregiver leave when medically necessary
• NOT available for birth/bonding unless employer agrees
• Employer may transfer to equivalent alternative position

EMPLOYER OBLIGATIONS:

NOTICE REQUIREMENTS:
• General Notice: Post FMLA rights poster in workplace
• Eligibility Notice: Notify employee of eligibility within 5 business days of request
• Rights and Responsibilities Notice: Provide with eligibility notice
• Designation Notice: Notify within 5 business days whether leave approved/denied

CERTIFICATION:
• May require medical certification supporting need for leave
• Must give employee 15 calendar days to provide
• May require second opinion (employer pays)
• May require recertification periodically (every 30 days if minimum duration indicated)

JOB RESTORATION:
• Restore to same position or equivalent position
• Equivalent: Same pay, benefits, working conditions, duties, responsibilities
• No loss of benefits accrued before leave
• Cannot use FMLA leave as negative factor in employment decisions

HEALTH INSURANCE MAINTENANCE:
• Continue group health coverage during leave
• Same terms as if employee continued working
• Employee must pay employee share of premiums
• May recover premiums if employee doesn't return (limited exceptions)

PROHIBITED ACTIONS:
• Interfering with, restraining, or denying exercise of FMLA rights
• Discriminating or retaliating for using FMLA or opposing unlawful practice
• Using FMLA leave as negative factor in employment decisions

INVESTIGATION PROCEDURES:

LEAVE REQUEST ANALYSIS:
• Determine if employee is eligible (tenure, hours, location)
• Assess if reason is FMLA-qualifying
• Request medical certification if not obvious
• Evaluate intermittent or reduced schedule appropriateness

CERTIFICATION REVIEW:
• Verify certification is complete and sufficient
• Request additional information if deficient (give 7 days to cure)
• Obtain second opinion if doubt about validity
• Authenticate/clarify with healthcare provider if questions

DOCUMENTATION:
• Maintain FMLA records separate from personnel file
• Document all leave requests and responses
• Track FMLA leave usage (intermittent/reduced schedule)
• Document reasons for any denial
• Keep medical certifications confidential

COMMON VIOLATIONS:
• Denying leave to eligible employee for qualifying reason
• Retaliating against employee for taking FMLA leave
• Failing to maintain health insurance during leave
• Refusing to restore to same or equivalent position
• Counting FMLA leave as absence under no-fault attendance policy`,
    tags: ["accommodation", "fmla", "leave", "job-protection", "medical-leave"]
  },

  // ===== HR DOCUMENT RETENTION REQUIREMENTS =====
  {
    title: "FLSA Record Retention Requirements",
    violationType: "wage_hour",
    description: "Fair Labor Standards Act requirements for retention of wage, hour, and payroll records",
    citation: "29 CFR §516.5, §516.6",
    jurisdiction: "federal",
    authoritySource: "Department of Labor",
    regulatoryBody: "Wage and Hour Division",
    content: `FLSA requires employers to preserve payroll records, collective bargaining agreements, sales and purchase records for at least 3 years.

RECORDS TO BE PRESERVED FOR 3 YEARS:
• Payroll records
• Collective bargaining agreements, certificates, notices, plans
• Sales and purchase records

RECORDS TO BE PRESERVED FOR 2 YEARS:
• Basic employment and earnings records (supplemental to payroll)
• Wage rate tables
• Work time schedules
• Records of additions to or deductions from wages
• Order, shipping, and billing records

SPECIFIC RECORD RETENTION:

EMPLOYEE INFORMATION (3 years):
• Full name and social security number
• Address including zip code
• Birth date if employee is under 19
• Sex and occupation
• Time and day of week when employee's workweek begins
• Hours worked each day and total hours worked each workweek
• Basis on which employee's wages are paid
• Regular hourly pay rate
• Total daily or weekly straight-time earnings
• Total overtime earnings for the workweek
• All additions to or deductions from wages
• Total wages paid each pay period
• Date of payment and pay period covered

TIME RECORDS (2 years):
• Time cards or other records showing daily starting and stopping times
• Records showing split shift intervals
• Records of meal periods

EXEMPT EMPLOYEE RECORDS (2 years):
• Basis for exemption claim
• Total sales (for commissioned sales employees)
• Time of beginning and ending workday and workweek

WAGE PAYMENT RECORDS (3 years):
• Wage rate schedules
• Tables or schedules showing rates paid
• Time and piecework records
• Records showing deductions and additions to wages

SPECIAL SITUATIONS:

MINORS (3 years):
• Age certificates or work permits

TIP CREDIT RECORDS (2 years):
• Records of tips received
• Tip pooling arrangements
• Employer notification to employees about tip credit

PENALTIES FOR NON-COMPLIANCE:
• Back wages owed to employees
• Liquidated damages equal to back wages
• Civil penalties up to $2,074 per violation
• Criminal prosecution for willful violations

RETENTION BEST PRACTICES:
• Maintain records in safe, accessible location
• Retain electronic records in readable format
• Keep records at place of employment or central records office
• Make records available for DOL inspection
• Preserve records even during litigation or investigation
• Consider longer retention if state law requires
• Implement clear retention and destruction policy`,
    tags: ["wage-hour", "flsa", "record-retention", "compliance"]
  },

  {
    title: "EEOC Record Retention Requirements",
    violationType: "discrimination",
    description: "Equal Employment Opportunity Commission requirements for retention of personnel and employment records",
    citation: "29 CFR §1602.14",
    jurisdiction: "federal",
    authoritySource: "EEOC",
    regulatoryBody: "Equal Employment Opportunity Commission",
    content: `EEOC requires employers to preserve all personnel or employment records for one year from date of making the record or personnel action, whichever is later.

GENERAL RETENTION REQUIREMENT:

ONE YEAR RETENTION (minimum):
• All personnel or employment records
• Application forms and resumes
• Records of hiring, promotion, demotion, transfer, layoff, termination
• Records of rates of pay and other compensation
• Records of selection for training or apprenticeship
• All employment advertisements

EXTENDED RETENTION:

TERMINATION RECORDS (1 year from termination):
• Personnel files of terminated employees
• Final performance evaluations
• Termination documentation
• Exit interviews

CHARGE/LITIGATION RECORDS (until final disposition):
• All records relevant to EEOC charge must be preserved
• Preserve from date charge filed until final disposition
• Includes all records relevant to allegations in charge
• Extends to all related investigations and litigation

APPRENTICESHIP RECORDS (2 years):
• All apprenticeship program records
• Applications for apprenticeship
• Selection criteria and records

SPECIFIC RECORD CATEGORIES:

APPLICANT RECORDS (1 year):
• Job applications and resumes (solicited and unsolicited)
• Interview notes and evaluation forms
• Test results and assessment materials
• Background check records
• Rejection letters and communications

HIRING RECORDS (1 year from hire date):
• Job descriptions and requirements
• Recruitment materials and advertisements
• Application forms and resumes
• Interview scorecards
• Reference checks
• Offer letters
• Pre-employment test results

PROMOTION/TRANSFER RECORDS (1 year from action):
• Internal job postings
• Applications for internal positions
• Performance evaluations
• Promotion recommendations
• Selection criteria and scoring

COMPENSATION RECORDS (1 year):
• Salary and wage information
• Bonus and incentive payments
• Pay increase documentation
• Compensation surveys and analyses
• Equal pay justifications

DISCIPLINE AND TERMINATION (1 year from action):
• Written warnings and counseling memos
• Suspension notices
• Termination letters
• Documentation of reasons for discharge
• Severance agreements
• Non-compete agreements

REDUCTION IN FORCE (RIF) RECORDS (1 year):
• RIF selection criteria
• List of employees considered
• Retention decisions and rationale
• Age and demographic data of affected employees
• WARN Act notices

BEST PRACTICES FOR RETENTION:

LEGAL HOLD:
• Suspend normal destruction when litigation/charge filed
• Preserve all potentially relevant records
• Document legal hold implementation
• Train employees on preservation duties

LONGER RETENTION RECOMMENDED:
• Consider 3-7 year retention for key documents
• Align with statute of limitations periods
• Consider state law requirements (may be longer)
• Maintain records supporting affirmative action plans

ELECTRONIC RECORDS:
• Preserve metadata
• Ensure accessibility and readability
• Back up critical records
• Document retention system

WHAT TO RETAIN DURING EEOC INVESTIGATION:
• All records referenced in charge
• Comparator employee records
• Policy and procedure manuals
• Relevant communications
• Statistical data and reports`,
    tags: ["discrimination", "eeoc", "record-retention", "personnel-records"]
  },

  {
    title: "OSHA Record Retention Requirements",
    violationType: "health_safety",
    description: "Occupational Safety and Health Administration requirements for retention of injury, illness, and exposure records",
    citation: "29 CFR §1904.33, §1910.1020",
    jurisdiction: "federal",
    authoritySource: "OSHA",
    regulatoryBody: "Occupational Safety and Health Administration",
    content: `OSHA requires employers to retain injury and illness records for 5 years and exposure records for duration of employment plus 30 years.

OSHA 300 LOG RETENTION (5 years):

FORMS TO RETAIN:
• OSHA Form 300 (Log of Work-Related Injuries and Illnesses)
• OSHA Form 300A (Summary of Work-Related Injuries and Illnesses)
• OSHA Form 301 (Injury and Illness Incident Report)

RETENTION PERIOD:
• Retain for 5 years following the end of the calendar year covered
• Must update stored logs if changes occur (e.g., case classification changes)
• Must provide access to employees and OSHA upon request

ANNUAL SUMMARY POSTING (300A):
• Post from February 1 to April 30 each year
• Must be posted in conspicuous location
• Retain posted summary for 5 years

EMPLOYEE EXPOSURE RECORDS (30 years):

EXPOSURE MONITORING RECORDS:
• Environmental monitoring or measuring of toxic substance or harmful agent
• Biological monitoring results measuring absorption of toxic substance
• Material safety data sheets (SDS)
• Chemical inventories or any records revealing identity and amount of toxic substance
• Retain for 30 years after employment ends

EMPLOYEE MEDICAL RECORDS (30 years):

MEDICAL RECORDS TO RETAIN:
• Medical and employment questionnaires or histories
• Results of medical examinations (pre-employment, periodic, episodic)
• Medical opinions, diagnoses, progress notes
• Descriptions of treatments and prescriptions
• Employee medical complaints
• First aid records for incidents requiring medical treatment beyond first aid
• Retain for duration of employment plus 30 years

SHORTER RETENTION EXCEPTIONS:

1 YEAR (health insurance claims):
• Health insurance claim records maintained separately from employer's medical program

NOT REQUIRED TO RETAIN:
• Physical specimens (blood, urine samples) if preserved for 1 year
• Records of employees who worked less than 1 year (provide to employee upon termination)
• First aid records for minor injuries requiring only first aid

ANALYSIS AND RECORDS (same as exposure records - 30 years):
• Analysis using exposure or medical records
• Statistical records and studies based on exposure records

ACCESS REQUIREMENTS:

EMPLOYEE ACCESS:
• Must provide access to own exposure and medical records
• Must provide within 15 working days of request
• May charge reasonable copying fee

DESIGNATED REPRESENTATIVE ACCESS:
• Employee's designated representative may access records
• Written consent required for medical records
• No consent needed for exposure records

OSHA ACCESS:
• Must provide immediate access to OSHA compliance officers
• No advance notice required
• Must not charge fee

RECORDS DURING BUSINESS CLOSURE:

TRANSFER REQUIREMENTS:
• If business ceases operations, must transfer records to successor
• If no successor, must notify affected employees 3 months before disposal
• Offer to transmit records to employees or NIOSH

PENALTIES FOR NON-COMPLIANCE:
• Recordkeeping violations: Up to $16,131 per violation
• Failure to maintain or provide access to medical/exposure records: Up to $16,131 per violation
• Falsification: Criminal penalties

BEST PRACTICES:
• Maintain records in secure, organized system
• Ensure records are legible and accessible
• Train recordkeepers on requirements
• Conduct periodic audits of recordkeeping practices
• Implement retention schedule and comply strictly
• Consider electronic recordkeeping for easier access and preservation`,
    tags: ["health-safety", "osha", "record-retention", "injury-records"]
  },

  {
    title: "Florida FCHR Discrimination Record Retention",
    violationType: "discrimination",
    description: "Florida Commission on Human Relations requirements for employment discrimination investigation records",
    citation: "Florida Statutes §760.11",
    jurisdiction: "florida",
    authoritySource: "FCHR",
    regulatoryBody: "Florida Commission on Human Relations",
    content: `Florida law requires preservation of employment records relevant to discrimination claims for the duration of any investigation or litigation.

FLORIDA-SPECIFIC RETENTION:

365-DAY FILING PERIOD:
• Florida provides longer filing period than federal law (365 days vs. 180/300)
• Prudent to retain all employment records for at least 1 year
• Consider longer retention aligned with statute of limitations

RECORDS TO PRESERVE (minimum 1 year):
• Personnel files
• Hiring and promotion decisions
• Disciplinary records
• Performance evaluations
• Compensation records
• Termination documentation
• Any records relating to terms and conditions of employment

EXTENDED RETENTION FOR CLAIMS:
• Once charge filed with FCHR, preserve all relevant records
• Maintain until final disposition of charge and any appeals
• Includes circuit court litigation if no-cause determination
• Preserve comparator employee records
• Maintain policy and procedure documentation

FLORIDA CIVIL RIGHTS ACT COVERAGE:

RECORDS FOR PROTECTED CLASSES:
• Race, color, religion, sex, pregnancy, national origin
• Age (broader than federal - no age 40 minimum)
• Marital status (unique Florida protection)
• Disability/handicap
• HIV/AIDS status

BEST PRACTICES FOR FLORIDA EMPLOYERS:
• Retain employment records for minimum 2-3 years
• Implement legal hold when charge filed
• Preserve electronic communications
• Document legitimate business reasons for decisions
• Maintain consistent retention policy
• Consider that Florida statute of limitations may differ from federal

RELATIONSHIP TO FEDERAL REQUIREMENTS:
• Florida and federal charges often dual-filed
• Must comply with both EEOC and FCHR retention
• Longer of federal or state retention period applies
• 1-year EEOC requirement may be starting point, but Florida's 365-day filing period and litigation possibilities suggest longer retention`,
    tags: ["discrimination", "florida", "fchr", "record-retention"]
  }
];
