import { db } from "./db";
import { regulations, communications, alerts, cases } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database with sample data...");

  // Seed regulations
  const sampleRegulations = [
    {
      title: "Foreign Corrupt Practices Act (FCPA) - Anti-Bribery Provisions",
      violationType: "fcpa" as const,
      description: "Prohibits U.S. persons and businesses from bribing foreign officials for business purposes",
      content: "The FCPA's anti-bribery provisions prohibit the willful use of the mails or any means of interstate commerce corruptly in furtherance of any offer, payment, promise to pay, or authorization of money or anything of value to any person, while knowing that all or a portion of such money or thing of value will be offered, given, or promised to a foreign official to influence the foreign official in his or her official capacity, induce the foreign official to do or omit to do an act in violation of his or her lawful duty, or to secure any improper advantage in order to assist in obtaining or retaining business for or with, or directing business to, any person.",
      citation: "15 U.S.C. §§ 78dd-1, et seq.",
      jurisdiction: "federal",
      tags: ["bribery", "foreign officials", "corruption"],
    },
    {
      title: "Bank Secrecy Act (BSA) - Anti-Money Laundering Requirements",
      violationType: "banking" as const,
      description: "Requires financial institutions to assist government agencies in detecting and preventing money laundering",
      content: "The BSA requires financial institutions to keep records of cash purchases of negotiable instruments, file reports of cash transactions exceeding $10,000 (daily aggregate amount), and to report suspicious activity that might signify money laundering, tax evasion, or other criminal activities. Financial institutions must implement anti-money laundering programs and conduct customer due diligence.",
      citation: "31 U.S.C. §§ 5311-5332",
      jurisdiction: "federal",
      tags: ["money laundering", "suspicious activity", "financial crimes"],
    },
    {
      title: "Sherman Antitrust Act - Price Fixing Prohibition",
      violationType: "antitrust" as const,
      description: "Prohibits agreements among competitors to fix prices, rig bids, or engage in other anticompetitive activity",
      content: "Section 1 of the Sherman Act prohibits every contract, combination, or conspiracy in restraint of trade. Price fixing is a per se violation of the Sherman Act. Competitors may not agree on prices, discounts, or terms of sale. This includes agreements to raise, fix, or maintain prices, as well as agreements on price levels, price changes, or price differentials.",
      citation: "15 U.S.C. § 1",
      jurisdiction: "federal",
      tags: ["price fixing", "antitrust", "competition", "cartel"],
    },
    {
      title: "SEC Rule 10b-5 - Prohibition Against Insider Trading",
      violationType: "sec" as const,
      description: "Prohibits fraud and manipulation in the purchase or sale of securities",
      content: "It is unlawful for any person to engage in any act, practice, or course of business which operates as a fraud or deceit upon any person in connection with the purchase or sale of any security. This includes insider trading - trading securities while in possession of material, non-public information. Officers, directors, and employees who learn of such information are prohibited from trading or tipping others who trade on the basis of that information.",
      citation: "17 CFR § 240.10b-5",
      jurisdiction: "federal",
      tags: ["insider trading", "securities fraud", "material information"],
    },
    {
      title: "Sarbanes-Oxley Act - Internal Controls and Disclosure",
      violationType: "sox" as const,
      description: "Requires public companies to maintain adequate internal financial controls and accurate financial disclosures",
      content: "Section 404 of SOX requires management to assess the effectiveness of the company's internal control over financial reporting annually. Companies must establish and maintain adequate internal control structure and procedures for financial reporting. Material weaknesses in internal controls must be disclosed. The Act also established criminal penalties for destruction, alteration, or fabrication of financial records with intent to obstruct or influence investigations.",
      citation: "15 U.S.C. § 7262",
      jurisdiction: "federal",
      tags: ["internal controls", "financial reporting", "disclosure"],
    },
    {
      title: "Florida Deceptive and Unfair Trade Practices Act",
      violationType: "florida_specific" as const,
      description: "Prohibits unfair methods of competition and unfair or deceptive trade practices in Florida",
      content: "The FDUTPA declares unlawful unfair methods of competition, unconscionable acts or practices, and unfair or deceptive acts or practices in the conduct of any trade or commerce. It provides both public enforcement by the Attorney General and private causes of action for persons injured by violations. The Act is modeled after Section 5(a)(1) of the Federal Trade Commission Act.",
      citation: "Fla. Stat. §§ 501.201-501.213",
      jurisdiction: "florida",
      tags: ["consumer protection", "unfair practices", "deceptive practices"],
    },
  ];

  try {
    for (const reg of sampleRegulations) {
      await db.insert(regulations).values(reg).onConflictDoNothing();
    }
    console.log(`✓ Seeded ${sampleRegulations.length} regulations`);
  } catch (error) {
    console.error("Error seeding regulations:", error);
  }

  console.log("Database seeding complete!");
}

// Auto-run the seed function
seedDatabase()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
