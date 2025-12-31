import { db } from "./db";
import {
  users,
  communications,
  alerts,
  cases,
  detectionRules,
  regulations,
  interviews,
  remediationPlans,
  regulatoryStrategies,
  disclosurePlaybooks,
  boardReports,
  productionSets,
  policies,
  grcRisks,
  grcControls,
  grcIncidents,
  trainingAssignments,
  certifications,
  privilegeLogs,
  hotlineReports,
  whistleblowerProtections,
} from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Comprehensive Demo Data Seeder
 * Populates ALL sections of Sentinel Counsel with realistic data
 */

export async function seedAllDemoData() {
  console.log("🌱 Starting comprehensive demo data seeding...");

  // Clean up existing demo data (delete in dependency order)
  console.log("\n🧹 Cleaning up existing demo data...");
  try {
    await db.execute(sql`
      DELETE FROM hotline_reports WHERE report_number LIKE 'HTL-2025-%';
    `);
    await db.execute(sql`
      DELETE FROM interviews WHERE created_at > NOW() - INTERVAL '1 day';
    `);
    await db.execute(sql`
      DELETE FROM board_reports;
    `);
    await db.execute(sql`
      DELETE FROM disclosure_playbooks;
    `);
    await db.execute(sql`
      DELETE FROM regulatory_strategies;
    `);
    await db.execute(sql`
      DELETE FROM remediation_plans;
    `);
    await db.execute(sql`
      DELETE FROM privilege_logs;
    `);
    await db.execute(sql`
      DELETE FROM production_sets;
    `);
    await db.execute(sql`
      DELETE FROM policies WHERE title LIKE '%Policy';
    `);
    await db.execute(sql`
      DELETE FROM cases WHERE case_number LIKE 'CASE-2025-%';
    `);
    await db.execute(sql`
      DELETE FROM alerts WHERE created_at > NOW() - INTERVAL '1 day';
    `);
    await db.execute(sql`
      DELETE FROM communications WHERE sender LIKE '%@globalcorp.com' OR sender LIKE '%@techcorp.com';
    `);
    await db.execute(sql`
      DELETE FROM regulations WHERE title LIKE '%FCPA%' OR title LIKE '%Sherman%' OR title LIKE '%SOX%';
    `);
    console.log("✓ Cleanup complete");
  } catch (error) {
    console.log("⚠️  Cleanup had errors (this is OK for first run):", error.message);
  }

  // Get or create demo admin user
  let adminUser = await db
    .select()
    .from(users)
    .where(sql`email = 'demo.admin@sentinelcounsel.com'`)
    .limit(1)
    .then((rows) => rows[0]);

  if (!adminUser) {
    console.log("Creating demo admin user...");
    [adminUser] = await db
      .insert(users)
      .values({
        id: "demo-admin-001",
        email: "demo.admin@sentinelcounsel.com",
        firstName: "Demo",
        lastName: "Admin",
        role: "admin",
      })
      .returning();
  }

  const userId = adminUser.id;
  console.log(`✓ Using admin user: ${adminUser.email}`);

  // ===========================================
  // 1. REGULATIONS (Knowledge Base Foundation)
  // ===========================================
  console.log("\n📚 Seeding Regulations...");
  
  const regulationsData = [
    {
      title: "FCPA Anti-Bribery Provisions",
      violationType: "fcpa" as const,
      description: "Prohibits bribing foreign officials for business purposes",
      content: "The FCPA's anti-bribery provisions prohibit the willful use of interstate commerce to bribe foreign officials. This includes payments, promises, or authorization of anything of value to influence official acts, secure improper advantages, or obtain/retain business.",
      citation: "15 U.S.C. §§ 78dd-1, et seq.",
      jurisdiction: "federal",
      tags: ["bribery", "foreign officials", "corruption"],
    },
    {
      title: "Sherman Antitrust Act Section 1",
      violationType: "antitrust" as const,
      description: "Prohibits price fixing and anticompetitive agreements",
      content: "Section 1 prohibits contracts, combinations, or conspiracies in restraint of trade. Price fixing is a per se violation. Competitors cannot agree on prices, discounts, or terms of sale.",
      citation: "15 U.S.C. § 1",
      jurisdiction: "federal",
      tags: ["price fixing", "antitrust", "competition"],
    },
    {
      title: "SOX Section 404 - Internal Controls",
      violationType: "sox" as const,
      description: "Requires management assessment of internal controls",
      content: "Section 404 requires annual internal control reports by management and independent auditor attestation. Management must assess effectiveness of internal control structure and procedures for financial reporting.",
      citation: "15 U.S.C. § 7262",
      jurisdiction: "federal",
      tags: ["internal controls", "financial reporting", "audit"],
    },
  ];

  for (const reg of regulationsData) {
    await db
      .insert(regulations)
      .values(reg)
      .onConflictDoNothing();
  }
  console.log(`✓ Seeded ${regulationsData.length} regulations`);

  // ===========================================
  // 2. COMMUNICATIONS (Primary Evidence)
  // ===========================================
  console.log("\n📧 Seeding Communications...");

  const commsData = [
    // FCPA Email Chain
    {
      communication_type: "email",
      subject: "Re: Singapore Contract - Urgent",
      body: `Tom,

I met with Minister Lee's assistant yesterday. He made it very clear that a "consulting fee" of $75,000 would expedite our contract approval from 6 months to 3 weeks.

He suggested we route the payment through his brother's firm "Lee Consulting Services Malaysia" to keep it off the radar. The invoice would say "market research services."

This $8M deal is critical for our Q4 numbers. Everyone does business this way in Southeast Asia.

Your thoughts?

Sarah Chen
VP Business Development`,
      sender: "sarah.chen@globalcorp.com",
      recipients: ["tom.williams@globalcorp.com"],
      timestamp: new Date("2025-10-15T14:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },
    {
      communication_type: "email",
      subject: "Re: Singapore Contract - Urgent",
      body: `Sarah,

Wire transfer to "Lee Consulting Services Malaysia" processed. $75K will hit their account Friday.

Minister Lee's office confirmed fast-track approval once payment clears.

DELETE THIS EMAIL after reading. We never had this conversation.

Tom`,
      sender: "tom.williams@globalcorp.com",
      recipients: ["sarah.chen@globalcorp.com"],
      timestamp: new Date("2025-10-16T09:15:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },
    // Antitrust Price Fixing
    {
      communication_type: "sms",
      subject: "SMS Message",
      body: "Meeting with Acme Corp VP tomorrow to discuss pricing strategy. They're willing to match our 15% increase if we stay out of the northeast territory.",
      sender: "+1-555-0123",
      recipients: ["+1-555-0199"],
      timestamp: new Date("2025-10-20T16:45:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },
    {
      communication_type: "sms",
      subject: "SMS Message",
      body: "Perfect. I'll confirm with Widget Industries. If we all raise prices together, customers have no choice. Split territories Northeast/Southeast/West.",
      sender: "+1-555-0199",
      recipients: ["+1-555-0123"],
      timestamp: new Date("2025-10-20T17:02:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },
    // SOX Internal Controls
    {
      communication_type: "email",
      subject: "Q3 Financials - Revenue Recognition Issue",
      body: `Team,

CFO wants us to recognize the $2.3M TechStart contract in Q3 even though delivery won't happen until Q4. He said "the street expects 8% growth and we need to hit that number."

I told him this violates revenue recognition principles, but he said "make it work" and that "everyone does this."

Should I proceed? This feels wrong from a controls perspective.

Jennifer Martinez
Controller`,
      sender: "j.martinez@techcorp.com",
      recipients: ["accounting-team@techcorp.com"],
      timestamp: new Date("2025-09-28T11:20:00Z"),
      legal_hold: "pending",
      source_type: "email_m365",
    },
    // Insider Trading
    {
      communication_type: "sms",
      subject: "SMS Message",
      body: "Board meeting was brutal. Merger falling apart. Announcement next week will tank stock. Sell your shares NOW before it goes public.",
      sender: "+1-555-0245",
      recipients: ["+1-555-0287"],
      timestamp: new Date("2025-10-18T19:30:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },
  ];

  const insertedComms = [];
  for (const comm of commsData) {
    const result = await db.execute(sql`
      INSERT INTO communications (
        communication_type, subject, body, sender, recipients, 
        timestamp, legal_hold, source_type
      )
      VALUES (
        ${comm.communication_type}, ${comm.subject}, ${comm.body}, 
        ${comm.sender}, ${JSON.stringify(comm.recipients)}, 
        ${comm.timestamp}, ${comm.legal_hold}, ${comm.source_type}
      )
      RETURNING *
    `);
    if (result.rows && result.rows.length > 0) {
      insertedComms.push(result.rows[0]);
    }
  }
  console.log(`✓ Seeded ${insertedComms.length} communications`);

  // ===========================================
  // 3. ALERTS (Flagged Communications)
  // ===========================================
  console.log("\n🚨 Seeding Alerts...");

  const alertsData = [
    {
      communicationId: insertedComms[0].id,
      violationType: "fcpa" as const,
      severity: "critical" as const,
      status: "under_review" as const,
      riskScore: 95,
      flaggedKeywords: ["consulting fee", "expedite", "off the radar", "market research services"],
      aiAnalysis: "HIGH RISK: Email discusses routing payment through third-party intermediary to foreign official's relative. Classic FCPA red flags: unusual payment structure, expedited approval, concealment language ('keep it off radar'), false invoicing ('market research'). Recommend immediate legal hold and investigation.",
      escalationReason: "Potential FCPA violation - payment to foreign official through intermediary",
      assignedTo: userId,
    },
    {
      communicationId: insertedComms[2].id,
      violationType: "antitrust" as const,
      severity: "critical" as const,
      status: "escalated" as const,
      riskScore: 92,
      flaggedKeywords: ["match our increase", "stay out of territory", "pricing strategy"],
      aiAnalysis: "CRITICAL: SMS discusses price coordination and market allocation with competitor. Clear Sherman Act Section 1 violation. Competitors agreeing to match price increases and divide territories is per se illegal. Immediate investigation required.",
      escalationReason: "Antitrust violation - horizontal price fixing and market allocation",
      assignedTo: userId,
    },
    {
      communicationId: insertedComms[4].id,
      violationType: "sox" as const,
      severity: "high" as const,
      status: "new" as const,
      riskScore: 85,
      flaggedKeywords: ["revenue recognition", "Q3 even though", "Q4", "make it work"],
      aiAnalysis: "HIGH RISK: Controller expressing concerns about improper revenue recognition at CFO's direction. Potential SOX Section 404 internal controls violation. Revenue recognition timing manipulation to meet earnings targets.",
      escalationReason: null,
      assignedTo: null,
    },
  ];

  const insertedAlerts = [];
  for (const alert of alertsData) {
    const [inserted] = await db.insert(alerts).values(alert).onConflictDoNothing().returning();
    if (inserted) {
      insertedAlerts.push(inserted);
    }
  }
  console.log(`✓ Seeded ${insertedAlerts.length} alerts (may skip existing)`);

  // ===========================================
  // 4. CASES (Active Investigations)
  // ===========================================
  console.log("\n📁 Seeding Cases...");

  const casesData = [
    {
      caseNumber: "CASE-2025-0001",
      alertId: insertedAlerts[0].id,
      title: "FCPA Investigation: Singapore Infrastructure Bribery",
      description: "Investigation into potential FCPA violations involving payments to Singapore government officials through Malaysian intermediary for contract facilitation",
      status: "investigation" as const,
      violationType: "fcpa" as const,
      priority: "critical",
      employeeName: "Sarah Chen",
      employeePosition: "VP Business Development",
      createdBy: userId,
      assignedTo: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "pending" as const,
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged" as const,
      privilegeBasis: "counsel_directed_investigation" as const,
      riskScore: 95,
      riskLevel: "critical",
      aiAnalysisSummary: "High-risk FCPA violation involving classic bribery red flags: third-party intermediary related to foreign official, expedited approval, concealment tactics, false invoicing. Potential penalties: $2M+ fines, criminal prosecution.",
    },
    {
      caseNumber: "CASE-2025-0002",
      alertId: insertedAlerts[1].id,
      title: "Antitrust Investigation: Price Fixing Cartel",
      description: "Investigation into horizontal price fixing and market allocation agreements with competitors Acme Corp and Widget Industries",
      status: "investigation" as const,
      violationType: "antitrust" as const,
      priority: "critical",
      employeeName: "Michael Roberts",
      employeePosition: "Sales Director",
      createdBy: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "in_review" as const,
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged" as const,
      privilegeBasis: "counsel_directed_investigation" as const,
      riskScore: 92,
      riskLevel: "critical",
      aiAnalysisSummary: "Sherman Act Section 1 per se violation. Competitors coordinating price increases and dividing geographic territories. Potential treble damages, criminal prosecution, individual jail time. Recommend immediate self-disclosure to DOJ.",
    },
    {
      caseNumber: "CASE-2025-0003",
      alertId: insertedAlerts[2].id,
      title: "SOX Investigation: Revenue Recognition Manipulation",
      description: "Investigation into improper revenue recognition practices directed by CFO to meet quarterly earnings targets",
      status: "alert" as const,
      violationType: "sox" as const,
      priority: "high",
      employeeName: "Jennifer Martinez",
      employeePosition: "Controller",
      createdBy: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "pending" as const,
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged" as const,
      privilegeBasis: "counsel_directed_investigation" as const,
      riskScore: 85,
      riskLevel: "high",
      aiAnalysisSummary: "SOX 404 internal controls breakdown. Management override of revenue recognition controls to manipulate earnings. Potential SEC enforcement action, restatement, executive sanctions.",
    },
  ];

  const insertedCases = [];
  for (const caseData of casesData) {
    const [inserted] = await db.insert(cases).values(caseData).onConflictDoNothing().returning();
    if (inserted) {
      insertedCases.push(inserted);
    } else {
      // Case already exists, fetch it
      const existing = await db.select().from(cases).where(sql`case_number = ${caseData.caseNumber}`).limit(1);
      if (existing.length > 0) {
        insertedCases.push(existing[0]);
      }
    }
  }
  console.log(`✓ Seeded ${insertedCases.length} cases`);

  // ===========================================
  // 5. PRIVILEGE LOG (Attorney Work Product)
  // ===========================================
  console.log("\n⚖️  Seeding Privilege Log...");

  const privilegeLogsData = [
    {
      documentId: insertedComms[0].id,
      documentType: "email",
      documentDate: new Date("2025-10-15T14:30:00Z"),
      documentDescription: "Email regarding Singapore Contract and consulting fee arrangement",
      author: "sarah.chen@globalcorp.com",
      privilegeType: "attorney_client_privileged",
      privilegeBasis: "counsel_directed_investigation",
      privilegeAssertion: "Attorney-client privileged communication made at direction of counsel during FCPA investigation. Protected under Upjohn doctrine.",
      isCounselDirected: "true",
      isPartiallyPrivileged: "false",
      redactionApplied: "false",
      assertedBy: userId,
      assertedAt: new Date("2025-10-16"),
      exportedForLitigation: "false",
      reviewedBy: userId,
      notes: "Email contains attorney-client privileged communications regarding FCPA investigation strategy. Protected under Upjohn doctrine as counsel-directed investigation.",
    },
    {
      documentId: insertedCases[0].id,
      documentType: "case",
      documentDate: new Date("2025-10-15"),
      documentDescription: "FCPA Investigation file - Singapore Infrastructure Bribery",
      author: "External Counsel",
      privilegeType: "work_product",
      privilegeBasis: "attorney_work_product",
      privilegeAssertion: "Attorney work product prepared in anticipation of litigation. Contains mental impressions, legal strategy, and analysis.",
      isCounselDirected: "true",
      isPartiallyPrivileged: "false",
      redactionApplied: "false",
      assertedBy: userId,
      assertedAt: new Date("2025-10-16"),
      exportedForLitigation: "false",
      reviewedBy: userId,
      notes: "Investigation file contains attorney work product prepared in anticipation of litigation. Mental impressions, legal strategy, and analysis protected.",
    },
  ];

  for (const log of privilegeLogsData) {
    await db.insert(privilegeLogs).values(log).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${privilegeLogsData.length} privilege log entries`);

  // ===========================================
  // 6. REMEDIATION PLANS
  // ===========================================
  console.log("\n🔧 Seeding Remediation Plans...");

  const remediationPlansData = [
    {
      caseId: insertedCases[0].id,
      title: "FCPA Compliance Program Enhancement",
      violationType: "fcpa",
      description: "Comprehensive remediation plan to enhance FCPA compliance program following Singapore bribery investigation",
      status: "in_progress",
      priority: "critical",
      targetCompletionDate: new Date("2026-03-31"),
      assignedTo: userId,
      createdBy: userId,
      remediationSteps: [
        {
          step: "Conduct company-wide FCPA training",
          status: "in_progress",
          dueDate: "2026-01-15",
          responsible: "Compliance Officer",
        },
        {
          step: "Implement enhanced third-party due diligence procedures",
          status: "pending",
          dueDate: "2026-02-28",
          responsible: "Legal Department",
        },
        {
          step: "Establish anonymous whistleblower hotline",
          status: "completed",
          dueDate: "2025-12-15",
          responsible: "HR Department",
        },
        {
          step: "Update expense approval workflow with compliance checkpoints",
          status: "in_progress",
          dueDate: "2026-01-31",
          responsible: "Finance Department",
        },
      ],
      estimatedCost: 450000,
      actualCost: 125000,
      metrics: {
        trainingCompletionRate: 67,
        policyUpdateProgress: 40,
        controlsImplemented: 3,
        controlsPlanned: 8,
      },
    },
    {
      caseId: insertedCases[1].id,
      title: "Antitrust Compliance Overhaul",
      violationType: "antitrust",
      description: "Emergency remediation following price-fixing investigation. Includes competitor interaction controls and training.",
      status: "in_progress",
      priority: "critical",
      targetCompletionDate: new Date("2026-02-28"),
      assignedTo: userId,
      createdBy: userId,
      remediationSteps: [
        {
          step: "Mandatory antitrust training for all sales staff",
          status: "in_progress",
          dueDate: "2026-01-10",
          responsible: "Sales VP",
        },
        {
          step: "Implement competitor communication approval process",
          status: "pending",
          dueDate: "2026-01-31",
          responsible: "Legal Department",
        },
        {
          step: "Conduct forensic review of pricing decisions (2023-2025)",
          status: "in_progress",
          dueDate: "2025-12-31",
          responsible: "External Counsel",
        },
      ],
      estimatedCost: 850000,
      actualCost: 320000,
      metrics: {
        trainingCompletionRate: 45,
        policyUpdateProgress: 60,
        controlsImplemented: 2,
        controlsPlanned: 5,
      },
    },
  ];

  for (const plan of remediationPlansData) {
    await db.insert(remediationPlans).values(plan).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${remediationPlansData.length} remediation plans`);

  // ===========================================
  // 7. REGULATORY STRATEGIES
  // ===========================================
  console.log("\n📋 Seeding Regulatory Strategies...");

  const strategiesData = [
    {
      title: "DOJ Voluntary Self-Disclosure Strategy - FCPA",
      regulatoryBody: "Department of Justice",
      framework: "FCPA",
      description: "Strategic plan for voluntary self-disclosure of FCPA violations under DOJ FCPA Corporate Enforcement Policy to maximize credit and minimize penalties",
      status: "active",
      priority: "critical",
      disclosureRecommendation: "recommend",
      estimatedPenaltyRange: "$2M - $8M (with cooperation credit)",
      mitigatingFactors: [
        "Voluntary self-disclosure within months of discovery",
        "Full cooperation with investigation",
        "Disgorgement of profits from tainted contract",
        "Termination of involved employees",
        "Enhanced compliance program implementation",
      ],
      timeline: [
        {
          phase: "Internal Investigation",
          duration: "60 days",
          status: "in_progress",
        },
        {
          phase: "Self-Disclosure to DOJ",
          duration: "14 days",
          status: "pending",
        },
        {
          phase: "DOJ Investigation & Cooperation",
          duration: "12-18 months",
          status: "pending",
        },
        {
          phase: "Resolution (DPA/NPA/Declination)",
          duration: "3-6 months",
          status: "pending",
        },
      ],
      assignedTo: userId,
      createdBy: userId,
    },
    {
      title: "SEC Cooperation Strategy - SOX Violations",
      regulatoryBody: "Securities and Exchange Commission",
      framework: "SOX",
      description: "Proactive engagement strategy with SEC following discovery of revenue recognition irregularities. Focus on cooperation credit under SEC Cooperation Program.",
      status: "draft",
      priority: "high",
      disclosureRecommendation: "evaluate",
      estimatedPenaltyRange: "$500K - $3M (individual penalties possible)",
      mitigatingFactors: [
        "Controller self-reported concerns internally",
        "No material misstatement in filed financials (yet)",
        "Immediate cessation of improper practice",
        "Enhanced internal controls implementation",
      ],
      timeline: [
        {
          phase: "Financial Forensics Review",
          duration: "45 days",
          status: "in_progress",
        },
        {
          phase: "Board Audit Committee Briefing",
          duration: "7 days",
          status: "pending",
        },
        {
          phase: "SEC Engagement Decision",
          duration: "30 days",
          status: "pending",
        },
      ],
      assignedTo: userId,
      createdBy: userId,
    },
  ];

  for (const strategy of strategiesData) {
    await db.insert(regulatoryStrategies).values(strategy).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${strategiesData.length} regulatory strategies`);

  // ===========================================
  // 8. DISCLOSURE PLAYBOOKS
  // ===========================================
  console.log("\n📖 Seeding Disclosure Playbooks...");

  const playbooksData = [
    {
      title: "DOJ FCPA Voluntary Self-Disclosure Playbook",
      regulatoryBody: "Department of Justice",
      violationType: "fcpa",
      description: "Step-by-step playbook for voluntary self-disclosure under DOJ FCPA Corporate Enforcement Policy",
      status: "active",
      steps: [
        {
          stepNumber: 1,
          title: "Conduct Privileged Internal Investigation",
          description: "Retain outside counsel to conduct investigation under attorney-client privilege and work product protection",
          responsible: "General Counsel",
          estimatedDuration: "45-60 days",
          keyActions: [
            "Engage experienced FCPA counsel",
            "Preserve all relevant documents (legal hold)",
            "Interview key witnesses",
            "Analyze financial records and payments",
            "Determine scope and impact of violations",
          ],
        },
        {
          stepNumber: 2,
          title: "Board & Audit Committee Notification",
          description: "Brief board and audit committee on findings and disclosure recommendation",
          responsible: "External Counsel + General Counsel",
          estimatedDuration: "7-14 days",
          keyActions: [
            "Prepare board presentation on investigation findings",
            "Discuss disclosure options and timing",
            "Obtain board authorization for self-disclosure",
          ],
        },
        {
          stepNumber: 3,
          title: "Make Voluntary Self-Disclosure to DOJ",
          description: "Contact DOJ Fraud Section to make voluntary disclosure within months of discovery",
          responsible: "External FCPA Counsel",
          estimatedDuration: "14-21 days",
          keyActions: [
            "Prepare disclosure letter with investigation summary",
            "Identify DOJ contacts (Fraud Section + relevant USAO)",
            "Schedule disclosure meeting",
            "Present investigation findings",
            "Commit to full cooperation",
          ],
        },
      ],
      createdBy: userId,
      lastReviewedBy: userId,
      lastReviewedAt: new Date(),
    },
    {
      title: "Antitrust Leniency Application Playbook",
      regulatoryBody: "Department of Justice",
      violationType: "antitrust",
      description: "Procedures for DOJ Antitrust Division Leniency Program application (first-in immunity)",
      status: "active",
      steps: [
        {
          stepNumber: 1,
          title: "Assess Leniency Eligibility",
          description: "Determine if company qualifies for amnesty under Corporate Leniency Policy",
          responsible: "Antitrust Counsel",
          estimatedDuration: "7-10 days",
          keyActions: [
            "Confirm no existing DOJ investigation (critical for Type A leniency)",
            "Verify company can provide evidence of antitrust violation",
            "Ensure company will cooperate fully and continuously",
            "Determine if company coerced others to participate",
          ],
        },
        {
          stepNumber: 2,
          title: "Marker Request",
          description: "Contact DOJ to obtain marker protecting place in line",
          responsible: "External Antitrust Counsel",
          estimatedDuration: "1-2 days",
          keyActions: [
            "Contact DOJ Antitrust Division",
            "Provide basic violation information to secure marker",
            "Negotiate marker deadline (typically 30 days)",
          ],
        },
        {
          stepNumber: 3,
          title: "Perfect the Marker",
          description: "Conduct investigation and provide complete disclosure within marker period",
          responsible: "External Counsel + Company",
          estimatedDuration: "30 days",
          keyActions: [
            "Complete internal investigation",
            "Compile all relevant evidence",
            "Prepare comprehensive disclosure",
            "Submit to DOJ before marker deadline",
          ],
        },
      ],
      createdBy: userId,
      lastReviewedBy: userId,
      lastReviewedAt: new Date(),
    },
  ];

  for (const playbook of playbooksData) {
    await db.insert(disclosurePlaybooks).values(playbook).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${playbooksData.length} disclosure playbooks`);

  // ===========================================
  // 9. BOARD REPORTS
  // ===========================================
  console.log("\n📊 Seeding Board Reports...");

  const boardReportsData = [
    {
      title: "Q4 2025 Compliance Risk Report",
      reportingPeriod: "Q4 2025",
      reportDate: new Date("2025-12-15"),
      status: "published",
      executiveSummary: "This quarter identified three critical compliance investigations (2 FCPA, 1 Antitrust) requiring immediate board attention. Enhanced monitoring detected violations early, minimizing potential exposure. Remediation plans in progress.",
      keyFindings: [
        "FCPA violation detected in Singapore operations - potential $2-8M exposure",
        "Antitrust price-fixing scheme discovered - self-disclosure recommended",
        "SOX revenue recognition concerns raised by Controller - under review",
        "93% completion rate on mandatory compliance training",
        "Legal hold compliance at 100% for all active investigations",
      ],
      recommendations: [
        "Authorize voluntary self-disclosure to DOJ for FCPA violation",
        "Approve $1.2M budget for antitrust remediation program",
        "Enhance third-party due diligence procedures (estimated $450K investment)",
        "Consider special audit committee meeting for SOX matter review",
      ],
      metrics: {
        totalInvestigations: 3,
        criticalIssues: 2,
        highIssues: 1,
        completedTraining: 847,
        totalEmployees: 912,
        estimatedExposure: "$10M - $15M",
        remediationCosts: "$1.7M",
      },
      createdBy: userId,
      approvedBy: userId,
      approvedAt: new Date(),
    },
  ];

  for (const report of boardReportsData) {
    await db.insert(boardReports).values(report).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${boardReportsData.length} board reports`);

  // ===========================================
  // 10. INTERVIEWS
  // ===========================================
  console.log("\n🎤 Seeding Interviews...");

  const interviewsData = [
    {
      caseId: insertedCases[0].id,
      intervieweeName: "Sarah Chen",
      intervieweeTitle: "VP Business Development",
      interviewerName: "External Counsel",
      scheduledFor: new Date("2025-11-05T14:00:00Z"),
      status: "completed",
      location: "Conference Room A (Attorney-Client Privileged)",
      notes: "Interviewee confirmed meeting with Minister Lee's assistant. Stated she believed 'consulting fee' was standard business practice in region. Unaware of FCPA implications. Cooperative witness.",
      recordingPath: null,
      transcriptPath: null,
      createdBy: userId,
    },
    {
      caseId: insertedCases[1].id,
      intervieweeName: "Michael Roberts",
      intervieweeTitle: "Sales Director",
      scheduledFor: new Date("2025-11-08T10:00:00Z"),
      status: "scheduled",
      location: "Virtual - Microsoft Teams",
      notes: null,
      recordingPath: null,
      transcriptPath: null,
      createdBy: userId,
    },
  ];

  for (const interview of interviewsData) {
    await db.insert(interviews).values(interview).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${interviewsData.length} interviews`);

  // ===========================================
  // 11. PRODUCTION SETS (eDiscovery)
  // ===========================================
  console.log("\n📦 Seeding Production Sets...");

  const productionSetsData = [
    {
      caseId: insertedCases[0].id,
      productionName: "FCPA Singapore Production 001",
      description: "Initial production to DOJ - emails and communications related to Singapore contract and payments to Lee Consulting Services",
      status: "in_progress",
      batesPrefix: "CORP-FCPA-SG",
      batesStart: 1,
      batesEnd: 437,
      format: "PDF",
      privilege: "Privilege log included - 23 documents withheld",
      createdBy: userId,
    },
  ];

  for (const prodSet of productionSetsData) {
    await db.insert(productionSets).values(prodSet).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${productionSetsData.length} production sets`);

  // ===========================================
  // 12. POLICIES & TRAINING
  // ===========================================
  console.log("\n📚 Seeding Policies & Training...");

  const policiesData = [
    {
      title: "Anti-Corruption & FCPA Policy",
      category: "compliance",
      status: "active",
      effectiveDate: new Date("2025-01-01"),
      content: "GlobalCorp strictly prohibits bribery and corruption in all forms. No employee may offer, promise, or provide anything of value to government officials or private parties to obtain improper business advantages. All third-party intermediaries must undergo due diligence screening.",
      version: "3.0",
      approvedBy: userId,
      owner: userId,
    },
    {
      title: "Antitrust Compliance Policy",
      category: "compliance",
      status: "active",
      effectiveDate: new Date("2025-01-01"),
      content: "Employees must never discuss pricing, costs, market allocation, or competitive strategy with competitors. All competitor interactions must be pre-approved by Legal. Violations may result in termination and criminal prosecution.",
      version: "2.1",
      approvedBy: userId,
      owner: userId,
    },
  ];

  for (const policy of policiesData) {
    await db.insert(policies).values(policy).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${policiesData.length} policies`);

  // ===========================================
  // 13. WHISTLEBLOWER REPORTS
  // ===========================================
  console.log("\n📢 Seeding Whistleblower Reports...");

  const whistleblowerData = [
    {
      reportNumber: "HTL-2025-0001",
      isAnonymous: "true",
      intakeChannel: "web",
      incidentCategory: "fraud",
      incidentSubcategory: "Revenue Recognition Manipulation",
      incidentDescription: "CFO is pressuring accounting team to recognize revenue early to meet quarterly targets. Controller raised concerns but was told to 'make it work.' This appears to violate SOX accounting controls and revenue recognition principles.",
      incidentDate: new Date("2025-09-28"),
      incidentLocation: "Finance Department, Corporate HQ",
      severity: "high",
      priority: "high",
      status: "under_investigation",
      requiresConfidentiality: "true",
      requiresWhistleblowerProtection: "true",
      protectionType: "sox_806",
      assignedTo: userId,
      intakeDate: new Date("2025-10-25T18:30:00Z"),
      caseId: insertedCases[2].id,
    },
    {
      reportNumber: "HTL-2025-0002",
      isAnonymous: "true",
      intakeChannel: "phone",
      incidentCategory: "harassment",
      incidentDescription: "Senior manager has been making unwelcome advances and creating hostile work environment. Multiple witnesses. Fear of retaliation prevents victims from coming forward.",
      incidentDate: new Date("2025-10-01"),
      incidentLocation: "Sales Department",
      severity: "critical",
      priority: "urgent",
      status: "triage",
      requiresConfidentiality: "true",
      requiresWhistleblowerProtection: "true",
      intakeDate: new Date("2025-10-28T09:15:00Z"),
    },
  ];

  for (const report of whistleblowerData) {
    await db.insert(hotlineReports).values(report).onConflictDoNothing();
  }
  console.log(`✓ Seeded ${whistleblowerData.length} whistleblower reports`);

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log("\n✅ DEMO DATA SEEDING COMPLETE!");
  console.log("=====================================");
  console.log(`📧 Communications: ${insertedComms.length}`);
  console.log(`🚨 Alerts: ${insertedAlerts.length}`);
  console.log(`📁 Cases: ${insertedCases.length}`);
  console.log(`📚 Regulations: ${regulationsData.length}`);
  console.log(`⚖️  Privilege Logs: ${privilegeLogsData.length}`);
  console.log(`🔧 Remediation Plans: ${remediationPlansData.length}`);
  console.log(`📋 Regulatory Strategies: ${strategiesData.length}`);
  console.log(`📖 Disclosure Playbooks: ${playbooksData.length}`);
  console.log(`📊 Board Reports: ${boardReportsData.length}`);
  console.log(`🎤 Interviews: ${interviewsData.length}`);
  console.log(`📦 Production Sets: ${productionSetsData.length}`);
  console.log(`📚 Policies: ${policiesData.length}`);
  console.log(`📢 Whistleblower Reports: ${whistleblowerData.length}`);
  console.log("=====================================");
  console.log("🎉 All sections populated with demo data!");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllDemoData()
    .then(() => {
      console.log("\n✅ Demo data seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Demo data seeding failed:", error);
      process.exit(1);
    });
}
