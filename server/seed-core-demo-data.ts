import { db } from "./db";
import {
  users,
  communications,
  alerts,
  cases,
  regulations,
} from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Core Demo Data Seeder - Seeds essential data for all main sections
 * Focuses on communications, alerts, and cases which are the core features
 */

export async function seedCoreDemoData() {
  console.log("🌱 Seeding core demo data...");

  // Get demo admin user
  const adminUser = await db
    .select()
    .from(users)
    .where(sql`email = 'demo.admin@sentinelcounsel.com'`)
    .limit(1)
    .then((rows) => rows[0]);

  if (!adminUser) {
    console.log("⚠️  No demo admin user found. Please create demo users first.");
    return;
  }

  const userId = adminUser.id;

  // Clean existing demo data
  console.log("\n🧹 Cleaning up existing demo data...");
  try {
    await db.execute(sql`
      DELETE FROM cases WHERE case_number LIKE 'CASE-2025-%';
    `);
    await db.execute(sql`
      DELETE FROM alerts WHERE created_at > NOW() - INTERVAL '2 days';
    `);
    await db.execute(sql`
      DELETE FROM communications WHERE sender LIKE '%@globalcorp.com' OR sender LIKE '%@techcorp.com';
    `);
    console.log("✓ Cleanup complete");
  } catch (error) {
    console.log("⚠️  Cleanup errors (OK for first run)");
  }

  // Seed communications (raw SQL to avoid schema drift issues)
  console.log("\n📧 Seeding Communications...");
  
  const commsData = [
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

  // Seed alerts
  console.log("\n🚨 Seeding Alerts...");
  
  const alertsData = [
    {
      communicationId: insertedComms[0].id,
      violationType: "fcpa",
      severity: "critical",
      status: "under_review",
      riskScore: 95,
      flaggedKeywords: ["consulting fee", "expedite", "off the radar", "market research services"],
      aiAnalysis: "HIGH RISK: Email discusses routing payment through third-party intermediary to foreign official's relative. Classic FCPA red flags: unusual payment structure, expedited approval, concealment language ('keep it off radar'), false invoicing ('market research'). Recommend immediate legal hold and investigation.",
      escalationReason: "Potential FCPA violation - payment to foreign official through intermediary",
      assignedTo: userId,
    },
    {
      communicationId: insertedComms[2].id,
      violationType: "antitrust",
      severity: "critical",
      status: "escalated",
      riskScore: 92,
      flaggedKeywords: ["match our increase", "stay out of territory", "pricing strategy"],
      aiAnalysis: "CRITICAL: SMS discusses price coordination and market allocation with competitor. Clear Sherman Act Section 1 violation. Competitors agreeing to match price increases and divide territories is per se illegal. Immediate investigation required.",
      escalationReason: "Antitrust violation - horizontal price fixing and market allocation",
      assignedTo: userId,
    },
    {
      communicationId: insertedComms[4].id,
      violationType: "sox",
      severity: "high",
      status: "new",
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
  console.log(`✓ Seeded ${insertedAlerts.length} alerts`);

  // Seed cases
  console.log("\n📁 Seeding Cases...");
  
  const casesData = [
    {
      caseNumber: "CASE-2025-0001",
      alertId: insertedAlerts[0]?.id,
      title: "FCPA Investigation: Singapore Infrastructure Bribery",
      description: "Investigation into potential FCPA violations involving payments to Singapore government officials through Malaysian intermediary for contract facilitation",
      status: "investigation",
      violationType: "fcpa",
      priority: "critical",
      employeeName: "Sarah Chen",
      employeePosition: "VP Business Development",
      createdBy: userId,
      assignedTo: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "pending",
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged",
      privilegeBasis: "counsel_directed_investigation",
      riskScore: 95,
      riskLevel: "critical",
      aiAnalysisSummary: "High-risk FCPA violation involving classic bribery red flags: third-party intermediary related to foreign official, expedited approval, concealment tactics, false invoicing. Potential penalties: $2M+ fines, criminal prosecution.",
    },
    {
      caseNumber: "CASE-2025-0002",
      alertId: insertedAlerts[1]?.id,
      title: "Antitrust Investigation: Price Fixing Cartel",
      description: "Investigation into horizontal price fixing and market allocation agreements with competitors Acme Corp and Widget Industries",
      status: "investigation",
      violationType: "antitrust",
      priority: "critical",
      employeeName: "Michael Roberts",
      employeePosition: "Sales Director",
      createdBy: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "in_review",
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged",
      privilegeBasis: "counsel_directed_investigation",
      riskScore: 92,
      riskLevel: "critical",
      aiAnalysisSummary: "Sherman Act Section 1 per se violation. Competitors coordinating price increases and dividing geographic territories. Potential treble damages, criminal prosecution, individual jail time. Recommend immediate self-disclosure to DOJ.",
    },
    {
      caseNumber: "CASE-2025-0003",
      alertId: insertedAlerts[2]?.id,
      title: "SOX Investigation: Revenue Recognition Manipulation",
      description: "Investigation into improper revenue recognition practices directed by CFO to meet quarterly earnings targets",
      status: "alert",
      violationType: "sox",
      priority: "high",
      employeeName: "Jennifer Martinez",
      employeePosition: "Controller",
      createdBy: userId,
      attorneyReviewRequired: "true",
      attorneyReviewStatus: "pending",
      isCounselDirected: "true",
      privilegeStatus: "attorney_client_privileged",
      privilegeBasis: "counsel_directed_investigation",
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
      // Fetch existing
      const existing = await db.select().from(cases).where(sql`case_number = ${caseData.caseNumber}`).limit(1);
      if (existing.length > 0) {
        insertedCases.push(existing[0]);
      }
    }
  }
  console.log(`✓ Seeded ${insertedCases.length} cases`);

  // Summary
  console.log("\n✅ CORE DEMO DATA SEEDING COMPLETE!");
  console.log("=====================================");
  console.log(`📧 Communications: ${insertedComms.length}`);
  console.log(`🚨 Alerts: ${insertedAlerts.length}`);
  console.log(`📁 Cases: ${insertedCases.length}`);
  console.log("=====================================");
  console.log("\n🎉 Demo data ready! Log in to see:");
  console.log("  • Communications section: 6 flagged emails/SMS");
  console.log("  • Alerts section: 3 high-risk compliance alerts");
  console.log("  • Cases section: 3 active investigations (FCPA, Antitrust, SOX)");
  console.log("\nUse demo accounts:");
  console.log("  - demo.admin@sentinelcounsel.com (Admin)");
  console.log("  - demo.officer@sentinelcounsel.com (Compliance Officer)");
  console.log("  - demo.attorney@sentinelcounsel.com (Attorney)");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCoreDemoData()
    .then(() => {
      console.log("\n✅ Core demo data seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Core demo data seeding failed:", error);
      process.exit(1);
    });
}
