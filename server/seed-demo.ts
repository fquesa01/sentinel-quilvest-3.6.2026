import { db } from "./db";
import {
  cases,
  communications,
  alerts,
  interviews,
  users,
  regulations,
  detectionRules,
  connectorConfigurations,
  policies,
  grcRisks,
  grcControls,
  grcIncidents,
  trainingAssignments,
  certifications,
  productionSets,
} from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDemoData() {
  console.log("🌱 Seeding demo investigation data...");

  // Get admin user for demo data
  const [adminUser] = await db.select().from(users).where(sql`role = 'admin'`).limit(1);
  if (!adminUser) {
    console.log("⚠️  No admin user found, skipping seed");
    return;
  }

  const userId = adminUser.id;

  // Demo Case 1: FCPA Violation - Bribery
  const [case1] = await db.insert(cases).values({
    caseNumber: `CASE-FCPA-${Date.now()}-001`,
    title: "Investigation: FCPA - Foreign Official Payments",
    description: "Potential FCPA violation involving payments to foreign government officials in Southeast Asia region for contract facilitation",
    status: "investigation",
    priority: "critical",
    assignedTo: userId,
    createdBy: userId,
    violationType: "fcpa",
  }).returning();
  const case1Id = case1.id;

  // FCPA Email 1: Explicit bribery discussion
  const [fcpaComm1] = await db.insert(communications).values({
    communicationType: "email",
    subject: "Re: Expediting the Singapore Contract",
    body: `Hi Tom,

I had coffee with Minister Lee's assistant today. He made it clear that a "consulting fee" of $50,000 would ensure our contract gets approved by end of month. He suggested we route it through his brother's consulting firm in Malaysia to keep it quiet.

I think we should move forward. This deal is worth $5M to us and everyone does business this way in the region.

What do you think?

Best,
Sarah Chen
VP Business Development`,
    sender: "sarah.chen@company.com",
    recipients: ["tom.williams@company.com"],
    timestamp: new Date("2025-10-15T14:23:00Z"),
    legalHold: "active",
  }).returning();
  const fcpaComm1Id = fcpaComm1.id;

  // FCPA Email 2: Follow-up on payment
  await db.insert(communications).values({
    communicationType: "email",
    subject: "Re: Payment Processing",
    body: `Sarah,

I've set up the wire transfer to "Lee Consulting Services Malaysia" as discussed. Invoice shows "market research services" but we both know what this is really for.

The $50K should hit their account by Friday. Minister Lee's office confirmed they'll fast-track our permits once payment clears.

Keep this email thread between us. Delete after reading.

Tom`,
    sender: "tom.williams@company.com",
    recipients: ["sarah.chen@company.com"],
    timestamp: new Date("2025-10-16T09:45:00Z"),
    legalHold: "active",
  }).returning();

  // FCPA Alert
  await db.insert(alerts).values({
    communicationId: fcpaComm1Id,
    violationType: "fcpa",
    severity: "critical",
    aiAnalysis: "Email contains multiple FCPA red flags: 1) Payment to government official's family member, 2) Disguising payment as 'consulting fee', 3) Routing through third country (Malaysia), 4) Explicit acknowledgment of quid pro quo (contract approval for payment), 5) Intent to conceal transaction. Confidence: 95%",
    flaggedKeywords: ["minister", "consulting fee", "contract approval", "keep it quiet", "route through"],
    riskScore: 95,
    status: "reviewed",
    reviewedBy: userId,
  }).returning();

  // Demo Case 2: Antitrust - Price Fixing
  const [case2] = await db.insert(cases).values({
    caseNumber: `CASE-ANTI-${Date.now()}-002`,
    title: "Investigation: Antitrust - Competitor Price Coordination",
    description: "Evidence of price-fixing conspiracy with major competitor through informal communications",
    status: "investigation",
    priority: "high",
    assignedTo: userId,
    createdBy: userId,
    violationType: "antitrust",
  }).returning();
  const case2Id = case2.id;

  // Antitrust SMS 1: Price coordination
  const [antitrustComm1] = await db.insert(communications).values({
    communicationType: "sms",
    subject: "SMS Message",
    body: `Hey Mike, this is Dave from TechCorp. We're planning to raise our cloud storage prices 15% next quarter. Your team thinking the same? Would be good if we both move together so customers don't all flock to one of us. Coffee next week to discuss?`,
    sender: "+1-415-555-0123",
    recipients: ["+1-415-555-0199"],
    timestamp: new Date("2025-10-20T16:30:00Z"),
    legalHold: "active",
  }).returning();
  const antitrustComm1Id = antitrustComm1.id;

  // Antitrust SMS 2: Market allocation
  await db.insert(communications).values({
    communicationType: "sms",
    subject: "SMS Message",
    body: `Sounds good Dave. We were thinking 12-15% increase too. How about we focus on enterprise customers and you guys take SMB market? Less competition that way. Delete this text after reading btw`,
    sender: "+1-415-555-0199",
    recipients: ["+1-415-555-0123"],
    timestamp: new Date("2025-10-20T16:45:00Z"),
    legalHold: "active",
  }).returning();

  // Antitrust Alert
  await db.insert(alerts).values({
    communicationId: antitrustComm1Id,
    violationType: "antitrust",
    severity: "critical",
    aiAnalysis: "Text messages reveal clear antitrust violations: 1) Coordination of price increases with competitor, 2) Market allocation scheme (enterprise vs SMB split), 3) Consciousness of guilt (request to delete messages). This constitutes per se illegal price fixing under Sherman Act Section 1. Immediate escalation required.",
    flaggedKeywords: ["raise prices", "move together", "market", "competition", "delete this"],
    riskScore: 92,
    status: "reviewed",
    reviewedBy: userId,
  }).returning();

  // Demo Case 3: Off-Channel Communications
  const [case3] = await db.insert(cases).values({
    caseNumber: `CASE-OFFCHAN-${Date.now()}-003`,
    title: "Investigation: Off-Channel Business Communications",
    description: "Employees conducting business discussions via personal email and messaging apps to avoid corporate monitoring",
    status: "review",
    priority: "medium",
    assignedTo: userId,
    createdBy: userId,
    violationType: "other",
  }).returning();
  const case3Id = case3.id;

  // Off-channel Email: Personal email for business
  const [offchannelComm1] = await db.insert(communications).values({
    communicationType: "email",
    subject: "Let's use my Gmail for this",
    body: `Hey team,

I know compliance has been monitoring our work emails lately. Let's switch our discussions about the Q4 revenue projections to my personal Gmail (john.personal@gmail.com). 

We need to talk freely about how to "optimize" the numbers before the board meeting next week. Corporate email isn't the place for those conversations.

I'll send details from my Gmail tonight.

John`,
    sender: "john.smith@company.com",
    recipients: ["finance-team@company.com"],
    timestamp: new Date("2025-10-18T17:20:00Z"),
    legalHold: "active",
  }).returning();
  const offchannelComm1Id = offchannelComm1.id;

  // Off-channel Alert
  await db.insert(alerts).values({
    communicationId: offchannelComm1Id,
    violationType: "sox",
    severity: "high",
    aiAnalysis: "Email reveals intent to evade corporate monitoring systems and discuss 'optimizing' revenue numbers outside official channels. Red flags: 1) Explicit acknowledgment of compliance monitoring, 2) Intent to use personal email for business, 3) Discussion of revenue projection manipulation, 4) Consciousness of wrongdoing. May indicate accounting fraud or SOX violations.",
    flaggedKeywords: ["personal Gmail", "monitoring", "optimize numbers", "not the place for"],
    riskScore: 75,
    status: "reviewed",
    reviewedBy: userId,
  }).returning();

  // Demo Case 4: Insider Trading
  const [case4] = await db.insert(cases).values({
    caseNumber: `CASE-SEC-${Date.now()}-004`,
    title: "Investigation: Material Non-Public Information Sharing",
    description: "Potential insider trading - sharing of material non-public information about pending merger",
    status: "investigation",
    priority: "critical",
    assignedTo: userId,
    createdBy: userId,
    violationType: "sec",
  }).returning();
  const case4Id = case4.id;

  // Insider Trading SMS
  const [insiderComm1] = await db.insert(communications).values({
    communicationType: "sms",
    subject: "SMS Message",
    body: `Hey bro, you didn't hear this from me but we're acquiring MedTech Inc next month. Deal closes at $85/share, stock is at $62 now. Board approved it this morning. Buy before announcement next week and make some $$$. Just don't tell anyone where you heard it. Seriously, this stays between us.`,
    sender: "+1-212-555-0167",
    recipients: ["+1-212-555-0188"],
    timestamp: new Date("2025-10-22T19:15:00Z"),
    legalHold: "active",
  }).returning();
  const insiderComm1Id = insiderComm1.id;

  // Insider Trading Alert
  await db.insert(alerts).values({
    communicationId: insiderComm1Id,
    violationType: "sec",
    severity: "critical",
    aiAnalysis: "Text message contains all elements of insider trading: 1) Material information (acquisition details, price), 2) Non-public (board approval same day, announcement pending), 3) Breach of duty (sharing confidential company information), 4) Personal benefit motive, 5) Consciousness of wrongdoing ('don't tell anyone'). Extremely high risk of SEC enforcement action.",
    flaggedKeywords: ["acquiring", "deal closes", "board approved", "buy before announcement", "don't tell anyone"],
    riskScore: 96,
    status: "reviewed",
    reviewedBy: userId,
  }).returning();

  // Demo Case 5: AML/Reg S-P Privacy
  const [case5] = await db.insert(cases).values({
    caseNumber: `CASE-AML-${Date.now()}-005`,
    title: "Investigation: AML Red Flags & Customer Data Privacy",
    description: "Suspicious transaction structuring and improper handling of customer financial data",
    status: "investigation",
    priority: "high",
    assignedTo: userId,
    createdBy: userId,
    violationType: "banking",
  }).returning();
  const case5Id = case5.id;

  // AML Email
  const [amlComm1] = await db.insert(communications).values({
    communicationType: "email",
    subject: "Re: Customer Request - Large Cash Transactions",
    body: `Hi Jennifer,

Mr. Petrov called again about his $500K cash deposits. He wants to break them into $9,000 increments across multiple days to "avoid paperwork." He offered our branch a $5K bonus if we help him out.

I know this seems fishy but he's been a good customer and the bonus would really help our quarterly numbers. What should I tell him?

Also, he asked for a copy of all his transaction history including other customers' wire transfer details that touched his accounts. I know we're not supposed to share that but he's insisting.

Mark
Branch Manager`,
    sender: "mark.johnson@bank.com",
    recipients: ["jennifer.wong@bank.com"],
    timestamp: new Date("2025-10-19T11:30:00Z"),
    legalHold: "active",
  }).returning();
  const amlComm1Id = amlComm1.id;

  // AML Alert
  await db.insert(alerts).values({
    communicationId: amlComm1Id,
    violationType: "banking",
    severity: "critical",
    aiAnalysis: "Email reveals serious violations: 1) Classic 'structuring' to evade BSA/AML reporting ($10K threshold), 2) Attempted bribery of bank employee, 3) Request for unauthorized disclosure of other customers' financial data (Reg S-P violation). Customer 'Petrov' exhibits multiple money laundering red flags. Immediate SAR filing required.",
    flaggedKeywords: ["break into", "avoid paperwork", "bonus", "transaction history", "other customers"],
    riskScore: 94,
    status: "reviewed",
    reviewedBy: userId,
  }).returning();

  // Add demo interview for Case 1
  await db.insert(interviews).values({
    caseId: case1Id,
    interviewType: "investigative",
    scheduledFor: new Date("2025-11-05T14:00:00Z"),
    intervieweeName: "Sarah Chen",
    intervieweeEmail: "sarah.chen@company.com",
    intervieweeJurisdiction: "California",
    notes: "Key witness interview regarding FCPA investigation. Sarah initiated contact with foreign official's assistant. Need to understand her knowledge of FCPA compliance policies.",
    interviewerIds: [userId],
    status: "scheduled",
    consentRequired: "true",
    consentObtained: "false",
    upjohnWarningGiven: "false",
    isPrivileged: "true",
    privilegeStatus: "attorney_client_privileged",
  }).returning();

  // Add more interviews for other cases
  await db.insert(interviews).values([
    {
      caseId: case2Id,
      interviewType: "investigative",
      scheduledFor: new Date("2025-11-08T10:00:00Z"),
      intervieweeName: "Dave Thompson",
      intervieweeEmail: "dave.thompson@techcorp.com",
      intervieweeJurisdiction: "California",
      notes: "Antitrust investigation interview. Need to determine extent of price coordination discussions.",
      interviewerIds: [userId],
      status: "scheduled",
      consentRequired: "true",
      consentObtained: "false",
      upjohnWarningGiven: "false",
      isPrivileged: "true",
      privilegeStatus: "attorney_client_privileged",
    },
    {
      caseId: case4Id,
      interviewType: "investigative",
      scheduledFor: new Date("2025-11-06T15:00:00Z"),
      intervieweeName: "Executive A",
      intervieweeEmail: "exec.a@company.com",
      intervieweeJurisdiction: "New York",
      notes: "SEC insider trading investigation. Privileged attorney-client communication regarding knowledge of MNPI.",
      interviewerIds: [userId],
      status: "scheduled",
      consentRequired: "true",
      consentObtained: "false",
      upjohnWarningGiven: "true",
      isPrivileged: "true",
      privilegeStatus: "attorney_client_privileged",
    },
  ]);

  // Add Knowledge Base Regulations
  await db.insert(regulations).values([
    {
      title: "FCPA - Foreign Corrupt Practices Act",
      violationType: "fcpa",
      industrySector: "general",
      description: "Prohibits U.S. companies from bribing foreign officials for business advantage. Requires accurate books and records.",
      content: `The Foreign Corrupt Practices Act (FCPA) has two main provisions:

**Anti-Bribery Provisions:**
- Prohibits payment of money or anything of value to foreign officials to obtain or retain business
- Covers payments to intermediaries when there's knowledge they'll be passed to officials
- Covers promises of payment, not just actual payments
- Third-party due diligence is critical

**Accounting Provisions:**
- Requires accurate books and records
- Mandates internal controls to prevent bribery
- Applies to all publicly traded companies

**Red Flags:**
- Requests for cash payments
- Requests to pay third parties or consultants
- Unusual payment terms or amounts
- Payments to family members of officials
- Requests to route payments through tax havens

**Penalties:**
- Criminal fines up to $2M per violation (corporations)
- Individual fines up to $250K and 5 years imprisonment
- Civil penalties up to $16K per violation
- SEC enforcement actions`,
      jurisdiction: "United States",
      effectiveDate: new Date("1977-12-19"),
      version: 1,
    },
    {
      title: "Sherman Act - Antitrust Law",
      violationType: "antitrust",
      industrySector: "general",
      description: "Prohibits anticompetitive agreements and monopolization. Section 1 covers price-fixing, market allocation, bid-rigging.",
      content: `The Sherman Antitrust Act prohibits anticompetitive conduct:

**Section 1 - Restraint of Trade:**
- Price-fixing agreements (per se illegal)
- Market allocation schemes
- Bid-rigging
- Group boycotts
- Tying arrangements

**Red Flags:**
- Discussions with competitors about prices
- Agreements to divide markets or customers
- Information sharing about future pricing
- Coordination of business strategies
- Parallel conduct without legitimate explanation

**Communications to Avoid:**
- Never discuss pricing with competitors
- No agreements to allocate markets or customers
- No sharing of competitively sensitive information
- Avoid trade association discussions of prices
- Document legitimate business justifications

**Penalties:**
- Criminal fines up to $100M (corporations)
- Individual fines up to $1M and 10 years imprisonment
- Treble damages in civil cases
- DOJ criminal prosecution for hardcore violations`,
      jurisdiction: "United States",
      effectiveDate: new Date("1890-07-02"),
      version: 1,
    },
    {
      title: "SOX - Sarbanes-Oxley Act",
      violationType: "sox",
      industrySector: "general",
      description: "Protects investors by improving accuracy and reliability of corporate disclosures. Mandates internal controls and whistleblower protections.",
      content: `Key SOX Provisions for Compliance:

**Section 302 - Corporate Responsibility:**
- CEO/CFO must certify financial statements
- Certify internal controls are effective
- Disclose significant deficiencies

**Section 404 - Internal Controls:**
- Document and test internal controls
- Assess effectiveness annually
- External auditor attestation required

**Section 802 - Document Retention:**
- Preserve documents relevant to audits/investigations
- Criminal penalties for destroying documents
- 5 year retention for audit workpapers

**Section 806 - Whistleblower Protection:**
- Protects employees who report fraud
- Prohibits retaliation
- Establishes complaint procedures

**Section 906 - CEO/CFO Certification:**
- Criminal penalties for false certification
- Up to 20 years imprisonment for willful violations

**Red Flags:**
- Pressure to "optimize" or manipulate financial results
- Off-channel communications about financials
- Document destruction requests
- Retaliation against whistleblowers
- Weak or bypassed internal controls`,
      jurisdiction: "United States",
      effectiveDate: new Date("2002-07-30"),
      version: 1,
    },
    {
      title: "Regulation S-P - Customer Privacy",
      violationType: "privacy",
      industrySector: "financial_services",
      description: "Requires financial institutions to protect customer information and provide privacy notices.",
      content: `Reg S-P Privacy Requirements:

**Privacy Notice Requirements:**
- Initial privacy notice to customers
- Annual privacy notice
- Opt-out notice for information sharing

**Safeguards Rule:**
- Implement administrative safeguards
- Technical safeguards for customer data
- Physical security measures
- Regular risk assessments

**Information Covered:**
- Nonpublic personal information (NPI)
- Customer financial information
- Account numbers and balances
- Transaction history
- Credit reports and scores

**Prohibited Sharing:**
- Cannot share account numbers for marketing
- Must allow opt-out of third-party sharing
- Cannot disclose NPI to nonaffiliated third parties without consent

**Security Incidents:**
- Must notify customers of breaches
- Implement incident response procedures
- Document security incidents

**Penalties:**
- Civil money penalties up to $1M per violation
- Enforcement by SEC, CFTC, FTC
- State regulatory actions
- Customer lawsuits`,
      jurisdiction: "United States",
      effectiveDate: new Date("2000-11-13"),
      version: 1,
    },
    {
      title: "Bank Secrecy Act / AML Requirements",
      violationType: "banking",
      industrySector: "financial_services",
      description: "Requires financial institutions to assist in detecting and preventing money laundering. Mandates reporting of suspicious activities.",
      content: `BSA/AML Key Requirements:

**Suspicious Activity Reports (SARs):**
- File within 30 days of detection
- Transactions over $5,000 involving suspicious activity
- Keep confidential - do not tip off customer
- Document decision-making process

**Currency Transaction Reports (CTRs):**
- Report cash transactions over $10,000
- Multiple related transactions count
- Monitor for structuring

**Customer Due Diligence (CDD):**
- Verify customer identity
- Understand nature of business
- Identify beneficial owners
- Monitor for suspicious activity

**Red Flags for Structuring:**
- Multiple transactions just under $10K
- Customer requests to split transactions
- Unusual patterns of cash activity
- Customer knowledge of reporting thresholds
- Reluctance to provide information

**Red Flags for Money Laundering:**
- Transactions inconsistent with business
- Complex ownership structures
- High-risk jurisdictions
- Frequent large cash deposits
- No apparent business purpose

**Penalties:**
- Criminal penalties up to $500K
- Imprisonment up to 10 years
- Civil penalties up to $25K per violation
- Regulatory enforcement actions`,
      jurisdiction: "United States",
      effectiveDate: new Date("1970-10-26"),
      version: 1,
    },
  ]);

  // Add Detection Rules
  await db.insert(detectionRules).values([
    {
      ruleName: "FCPA Foreign Official Payment Keywords",
      ruleDescription: "Detects keywords related to foreign official bribery and FCPA violations",
      detectionType: "keyword",
      violationType: "fcpa",
      industrySectors: null, // Applies to all sectors
      keywords: ["bribe", "kickback", "foreign official", "minister", "government official", "consulting fee", "facilitation payment", "expedite", "grease payment"],
      regexPatterns: ["payment.*foreign.*official", "minister.*payment", "consulting.*fee.*government"],
      severity: "critical",
      riskScore: 90,
      isActive: "true",
    },
    {
      ruleName: "Antitrust Price Coordination Detection",
      ruleDescription: "Detects communications related to price fixing and market allocation",
      detectionType: "keyword",
      violationType: "antitrust",
      industrySectors: null,
      keywords: ["price increase", "coordinate", "competitor", "market share", "divide market", "allocate customers", "bid rigging"],
      regexPatterns: ["price.*competitor", "coordinate.*pricing", "split.*market"],
      severity: "critical",
      riskScore: 85,
      isActive: "true",
    },
    {
      ruleName: "Off-Channel Communication Detection",
      ruleDescription: "Identifies business conducted on personal or unapproved channels",
      detectionType: "keyword",
      violationType: "other",
      industrySectors: null,
      keywords: ["personal email", "gmail", "yahoo", "whatsapp", "telegram", "burner phone", "delete this", "off the record"],
      regexPatterns: ["personal.*email.*business", "delete.*message", "off.*record"],
      severity: "high",
      riskScore: 70,
      isActive: "true",
    },
    {
      ruleName: "Insider Trading MNPI Keywords",
      ruleDescription: "Detects material non-public information sharing",
      detectionType: "keyword",
      violationType: "sec",
      industrySectors: ["financial_services", "broker_dealer", "investment_advisor"],
      keywords: ["material non-public", "MNPI", "insider information", "acquisition", "merger", "earnings", "don't tell", "buy before announcement"],
      regexPatterns: ["buy.*before.*announcement", "insider.*information", "merger.*confidential"],
      severity: "critical",
      riskScore: 95,
      isActive: "true",
    },
    {
      ruleName: "AML Structuring Detection",
      ruleDescription: "Identifies potential transaction structuring to avoid reporting",
      detectionType: "keyword",
      violationType: "banking",
      industrySectors: ["financial_services"],
      keywords: ["structure", "avoid reporting", "split payment", "under 10000", "cash transaction", "suspicious activity"],
      regexPatterns: ["avoid.*reporting", "split.*transaction.*10", "structure.*payment"],
      severity: "critical",
      riskScore: 90,
      isActive: "true",
    },
  ]);

  // Add Connector Configurations
  await db.insert(connectorConfigurations).values([
    {
      connectorName: "Microsoft 365 Email",
      connectorType: "email_m365",
      isActive: "true",
      syncFrequency: 300,
      lastSyncAt: new Date(),
      configurationData: { tenant: "company.onmicrosoft.com", auth: "oauth2" },
      createdBy: userId,
    },
    {
      connectorName: "Slack Workspace",
      connectorType: "chat_slack",
      isActive: "true",
      syncFrequency: 300,
      lastSyncAt: new Date(),
      configurationData: { workspace: "company-workspace" },
      createdBy: userId,
    },
    {
      connectorName: "Corporate MDM - SMS Monitor",
      connectorType: "sms_mobile",
      isActive: "true",
      syncFrequency: 600,
      lastSyncAt: new Date(),
      configurationData: { provider: "AirWatch", deviceCount: 450 },
      createdBy: userId,
    },
  ]);

  // Add GRC Policies
  await db.insert(policies).values([
    {
      policyName: "Anti-Bribery and Corruption Policy",
      description: "Comprehensive policy prohibiting bribery of foreign officials and requiring third-party due diligence",
      policyCategory: "ethics",
      version: "2.1",
      effectiveDate: new Date("2025-01-01"),
      policyContent: "This policy establishes requirements for preventing bribery and corruption in all business dealings...",
    },
    {
      policyName: "Data Privacy and Security Policy",
      description: "Requirements for handling customer data and maintaining privacy compliance",
      policyCategory: "data_privacy",
      version: "3.0",
      effectiveDate: new Date("2025-01-01"),
      policyContent: "All customer data must be protected according to applicable privacy regulations...",
    },
    {
      policyName: "Business Communications Policy",
      description: "Guidelines for appropriate business communications and off-channel prevention",
      policyCategory: "code_of_conduct",
      version: "1.5",
      effectiveDate: new Date("2025-01-01"),
      policyContent: "All business communications must use approved corporate channels...",
    },
  ]);

  // Add GRC Risks
  await db.insert(grcRisks).values([
    {
      riskTitle: "FCPA Violation Risk in International Sales",
      riskDescription: "Risk of inappropriate payments to foreign officials in high-risk jurisdictions",
      category: "regulatory",
      status: "active",
      likelihood: "medium",
      impact: "critical",
      inherentRiskScore: 12, // medium (3) x critical (4)
      riskOwner: userId,
      mitigationStrategy: "Implement enhanced due diligence and approval workflows for international transactions",
      createdBy: userId,
    },
    {
      riskTitle: "Customer Data Breach Risk",
      riskDescription: "Risk of unauthorized access or disclosure of customer financial information",
      category: "operational",
      status: "active",
      likelihood: "medium",
      impact: "high",
      inherentRiskScore: 9, // medium (3) x high (3)
      riskOwner: userId,
      mitigationStrategy: "Deploy encryption, access controls, and continuous monitoring",
      createdBy: userId,
    },
  ]);

  // Add GRC Controls
  await db.insert(grcControls).values([
    {
      controlId: "CTRL-FCPA-001",
      controlTitle: "Third-Party Due Diligence",
      controlDescription: "Mandatory background checks and due diligence for all international agents and consultants",
      controlType: "detective",
      controlCategory: "compliance",
      controlOwner: userId,
      effectiveness: "effective",
      testingFrequency: "per_event",
      lastTestDate: new Date(),
      createdBy: userId,
    },
    {
      controlId: "CTRL-COM-001",
      controlTitle: "Communication Monitoring System",
      controlDescription: "AI-powered monitoring of email, messaging, and SMS for compliance violations",
      controlType: "detective",
      controlCategory: "it_security",
      controlOwner: userId,
      effectiveness: "effective",
      testingFrequency: "continuous",
      lastTestDate: new Date(),
      createdBy: userId,
    },
  ]);

  // Add GRC Incidents (in addition to investigation cases)
  await db.insert(grcIncidents).values([
    {
      incidentNumber: `INC-${Date.now()}-001`,
      incidentTitle: "Phishing Email to Finance Team",
      incidentDescription: "Multiple employees received phishing emails requesting wire transfer approvals",
      incidentType: "security_breach",
      status: "resolved",
      severity: "medium",
      reportedBy: userId,
      createdBy: userId,
    },
  ]);

  // Add Production Sets for eDiscovery
  await db.insert(productionSets).values([
    {
      createdBy: userId,
      caseId: case1Id,
      productionName: "SEC Request - FCPA Investigation",
      productionNumber: "PROD-001",
      productionType: "initial",
      status: "completed",
      batesPrefix: "SENT-FCPA",
      batesStartNumber: 1,
      batesPadding: 6,
      batesLevel: "page",
      exportFormat: "relativity",
      renditionType: "native_pdf",
      includeNatives: "true",
      includeText: "true",
      includeMetadata: "true",
      applyRedactions: "true",
      redactionStyle: "black_box",
      validationStatus: "passed",
      documentCount: 23,
      pageCount: 147,
    },
    {
      createdBy: userId,
      caseId: case2Id,
      productionName: "DOJ Antitrust Subpoena Response",
      productionNumber: "PROD-002",
      productionType: "initial",
      status: "processing",
      batesPrefix: "SENT-ANT",
      batesStartNumber: 1,
      batesPadding: 6,
      batesLevel: "document",
      exportFormat: "concordance",
      renditionType: "native_pdf",
      includeNatives: "true",
      includeText: "true",
      includeMetadata: "true",
      applyRedactions: "false",
      validationStatus: "pending",
      documentCount: 15,
      pageCount: 89,
    },
  ]);

  console.log("✅ Demo data seeded successfully!");
  console.log(`
  📊 Demo Data Summary:
  - 5 Investigation Cases created
  - 7 Communications (emails & SMS) created
  - 5 Alerts created
  - 3 Interviews scheduled
  - 5 Regulations (Knowledge Base) created
  - 5 Detection Rules created
  - 3 Connector Configurations created
  - 3 GRC Policies created
  - 2 GRC Risks created
  - 2 GRC Controls created
  - 1 GRC Incident created
  - 2 Production Sets (eDiscovery) created
  
  🔍 Demo Scenarios:
  1. FCPA - Foreign Official Bribery (Critical)
  2. Antitrust - Price Fixing (Critical)
  3. Off-Channel - Business on Personal Email (High)
  4. Insider Trading - MNPI Sharing (Critical)
  5. AML - Transaction Structuring (Critical)
  `);

  return {
    success: true,
    cases: 5,
    communications: 7,
    alerts: 5,
    interviews: 3,
    regulations: 5,
    detectionRules: 5,
    connectors: 3,
    policies: 3,
    grcRisks: 2,
    grcControls: 2,
    grcIncidents: 1,
    productionSets: 2,
  };
}
