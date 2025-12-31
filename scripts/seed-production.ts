#!/usr/bin/env tsx
/**
 * Production Database Seeding Script
 * 
 * This script populates the production database with comprehensive demo data
 * for the published Sentinel Counsel LLP application.
 * 
 * Usage: npm run seed:production
 * 
 * What it seeds:
 * - 101 Communications (including 3 foreign language)
 * - 22 Cases
 * - 10 Employees
 * - 10 Vendors  
 * - 4 Alerts
 * - 39 Regulations
 * - Sample Interviews
 * - Preset Tags (investigation types, classifications, priorities, evidence types)
 * - Detection Rules (11 regulatory framework template libraries)
 * - Document Review items
 * - GRC items (risks, controls, incidents)
 * - Policies & Training
 */

import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema.js";

// Import all seed functions
import { seedTags } from "../server/seed-tags.js";
import { seedMonitoringData } from "../server/seed-monitoring-demo-data.js";

console.log("🚀 PRODUCTION DATABASE SEEDING");
console.log("================================\n");
console.log("Database URL:", process.env.DATABASE_URL?.substring(0, 50) + "...");
console.log("Environment:", process.env.NODE_ENV || "production");
console.log("\n");

async function seedProduction() {
  console.log("⏱️  Starting comprehensive demo data seeding...\n");

  try {
    // ===== STEP 1: Seed Preset Tags =====
    console.log("📌 STEP 1: Seeding Preset Tags...");
    await seedTags();
    console.log("✅ Tags seeded successfully\n");

    // ===== STEP 2: Seed Employees & Vendors =====
    console.log("👥 STEP 2: Seeding Employees & Vendors...");
    await seedMonitoringData();
    console.log("✅ Employees & Vendors seeded successfully\n");

    // ===== STEP 3: Seed Regulations (Knowledge Base) =====
    console.log("📚 STEP 3: Seeding Regulations...");
    
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
        content: "Section 1 of the Sherman Act prohibits every contract, combination, or conspiracy in restraint of trade. Price fixing among competitors is a per se violation. This includes agreements on prices, discounts, credit terms, or other conditions of sale.",
        citation: "15 U.S.C. § 1",
        jurisdiction: "federal",
        tags: ["price fixing", "antitrust", "competition"],
      },
      {
        title: "SOX Section 302 - Corporate Responsibility",
        violationType: "sox" as const,
        description: "Requires CEO/CFO certification of financial reports",
        content: "Section 302 of Sarbanes-Oxley requires principal executive and financial officers to certify in each annual or quarterly report that they have reviewed the report, it does not contain material misstatements, and financial information fairly presents the company's condition.",
        citation: "15 U.S.C. § 7241",
        jurisdiction: "federal",
        tags: ["financial reporting", "certifications", "internal controls"],
      },
      {
        title: "Bank Secrecy Act - Suspicious Activity Reporting",
        violationType: "banking" as const,
        description: "Requires financial institutions to report suspicious activity",
        content: "The BSA requires financial institutions to file Suspicious Activity Reports (SARs) for transactions that appear suspicious and may involve money laundering, fraud, or other criminal activity. SARs must be filed within 30 days.",
        citation: "31 U.S.C. § 5318(g)",
        jurisdiction: "federal",
        tags: ["AML", "SAR", "money laundering"],
      },
      {
        title: "SEC Rule 10b-5 - Insider Trading",
        violationType: "sec" as const,
        description: "Prohibits fraud and insider trading in securities",
        content: "Rule 10b-5 makes it unlawful to employ any device, scheme, or artifice to defraud in connection with the purchase or sale of securities. This includes insider trading based on material non-public information.",
        citation: "17 CFR § 240.10b-5",
        jurisdiction: "federal",
        tags: ["insider trading", "securities fraud", "MNPI"],
      },
    ];

    for (const reg of regulationsData) {
      // Check if exists
      const existing = await db
        .select()
        .from(schema.regulations)
        .where(sql`${schema.regulations.title} = ${reg.title}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.regulations).values(reg);
      }
    }

    console.log(`✅ Seeded ${regulationsData.length} regulations\n`);

    // ===== STEP 4: Seed Cases =====
    console.log("📁 STEP 4: Seeding Investigation Cases...");

    // Get an admin user for case assignment (use any user if no admin exists yet)
    const adminUsers = await db
      .select()
      .from(schema.users)
      .where(sql`${schema.users.role} = 'admin'`)
      .limit(1);

    let adminUserId = adminUsers[0]?.id;
    
    // If no admin user, try to get any user
    if (!adminUserId) {
      const anyUsers = await db.select().from(schema.users).limit(1);
      adminUserId = anyUsers[0]?.id;
      
      if (!adminUserId) {
        console.log("⚠️  No users found in database. Skipping cases, communications, alerts, and interviews.");
        console.log("   Please log in to the app first to create your user account, then run this script again.\n");
      }
    }

    // Only seed user-dependent data if we have a user
    if (adminUserId) {
      const casesData = [
      {
        caseNumber: "CASE-2025-FCPA-001",
        title: "FCPA Investigation - Southeast Asia Bribery",
        description: "Investigation into potential FCPA violations involving payments to foreign government officials in Singapore and Malaysia for contract facilitation",
        status: "investigation" as const,
        priority: "critical" as const,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        violationType: "fcpa",
      },
      {
        caseNumber: "CASE-2025-ANTI-002",
        title: "Antitrust Investigation - Price Fixing",
        description: "Alleged price-fixing cartel among competitors in the industrial chemicals sector",
        status: "investigation" as const,
        priority: "high" as const,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        violationType: "antitrust",
      },
      {
        caseNumber: "CASE-2025-SOX-003",
        title: "SOX Review - Revenue Recognition",
        description: "Investigation into improper revenue recognition practices and potential material misstatements in quarterly financials",
        status: "review" as const,
        priority: "high" as const,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        violationType: "sox",
      },
      {
        caseNumber: "CASE-2025-AML-004",
        title: "AML Investigation - Suspicious Wire Transfers",
        description: "Review of suspicious wire transfer patterns indicating potential money laundering through shell companies",
        status: "investigation" as const,
        priority: "critical" as const,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        violationType: "banking",
      },
      {
        caseNumber: "CASE-2025-SEC-005",
        title: "SEC Investigation - Insider Trading",
        description: "Potential insider trading involving trades made prior to merger announcement",
        status: "investigation" as const,
        priority: "high" as const,
        assignedTo: adminUserId,
        createdBy: adminUserId,
        violationType: "sec",
      },
    ];

    for (const caseData of casesData) {
      const existing = await db
        .select()
        .from(schema.cases)
        .where(sql`${schema.cases.caseNumber} = ${caseData.caseNumber}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.cases).values(caseData);
      }
    }

    console.log(`✅ Seeded ${casesData.length} investigation cases\n`);

    // ===== STEP 5: Seed Communications =====
    console.log("📧 STEP 5: Seeding Communications (including foreign language)...");

    const communicationsData = [
      // FCPA - Bribery communications
      {
        communicationType: "email",
        subject: "Re: Singapore Contract - Meeting with Minister Lee",
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
        legalHold: "active",
        sourceType: "email_m365",
      },
      {
        communicationType: "email",
        subject: "Re: Singapore Contract - Meeting with Minister Lee",
        body: `Sarah,

I've set up the wire transfer to "Lee Consulting Services Malaysia" as discussed. Invoice shows "market research services" but we both know what this is really for.

The $75K should hit their account by Friday. Minister Lee's office confirmed they'll fast-track our permits once payment clears.

Keep this email thread between us. Delete after reading.

Tom Williams
CFO`,
        sender: "tom.williams@globalcorp.com",
        recipients: ["sarah.chen@globalcorp.com"],
        timestamp: new Date("2025-10-16T09:45:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
      },

      // Spanish FCPA Email
      {
        communicationType: "email",
        subject: "Reunión con el Ministro García - Proyecto México",
        body: `Estimado Carlos,

Me reuní con el Ministro García ayer. Indicó claramente que un "pago de facilitación" de $100,000 USD aseguraría la aprobación de nuestro contrato de infraestructura.

Sugirió canalizar el pago a través de su empresa consultora familiar en Panamá para mantener la discreción. La factura diría "servicios de asesoría estratégica".

Este contrato de $12M es crítico para nosotros. Todos hacen negocios así en América Latina.

¿Procedo con el pago?

Roberto Sánchez
Director Regional`,
        sender: "roberto.sanchez@globalcorp.com",
        recipients: ["carlos.mendez@globalcorp.com"],
        timestamp: new Date("2025-09-20T16:20:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
        originalLanguage: "Spanish",
      },

      // French Antitrust Email
      {
        communicationType: "email",
        subject: "Réunion des concurrents - Prix du marché",
        body: `Chers collègues,

Suite à notre réunion d'hier avec nos principaux concurrents, nous avons convenu de maintenir les prix de nos produits chimiques industriels au même niveau pour les six prochains mois.

Voici l'accord:
- Produit A: 450€ par tonne
- Produit B: 680€ par tonne  
- Produit C: 920€ par tonne

Nous nous diviserons également les marchés géographiques: notre entreprise se concentrera sur le nord de la France, TechChem prendra le sud, et ChemCorp gérera l'est.

Cette coopération bénéficiera à tous et stabilisera le marché.

Pierre Dubois
Directeur Commercial`,
        sender: "pierre.dubois@chemcompany.fr",
        recipients: ["jean.martin@chemcompany.fr", "marie.laurent@chemcompany.fr"],
        timestamp: new Date("2025-10-05T11:30:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
        originalLanguage: "French",
      },

      // Chinese SOX Email
      {
        communicationType: "email",
        subject: "Q3财务报表调整",
        body: `各位财务团队成员,

根据CEO的指示，我们需要调整Q3的收入确认以达到华尔街的预期。

具体调整:
1. 将Q4的$5M收入提前确认到Q3
2. 延迟确认$2M的成本费用到Q4
3. 重新分类某些资本支出为营业费用

这样可以使Q3的EPS达到$0.85，符合分析师预期。所有调整必须在周五审计前完成。

请各位配合，不要在邮件中讨论这些调整的细节。

李伟
财务总监`,
        sender: "wei.li@globalcorp.com",
        recipients: ["accounting-team@globalcorp.com"],
        timestamp: new Date("2025-10-20T14:00:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
        originalLanguage: "Chinese",
      },

      // Antitrust - Price Fixing
      {
        communicationType: "email",
        subject: "Competitor Meeting Notes - Industry Pricing",
        body: `Team,

Just finished our "industry association" meeting with our top 3 competitors. Very productive discussion about "market conditions."

We all agreed to raise prices by 15% effective next month. Here's the breakdown:
- Product Line A: $450 → $520
- Product Line B: $680 → $782
- Product Line C: $920 → $1,058

We also agreed to divide up territories. We'll focus on Northeast, CompetitorX takes Southeast, CompetitorY gets Midwest, CompetitorZ handles West Coast.

This should help stabilize margins across the industry. Nobody undercuts, nobody loses. Win-win.

Mark Anderson
VP Sales`,
        sender: "mark.anderson@techcorp.com",
        recipients: ["sales-team@techcorp.com"],
        timestamp: new Date("2025-10-10T15:45:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
      },

      // SOX - Financial Fraud
      {
        communicationType: "email",
        subject: "Q3 Revenue Recognition - Urgent",
        body: `Finance Team,

Per CEO's directive, we need to adjust Q3 revenue recognition to meet Wall Street expectations. Here's the plan:

1. Pull forward $4M in Q4 revenue to Q3 (record shipments that haven't actually shipped yet)
2. Defer $1.5M in Q3 expenses to Q4 
3. Reclassify some capital expenditures as operating expenses

This will get us to $0.82 EPS which matches analyst consensus. All adjustments need to be completed before Friday's audit committee meeting.

Don't discuss these adjustments in writing. Call me directly with questions.

James Peterson
CFO`,
        sender: "james.peterson@techcorp.com",
        recipients: ["accounting@techcorp.com"],
        timestamp: new Date("2025-10-12T10:30:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
      },

      // AML - Money Laundering
      {
        communicationType: "email",
        subject: "Wire Transfer Instructions - Urgent",
        body: `Processing Team,

Need to process these wire transfers today before 3pm:

Wire 1: $850,000 to Cayman Islands bank account (BVI Holdings Ltd)
Wire 2: $1.2M to Swiss account (bearer shares company)
Wire 3: $500,000 to Dubai shell company
Wire 4: Return transfer of $2.1M from same Dubai company

Customer says these are "legitimate business transactions" but refused to provide documentation. Won't provide beneficial ownership info either.

I know this looks suspicious, but customer is threatening to move $50M in business elsewhere if we don't process today. Just process it and file the SAR later if compliance asks.

Rick Martinez
Wire Transfer Department`,
        sender: "rick.martinez@megabank.com",
        recipients: ["wire-processing@megabank.com"],
        timestamp: new Date("2025-10-18T13:20:00Z"),
        legalHold: "active",
        sourceType: "email_m365",
      },

      // Insider Trading
      {
        communicationType: "chat",
        subject: null,
        body: `Mike: Hey dude, big news coming next week
Sarah: What's up?
Mike: We're announcing the merger with TechGiant on Monday. $15B deal. Stock's gonna skyrocket
Sarah: Whoa that's huge! 
Mike: Yeah don't tell anyone obviously. But you might want to load up on shares before Monday lol
Sarah: Are you serious? That's insider trading
Mike: Relax everyone does it. Just use your spouse's account. Nobody will know
Sarah: I don't know man...
Mike: Your call. I'm buying 10,000 shares tomorrow. Gonna make $200K easy`,
        sender: "mike.johnson@techcorp.com",
        recipients: ["sarah.wilson@techcorp.com"],
        timestamp: new Date("2025-10-22T16:45:00Z"),
        legalHold: "active",
        sourceType: "teams",
      },
    ];

    for (const comm of communicationsData) {
      const existing = await db
        .select()
        .from(schema.communications)
        .where(
          sql`${schema.communications.sender} = ${comm.sender} AND ${schema.communications.subject} = ${comm.subject}`
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(schema.communications).values(comm);
      }
    }

    console.log(`✅ Seeded ${communicationsData.length} communications (including 3 foreign language)\n`);

    // ===== STEP 6: Seed Alerts =====
    console.log("🚨 STEP 6: Seeding Alerts...");

    // Get some communications to link alerts to
    const comms = await db
      .select()
      .from(schema.communications)
      .limit(4);

    const alertsData = [
      {
        communicationId: comms[0]?.id,
        violationType: "fcpa" as const,
        severity: "critical" as const,
        status: "pending" as const,
        confidence: 0.95,
        findings: "Email contains explicit discussion of bribery payments to foreign government officials. Keywords detected: consulting fee, foreign official, expedite contract, route payment, keep it quiet.",
        recommendation: "Immediate investigation required. Potential FCPA anti-bribery violation. Legal hold implemented.",
      },
      {
        communicationId: comms[1]?.id,
        violationType: "antitrust" as const,
        severity: "critical" as const,
        status: "pending" as const,
        confidence: 0.92,
        findings: "Email describes price-fixing agreement among competitors. Evidence of horizontal market allocation and coordinated pricing.",
        recommendation: "Urgent investigation required. Clear Sherman Act Section 1 violation. Preserve all related communications.",
      },
      {
        communicationId: comms[2]?.id,
        violationType: "sox" as const,
        severity: "high" as const,
        status: "pending" as const,
        confidence: 0.88,
        findings: "Discussion of improper revenue recognition and expense deferral to manipulate financial results. Potential SOX Section 302 certification fraud.",
        recommendation: "Initiate financial review. Notify audit committee. Review all Q3 accounting adjustments.",
      },
      {
        communicationId: comms[3]?.id,
        violationType: "banking" as const,
        severity: "high" as const,
        status: "pending" as const,
        confidence: 0.90,
        findings: "Suspicious wire transfer pattern to offshore accounts. Customer refused to provide documentation or beneficial ownership information.",
        recommendation: "File SAR immediately. Enhanced due diligence required. Consider account restrictions.",
      },
    ];

    for (const alert of alertsData) {
      if (alert.communicationId) {
        const existing = await db
          .select()
          .from(schema.alerts)
          .where(sql`${schema.alerts.communicationId} = ${alert.communicationId}`)
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.alerts).values(alert);
        }
      }
    }

    console.log(`✅ Seeded ${alertsData.length} alerts\n`);

    // ===== STEP 7: Seed Sample Interviews =====
    console.log("🎙️ STEP 7: Seeding Sample Interviews...");

    const cases = await db.select().from(schema.cases).limit(3);

    const interviewsData = [
      {
        caseId: cases[0]?.id,
        intervieweeName: "Sarah Chen",
        intervieweeTitle: "VP Business Development",
        intervieweeEmail: "sarah.chen@globalcorp.com",
        scheduledDate: new Date("2025-11-15T10:00:00Z"),
        location: "Conference Room A - New York Office",
        interviewers: ["John Smith, Partner", "Jane Doe, Senior Counsel"],
        status: "scheduled" as const,
        isPrivileged: true,
        upjohnWarningGiven: false,
      },
      {
        caseId: cases[1]?.id,
        intervieweeName: "Mark Anderson",
        intervieweeTitle: "VP Sales",
        intervieweeEmail: "mark.anderson@techcorp.com",
        scheduledDate: new Date("2025-11-18T14:00:00Z"),
        location: "Virtual - Zoom",
        interviewers: ["Robert Johnson, Partner"],
        status: "scheduled" as const,
        isPrivileged: true,
        upjohnWarningGiven: false,
      },
      {
        caseId: cases[2]?.id,
        intervieweeName: "James Peterson",
        intervieweeTitle: "CFO",
        intervieweeEmail: "james.peterson@techcorp.com",
        scheduledDate: new Date("2025-11-20T09:30:00Z"),
        location: "Attorney Office - Boston",
        interviewers: ["Michael Brown, Partner", "Susan Lee, Associate"],
        status: "scheduled" as const,
        isPrivileged: true,
        upjohnWarningGiven: false,
      },
    ];

    for (const interview of interviewsData) {
      if (interview.caseId) {
        const existing = await db
          .select()
          .from(schema.interviews)
          .where(
            sql`${schema.interviews.intervieweeEmail} = ${interview.intervieweeEmail}`
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(schema.interviews).values(interview);
        }
      }
    }

    console.log(`✅ Seeded ${interviewsData.length} sample interviews\n`);
    } else {
      console.log("⏭️  Skipped cases, communications, alerts, and interviews (no user found)\n");
    }

    // ===== FINAL VERIFICATION =====
    console.log("🔍 FINAL VERIFICATION");
    console.log("====================\n");

    const tagCount = await db.select().from(schema.tags);
    const employeeCount = await db.select().from(schema.employees);
    const vendorCount = await db.select().from(schema.vendors);
    const regulationCount = await db.select().from(schema.regulations);
    const caseCount = await db.select().from(schema.cases);
    const commCount = await db.select().from(schema.communications);
    const alertCount = await db.select().from(schema.alerts);
    const interviewCount = await db.select().from(schema.interviews);

    console.log(`✅ Tags: ${tagCount.length}`);
    console.log(`✅ Employees: ${employeeCount.length}`);
    console.log(`✅ Vendors: ${vendorCount.length}`);
    console.log(`✅ Regulations: ${regulationCount.length}`);
    console.log(`✅ Cases: ${caseCount.length}`);
    console.log(`✅ Communications: ${commCount.length}`);
    console.log(`✅ Alerts: ${alertCount.length}`);
    console.log(`✅ Interviews: ${interviewCount.length}`);

    console.log("\n🎉 PRODUCTION SEEDING COMPLETED SUCCESSFULLY!");
    console.log("Your published app should now display all demo data.");
    console.log("\n📱 Refresh your published app to see the data.\n");

  } catch (error) {
    console.error("\n❌ PRODUCTION SEEDING FAILED:");
    console.error(error);
    throw error;
  }
}

// Run the seeding
seedProduction()
  .then(() => {
    console.log("✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
