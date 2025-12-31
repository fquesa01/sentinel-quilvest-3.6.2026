import { db } from "./db";
import { communications } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Seed comprehensive eDiscovery demo data for Document Review
 * FCPA and Antitrust violation communications with realistic content
 */

export async function seedEDiscoveryDocs() {
  console.log("🔍 Seeding eDiscovery demo documents...");

  const docs = [
    // ===== FCPA Violation Case - Southeast Asia Bribery Scheme =====
    
    // Email 1: Initial contact with foreign official
    {
      communication_type: "email",
      subject: "Meeting with Minister Wong - Singapore Infrastructure Project",
      body: `Dear Sarah,

Following up on our conversation last week. I met with Minister Wong from the Singapore Ministry of Infrastructure yesterday. He was very interested in our proposal for the $15M port modernization project.

However, he mentioned that the approval process could take 6-8 months through normal channels. He suggested that a "facilitation payment" to his office could expedite the review process to just 4-6 weeks.

He recommended we work through his business associate, Mr. Tan, who runs a consulting firm in Malaysia. Minister Wong said Mr. Tan understands "how things work" in the region and can help ensure smooth approval.

What are your thoughts on moving forward with this arrangement?

Best regards,
David Chen
VP International Business Development`,
      sender: "david.chen@globalcorp.com",
      recipients: JSON.stringify(["sarah.williams@globalcorp.com"]),
      timestamp: new Date("2025-09-15T09:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // Email 2: Response discussing payment structure
    {
      communication_type: "email",
      subject: "Re: Meeting with Minister Wong - Singapore Infrastructure Project",
      body: `David,

Thanks for the update. This is a significant opportunity for us, and I understand the urgency.

However, we need to be extremely careful here. What you're describing sounds like it could raise FCPA concerns. A "facilitation payment" to a foreign government official - even if routed through a third party - is exactly what got XYZ Corp in trouble last year.

Can you provide more details on:
1. What specific services would Mr. Tan's consulting firm provide?
2. Is there documentation of legitimate consulting work?
3. What is the proposed payment amount?

We should loop in Legal and Compliance before proceeding. I know the deal timeline is tight, but we can't afford FCPA violations.

Sarah Williams
Chief Operating Officer`,
      sender: "sarah.williams@globalcorp.com",
      recipients: JSON.stringify(["david.chen@globalcorp.com"]),
      timestamp: new Date("2025-09-15T14:20:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // Email 3: Circumventing compliance
    {
      communication_type: "email",
      subject: "Re: Meeting with Minister Wong - Singapore Infrastructure Project",
      body: `Sarah,

I understand your concerns, but this is how business is done in Southeast Asia. Every major contractor uses local "consultants" for these arrangements. If we don't play ball, the contract goes to our competitor.

Regarding your questions:
- Mr. Tan's firm would provide "market entry consulting" and "government relations advisory"
- Payment would be $200,000 - structured as $150K upfront "retainer" + $50K "success fee"
- We can draft a consulting agreement that looks legitimate on paper

I'd rather not involve Legal yet - they'll just slow everything down with questions. Minister Wong needs an answer by Friday or the opportunity goes to the German firm that's been courting his office.

This is a $15M contract. The $200K is just the cost of doing business in the region. I've already done this successfully in Malaysia and Thailand without any issues.

Can I have your approval to proceed?

David`,
      sender: "david.chen@globalcorp.com",
      recipients: JSON.stringify(["sarah.williams@globalcorp.com"]),
      timestamp: new Date("2025-09-16T08:15:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // Email 4: Approval with cover-up language
    {
      communication_type: "email",
      subject: "Re: Meeting with Minister Wong - Singapore Infrastructure Project",
      body: `David,

Against my better judgment, I'm going to approve this. But we need to be smart about it:

1. The consulting agreement must look 100% legitimate - detailed scope of work, deliverables, milestones
2. All payments go through Mr. Tan's firm - NEVER directly to Minister Wong or any government official
3. Invoice descriptions should be vague: "market research," "stakeholder engagement," "regulatory advisory"
4. Do NOT mention Minister Wong or any government connection in any documentation
5. This email thread needs to be deleted after you read this

Have Mr. Tan send us a proper consulting proposal by Wednesday. I'll approve it and get Finance to process the wire transfer.

And David - if Legal or Compliance asks about this, the story is: we hired a local consulting firm to help us understand the Singapore market and navigate the approval process. Nothing more.

Sarah`,
      sender: "sarah.williams@globalcorp.com",
      recipients: JSON.stringify(["david.chen@globalcorp.com"]),
      timestamp: new Date("2025-09-16T16:45:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // SMS - Payment confirmation
    {
      communication_type: "sms_mobile",
      subject: "SMS Message",
      body: `Minister Wong confirmed - contract approval will be fast-tracked once payment clears. Mr. Tan's firm account details attached. Wire should go out Thursday. Delete this message.`,
      sender: "+65-9123-4567",
      recipients: JSON.stringify(["+1-415-555-0142"]),
      timestamp: new Date("2025-09-18T11:30:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },

    // ===== Antitrust Violation Case - Price Fixing Conspiracy =====

    // Email 1: Trade association meeting setup
    {
      communication_type: "email",
      subject: "TECHSA Trade Association Q4 Meeting - Agenda Items",
      body: `Dear Members,

The Technology Services Association (TECHSA) Q4 meeting is scheduled for October 25th at the Marriott Downtown. 

Official agenda items:
- Industry trends and market outlook
- Regulatory update on data privacy laws
- Member networking lunch

I'd also like to propose an informal dinner the night before (October 24th) for the pricing executives from the major firms. Just the five of us - no lawyers, no formal minutes.

We should discuss the "competitive environment" and how we're all dealing with pricing pressure. It would be beneficial to understand each other's strategies for Q1 2026.

Interested?

Mike Reynolds
VP Pricing, CloudTech Solutions`,
      sender: "mike.reynolds@cloudtech.com",
      recipients: JSON.stringify([
        "jennifer.martinez@dataserve.com",
        "robert.kim@storagesys.com",
        "amanda.foster@netcloud.com",
        "james.patterson@infrasolutions.com"
      ]),
      timestamp: new Date("2025-10-01T10:15:00Z"),
      legal_hold: "active",
      source_type: "email_google",
    },

    // Email 2: Acceptance and pricing discussion hint
    {
      communication_type: "email",
      subject: "Re: TECHSA Trade Association Q4 Meeting - Agenda Items",
      body: `Mike,

Count me in for the dinner. We definitely need to have a frank conversation about where pricing is headed.

Our CFO is pushing us to increase prices 18-20% for Q1. But if everyone else holds steady, we'll lose market share. It would be helpful to know what you all are thinking.

Also, we should talk about the enterprise vs SMB segments. Maybe there's a way to avoid everyone competing for the same customers?

See you on the 24th.

Jennifer Martinez
SVP Strategy & Pricing, DataServe Inc`,
      sender: "jennifer.martinez@dataserve.com",
      recipients: JSON.stringify(["mike.reynolds@cloudtech.com"]),
      timestamp: new Date("2025-10-01T14:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // Email 3: Post-dinner summary (smoking gun)
    {
      communication_type: "email",
      subject: "Dinner Follow-up - Next Steps",
      body: `Team,

Great dinner last night. I think we all came away with a clearer picture of the market.

To summarize what we discussed (this email is CONFIDENTIAL - do not forward):

PRICING STRATEGY Q1 2026:
- All firms targeting 15-18% price increase effective January 1st
- Announcement window: December 10-20th (coordinated timing)
- Focus: Enterprise customers (>500 seats)
- SMB segment (<100 seats): hold pricing steady to avoid antitrust scrutiny

MARKET ALLOCATION:
- CloudTech: West Coast enterprise
- DataServe: East Coast enterprise  
- StorageSys: Midwest regional
- NetCloud: Government/public sector
- InfraSolutions: International/global accounts

NEXT STEPS:
- Each firm sends pricing lead to monthly "market intelligence" calls
- Share customer win/loss data confidentially
- Coordinate on bid responses for major RFPs
- Next dinner: January 15th to review Q1 results

This stays between us. No documentation beyond this email. Delete after reading.

Mike`,
      sender: "mike.reynolds@cloudtech.com",
      recipients: JSON.stringify([
        "jennifer.martinez@dataserve.com",
        "robert.kim@storagesys.com",
        "amanda.foster@netcloud.com",
        "james.patterson@infrasolutions.com"
      ]),
      timestamp: new Date("2025-10-25T09:45:00Z"),
      legal_hold: "active",
      source_type: "email_google",
    },

    // SMS - Bid rigging coordination
    {
      communication_type: "sms_mobile",
      subject: "SMS Message",
      body: `Hey Mike - just got the RFP from State of California for the $8M cloud migration project. Your turn to win this one per our agreement. Our bid will come in 20% higher. You owe us one for the Texas deal last month. 👍`,
      sender: "+1-858-555-0193",
      recipients: JSON.stringify(["+1-415-555-0187"]),
      timestamp: new Date("2025-10-28T15:20:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },

    // Teams chat - Market allocation discussion
    {
      communication_type: "chat_teams",
      subject: "Teams Chat",
      body: `[Mike Reynolds]: So we're all agreed - nobody bids on each other's customers from the protected list?

[Jennifer Martinez]: Correct. I sent you my top 50 enterprise accounts. You stay away from those, I stay away from yours.

[Mike Reynolds]: Perfect. This way we avoid price wars and maintain margins. Win-win for everyone.

[Jennifer Martinez]: Exactly. Competition is overrated 😂

[Mike Reynolds]: Delete this chat thread later. Legal would have a heart attack if they saw this.`,
      sender: "mike.reynolds@cloudtech.com",
      recipients: JSON.stringify(["jennifer.martinez@dataserve.com"]),
      timestamp: new Date("2025-10-29T11:10:00Z"),
      legal_hold: "active",
      source_type: "chat_teams",
    },

    // ===== Additional FCPA Evidence - Third Party Due Diligence Failure =====

    {
      communication_type: "email",
      subject: "Concerns about the Malaysia Consulting Firm",
      body: `Sarah,

I'm the Compliance Officer and I need to flag some serious red flags about "Tan Consulting Services Malaysia" that David wants to pay $200K.

My due diligence investigation found:
- Company was incorporated 3 weeks ago (September 25th)
- No website, no office address (just a P.O. Box)
- Sole director/shareholder: Richard Tan (Minister Wong's brother-in-law)
- No prior consulting projects or references
- Bank account opened last week

This screams FCPA violation. We're essentially paying a shell company controlled by a foreign official's family member. The DOJ would have a field day with this.

I recommend we:
1. Immediately stop this payment
2. Conduct proper third-party due diligence
3. Report this internally per our mandatory disclosure policy

Please advise.

Lisa Thompson
Chief Compliance Officer`,
      sender: "lisa.thompson@globalcorp.com",
      recipients: JSON.stringify(["sarah.williams@globalcorp.com", "michael.roberts@globalcorp.com"]),
      timestamp: new Date("2025-09-20T08:00:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // CEO response - Ignoring compliance
    {
      communication_type: "email",
      subject: "Re: Concerns about the Malaysia Consulting Firm",
      body: `Lisa,

I appreciate your diligence, but you're being overly cautious here. This is a competitive market and sometimes we need to move quickly.

David has assured me this is standard practice in the region. Every major contractor uses local consultants. The deal is worth $15M - we can't afford to lose it over compliance paranoia.

Please process the payment as requested. I'm overriding your recommendation on this one.

We can discuss this further at the next board meeting, but for now, let's get the deal done.

Michael Roberts
CEO`,
      sender: "michael.roberts@globalcorp.com",
      recipients: JSON.stringify(["lisa.thompson@globalcorp.com"]),
      timestamp: new Date("2025-09-20T14:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // ===== Additional FCPA - Payment Execution =====
    {
      communication_type: "email",
      subject: "Wire Transfer Confirmation - Lee Consulting Services",
      body: `Finance Team,

Wire transfer of $150,000 has been successfully completed to:

Beneficiary: Lee Consulting Services Sdn Bhd
Account: 8901234567
Bank: Maybank Malaysia
Reference: Market Research Services - Singapore Project

The remaining $50,000 success fee will be processed upon contract award.

Please file this under "Professional Services - International Consulting."

Best,
Jennifer Park
Finance Manager`,
      sender: "jennifer.park@globalcorp.com",
      recipients: JSON.stringify(["accounting@globalcorp.com"]),
      timestamp: new Date("2025-09-19T10:00:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // ===== SOX / Accounting Fraud Case =====
    {
      communication_type: "email",
      subject: "Q3 Revenue Recognition - Urgent Discussion",
      body: `Mark,

We have a problem. Our Q3 revenue is coming in $8.2M short of the forecast we gave to Wall Street. The stock will tank if we miss by that much.

I need you to look at the Enterprise Solutions deals that closed in late September. Can we recognize any of the Q4 pipeline revenue in Q3? 

Specifically:
- The Acme Corp deal that "verbally committed" on Sept 28
- The DataTech contract that's 95% negotiated
- The TechStart renewal that's "basically done"

I know the contracts aren't signed yet, but we have strong indications these deals are happening. That's $6M right there.

Also, can we delay recognizing some of the Q3 expenses until Q4? The marketing campaign and the consultant fees could probably wait.

I need your thoughts by EOD. The board call is Friday and I can't tell them we're missing the number.

Robert Chen
CFO`,
      sender: "robert.chen@globalcorp.com",
      recipients: JSON.stringify(["mark.williams@globalcorp.com"]),
      timestamp: new Date("2025-09-29T16:45:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    {
      communication_type: "email",
      subject: "Re: Q3 Revenue Recognition - Urgent Discussion",
      body: `Robert,

I'm very uncomfortable with this. What you're describing is exactly what got us in trouble during the last audit.

Revenue recognition rules are clear - we can't book revenue until:
1. Contract is signed
2. Delivery has occurred or services rendered
3. Collection is reasonably assured

None of these deals meet that criteria. "Verbal commitments" and "basically done" don't count under GAAP.

And shifting Q3 expenses to Q4 is just as problematic. That's manipulation of the financial statements to meet targets.

I strongly recommend we report the actual numbers and explain the shortfall to investors. The SEC takes revenue recognition fraud very seriously.

Can we schedule a call to discuss alternatives?

Mark Williams
Controller`,
      sender: "mark.williams@globalcorp.com",
      recipients: JSON.stringify(["robert.chen@globalcorp.com"]),
      timestamp: new Date("2025-09-29T17:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    {
      communication_type: "email",
      subject: "Re: Q3 Revenue Recognition - Urgent Discussion",
      body: `Mark,

I hear your concerns, but you're being overly cautious. This isn't fraud - it's aggressive but defensible revenue recognition.

The Acme deal WILL close. Their CEO told me personally. We're just accelerating the timing slightly. And those expenses? They're discretionary - we have flexibility on timing.

Every public company manages their earnings to some degree. This is just smoothing out the volatility.

I need you to work with me here. Find a way to book at least $5M of that pipeline revenue in Q3. Be creative with the documentation.

If you can't do this, I'll need to bring in someone who can. The board expects $47M in Q3 revenue and I'm going to deliver it.

Your choice.

Robert`,
      sender: "robert.chen@globalcorp.com",
      recipients: JSON.stringify(["mark.williams@globalcorp.com"]),
      timestamp: new Date("2025-09-29T18:15:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // ===== AML / Banking Case =====
    {
      communication_type: "email",
      subject: "Large Cash Deposits - Premier Customer Account #45829",
      body: `Compliance Team,

I have a question about our BSA/AML procedures for a high-value customer.

One of my premier clients, Apex Holdings LLC, has been making regular cash deposits over the past 6 months:
- Total deposits: $2.3M
- Frequency: $9,800 every 2-3 days
- All cash, no checks or wires

The deposits are always just under the $10K reporting threshold. When I asked the customer about the source of funds, he said it's "cash revenues from his retail businesses."

I tried to get documentation of these retail businesses, but he's been evasive. Says his accountant has the records but he's "too busy" to provide them.

Do I need to file a SAR on this? I don't want to lose a good customer over paperwork, but the pattern seems suspicious.

What should I do?

Amanda Foster
Relationship Manager
Private Banking Division`,
      sender: "amanda.foster@metrobank.com",
      recipients: JSON.stringify(["compliance@metrobank.com"]),
      timestamp: new Date("2025-10-05T14:20:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    {
      communication_type: "email",
      subject: "Re: Large Cash Deposits - Premier Customer Account #45829",
      body: `Amanda,

This is TEXTBOOK structuring (smurfing). $9,800 deposits designed to avoid the $10K CTR threshold is exactly what the Bank Secrecy Act is designed to catch.

You need to:
1. File a Suspicious Activity Report (SAR) immediately
2. Document all interactions with this customer
3. DO NOT tell the customer about the SAR filing
4. Gather any available information about Apex Holdings

This pattern is consistent with money laundering. The "retail businesses" claim needs verification. Legitimate businesses don't conduct operations entirely in cash and structure deposits to avoid reporting.

Priority: URGENT - File SAR within 30 days of detection
Risk Level: HIGH

Please forward all account documentation to my office today.

David Park
Chief Compliance Officer`,
      sender: "david.park@metrobank.com",
      recipients: JSON.stringify(["amanda.foster@metrobank.com"]),
      timestamp: new Date("2025-10-05T15:10:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    // ===== More Antitrust - Continued Price Fixing =====
    {
      communication_type: "chat_teams",
      subject: "Teams Message - Industry Pricing",
      body: `Just got off the call with Peterson from MegaCorp. They're planning to hold pricing at current levels through Q1. Said they won't undercut us if we maintain the "recommended pricing structure."

This is perfect - if we all stick to the agreement, we can avoid another price war like last year.

Remind your sales team: minimum 15% gross margin on all enterprise deals. Anyone who discounts below that needs VP approval.`,
      sender: "thomas.anderson@techsolutions.com",
      recipients: JSON.stringify(["sales-leadership@techsolutions.com"]),
      timestamp: new Date("2025-10-12T11:45:00Z"),
      legal_hold: "active",
      source_type: "chat_teams",
    },

    {
      communication_type: "sms_mobile",
      subject: "SMS Message",
      body: `Peterson confirmed - they're in. InnovateTech and DataCorp are also committed to the pricing floor. We've got the whole industry aligned. No more discounting wars. 🎯`,
      sender: "+1-617-555-0199",
      recipients: JSON.stringify(["+1-617-555-0155"]),
      timestamp: new Date("2025-10-12T14:30:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },

    // ===== Insider Trading Case =====
    {
      communication_type: "email",
      subject: "FW: CONFIDENTIAL - Merger Discussion",
      body: `Hey Mike,

Forwarding this in case you're interested. Don't share with anyone.

---------- Forwarded message ---------
From: Jennifer Adams <jadams@globalcorp.com>
Date: Wed, Oct 18, 2025 at 3:15 PM
Subject: CONFIDENTIAL - Merger Discussion

Board Members,

This email confirms that we have entered into exclusive negotiations with TechVenture Corp for a potential acquisition. The offer is $45 per share, representing a 60% premium to our current stock price.

Due diligence will begin next week. We expect to announce the deal publicly in early November if negotiations proceed successfully.

This information is HIGHLY CONFIDENTIAL. Do not discuss with anyone outside the board.

Jennifer Adams
General Counsel

---------- End forwarded message ---------`,
      sender: "john.smith@globalcorp.com",
      recipients: JSON.stringify(["mike.johnson@personalmail.com"]),
      timestamp: new Date("2025-10-18T16:30:00Z"),
      legal_hold: "active",
      source_type: "email_m365",
    },

    {
      communication_type: "sms_mobile",
      subject: "SMS Message",
      body: `Just bought 5,000 shares. Use your personal account - don't go through the company brokerage. This info is pure gold. Stock's at $28 now, will be $45 when deal announces. 🚀💰`,
      sender: "+1-212-555-0178",
      recipients: JSON.stringify(["+1-212-555-0193"]),
      timestamp: new Date("2025-10-19T09:15:00Z"),
      legal_hold: "active",
      source_type: "sms_mobile",
    },
  ];

  // Insert all documents using raw SQL to avoid schema mismatches
  for (const doc of docs) {
    await db.execute(sql`
      INSERT INTO communications (
        communication_type, subject, body, sender, recipients, 
        timestamp, legal_hold, source_type
      ) VALUES (
        ${doc.communication_type},
        ${doc.subject},
        ${doc.body},
        ${doc.sender},
        ${JSON.stringify(doc.recipients)},
        ${doc.timestamp},
        ${doc.legal_hold},
        ${doc.source_type}
      )
    `);
  }

  console.log("✅ Successfully seeded eDiscovery demo documents");
  console.log("   - FCPA case: 8 communications");
  console.log("   - Antitrust case: 7 communications");
  console.log("   - SOX/Accounting Fraud: 3 communications");
  console.log("   - AML/Banking: 2 communications");
  console.log("   - Insider Trading: 2 communications");
  console.log("   Total: 22 documents for review");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEDiscoveryDocs()
    .then(() => {
      console.log("eDiscovery document seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("eDiscovery document seeding failed:", error);
      process.exit(1);
    });
}
