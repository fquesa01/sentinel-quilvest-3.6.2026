import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import {
  deals, dealTerms, dataRooms, dataRoomDocuments, dealZoningAnalyses,
} from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const ZONING_KEYWORDS = [
  "zoning", "land use", "conditional use", "variance", "rezoning",
  "comprehensive plan", "future land use", "flum", "overlay district",
  "setback", "floor area ratio", "far", "density", "building height",
  "permitted use", "special exception", "plat", "subdivision",
  "development order", "site plan", "pud", "planned unit",
  "mixed use", "commercial district", "residential district",
  "industrial district", "nonconforming", "entitlement",
];

interface ZoningAnalysisContent {
  jurisdiction: {
    city: string;
    county: string;
    state: string;
    governingBody: string;
  };
  zoningClassification: {
    currentZoning: string;
    zoningDescription: string;
    propertyClassification: string;
  };
  futureLandUse: {
    designation: string;
    description: string;
    maxFAR: string;
    maxDensity: string;
  };
  permittedUses: {
    asOfRight: string[];
    conditionalUse: string[];
    prohibited: string[];
  };
  developmentStandards: {
    maxHeight: string;
    far: string;
    setbacks: {
      front: string;
      rear: string;
      side: string;
      sideStreet: string;
    };
    lotCoverage: string;
    openSpace: string;
    parking: string;
    density: string;
  };
  overlays: string[];
  developmentPotential: string;
  regulatoryNotes: string[];
  platInfo: string;
  impactFees: string;
}

export async function getZoningAnalysis(dealId: string) {
  const [analysis] = await db.select()
    .from(dealZoningAnalyses)
    .where(eq(dealZoningAnalyses.dealId, dealId))
    .limit(1);
  return analysis || null;
}

export async function generateZoningAnalysis(dealId: string) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const [terms] = await db.select().from(dealTerms).where(eq(dealTerms.dealId, dealId));

  const address = terms?.propertyAddress || "";
  const city = terms?.propertyCity || "";
  const state = terms?.propertyState || "";
  const county = terms?.propertyCounty || "";
  const zip = terms?.propertyZip || "";
  const propertyType = terms?.propertyType || "";
  const parcelId = terms?.parcelId || "";
  const acreage = terms?.acreage || "";
  const squareFeet = terms?.squareFeet || "";
  const legalDescription = terms?.legalDescription || "";

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
  if (!fullAddress || fullAddress.length < 5) {
    throw new Error("Property address is required. Please populate the deal terms with the property address first.");
  }

  const zoningDocs = await findZoningDocuments(dealId);

  let zoningDocContext = "";
  if (zoningDocs.length > 0) {
    zoningDocContext = "\n\nThe following zoning/land use documents were found in the deal file. Use this information to produce a more accurate and detailed analysis:\n\n" +
      zoningDocs
        .map(d => `--- Document: ${d.fileName} ---\n${(d.extractedText || "").slice(0, 15000)}`)
        .join("\n\n")
        .slice(0, 60000);
  }

  const prompt = `You are an expert real estate land use and zoning attorney. Analyze the following property and provide a comprehensive zoning and land use analysis.

Property Information:
- Address: ${fullAddress}
- County: ${county || "Unknown - determine from the address"}
- Property Type: ${propertyType || "Unknown - determine from context"}
- Parcel ID: ${parcelId || "Not provided"}
- Acreage: ${acreage || "Not provided"}
- Square Feet: ${squareFeet || "Not provided"}
- Legal Description: ${legalDescription || "Not provided"}
- Deal Title: ${deal.title}
- Deal Description: ${(deal.description || "").slice(0, 2000)}
${zoningDocContext}

Provide a comprehensive zoning analysis as a JSON object with this exact structure:
{
  "jurisdiction": {
    "city": "city name",
    "county": "county name",
    "state": "state name or abbreviation",
    "governingBody": "the specific governmental body with zoning authority"
  },
  "zoningClassification": {
    "currentZoning": "the zoning district code/designation (e.g. MX1, R-1, C-2)",
    "zoningDescription": "detailed description of this zoning classification and what it means",
    "propertyClassification": "residential" | "commercial" | "mixed_use" | "industrial" | "agricultural" | "institutional"
  },
  "futureLandUse": {
    "designation": "the future land use map designation",
    "description": "what this designation permits and its purpose",
    "maxFAR": "maximum floor area ratio under this designation",
    "maxDensity": "maximum density permitted"
  },
  "permittedUses": {
    "asOfRight": ["list of uses permitted as of right"],
    "conditionalUse": ["list of uses requiring conditional use approval"],
    "prohibited": ["list of prohibited uses"]
  },
  "developmentStandards": {
    "maxHeight": "maximum building height with details on bonuses if applicable",
    "far": "floor area ratio details including any bonus provisions",
    "setbacks": {
      "front": "front setback requirement",
      "rear": "rear setback requirement", 
      "side": "side setback requirement",
      "sideStreet": "side street setback if applicable"
    },
    "lotCoverage": "maximum lot coverage percentage",
    "openSpace": "minimum open space requirement",
    "parking": "parking requirements per use type",
    "density": "residential density limits if applicable"
  },
  "overlays": ["list of any overlay districts, historic districts, or special area designations that apply"],
  "developmentPotential": "A detailed narrative paragraph summarizing the development potential of this property, including maximum buildable area, height potential, potential uses, and any special opportunities like transfer of development rights or bonus provisions",
  "regulatoryNotes": ["Important regulatory considerations such as impact fees, concurrency requirements, platting requirements, environmental restrictions, or other material regulatory matters"],
  "platInfo": "Information about the property's platting, subdivision history, and any unity of title or covenant requirements",
  "impactFees": "Summary of applicable impact fees and concurrency requirements at both the municipal and county level"
}

IMPORTANT INSTRUCTIONS:
- If zoning documents were provided above, use them as the primary source of information and incorporate their specific details (exact FAR numbers, setback dimensions, height limits, etc.)
- If no zoning documents were provided, use your knowledge of the jurisdiction's zoning code to provide the most accurate analysis possible. Be clear about what is based on general knowledge vs. specific documents.
- For county and city, analyze the address carefully. If the address mentions a specific city, identify whether it is an incorporated municipality or falls under unincorporated county jurisdiction.
- Determine whether this is residential or commercial based on the property type, zoning district, and permitted uses.
- Be specific with numbers and measurements where possible.
- Return ONLY the JSON object, no other text.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI analysis response");
  }

  const analysisContent: ZoningAnalysisContent = JSON.parse(jsonMatch[0]);

  const docSummaries = await summarizeZoningDocuments(zoningDocs);

  const jurisdictionData = {
    city: analysisContent.jurisdiction.city,
    county: analysisContent.jurisdiction.county,
    state: analysisContent.jurisdiction.state,
    governingBody: analysisContent.jurisdiction.governingBody,
  };

  const existing = await getZoningAnalysis(dealId);

  if (existing) {
    await db.update(dealZoningAnalyses)
      .set({
        propertyAddress: fullAddress,
        jurisdiction: jurisdictionData,
        propertyClassification: analysisContent.zoningClassification.propertyClassification,
        zoningDistrict: analysisContent.zoningClassification.currentZoning,
        futureDesignation: analysisContent.futureLandUse.designation,
        analysisContent: analysisContent as unknown as Record<string, unknown>,
        documentSummaries: docSummaries as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(dealZoningAnalyses.id, existing.id));

    return { ...existing, analysisContent, documentSummaries: docSummaries, propertyAddress: fullAddress, jurisdiction: jurisdictionData };
  } else {
    const [newAnalysis] = await db.insert(dealZoningAnalyses)
      .values({
        dealId,
        propertyAddress: fullAddress,
        jurisdiction: jurisdictionData,
        propertyClassification: analysisContent.zoningClassification.propertyClassification,
        zoningDistrict: analysisContent.zoningClassification.currentZoning,
        futureDesignation: analysisContent.futureLandUse.designation,
        analysisContent: analysisContent as unknown as Record<string, unknown>,
        documentSummaries: docSummaries as unknown as Record<string, unknown>,
      })
      .returning();
    return newAnalysis;
  }
}

async function findZoningDocuments(dealId: string) {
  const rooms = await db.select({ id: dataRooms.id })
    .from(dataRooms)
    .where(eq(dataRooms.dealId, dealId));

  if (rooms.length === 0) return [];

  const roomIds = rooms.map(r => r.id);
  const docs = await db.select({
    id: dataRoomDocuments.id,
    fileName: dataRoomDocuments.fileName,
    extractedText: dataRoomDocuments.extractedText,
    aiSummary: dataRoomDocuments.aiSummary,
  })
    .from(dataRoomDocuments)
    .where(inArray(dataRoomDocuments.dataRoomId, roomIds));

  return docs.filter(doc => {
    const nameLC = (doc.fileName || "").toLowerCase();
    const textLC = (doc.extractedText || "").toLowerCase().slice(0, 2000);
    return ZONING_KEYWORDS.some(kw => nameLC.includes(kw) || textLC.includes(kw));
  });
}

async function summarizeZoningDocuments(docs: Array<{ id: string; fileName: string | null; extractedText: string | null; aiSummary: string | null }>) {
  if (docs.length === 0) return [];

  const summaries = [];
  for (const doc of docs) {
    const existing = doc.aiSummary;
    if (existing && existing.length > 50) {
      summaries.push({
        documentId: doc.id,
        fileName: doc.fileName,
        summary: existing,
      });
      continue;
    }

    const text = (doc.extractedText || "").slice(0, 10000);
    if (text.length < 100) continue;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Summarize this zoning/land use document in 3-5 paragraphs, focusing on key zoning findings, permitted uses, development standards, and any issues or recommendations identified:\n\n${text}`,
        }],
      });

      const summary = response.content[0]?.type === "text" ? response.content[0].text : "";
      summaries.push({
        documentId: doc.id,
        fileName: doc.fileName,
        summary,
      });
    } catch (err) {
      console.error(`[Zoning] Error summarizing document ${doc.fileName}:`, err);
      summaries.push({
        documentId: doc.id,
        fileName: doc.fileName,
        summary: text.slice(0, 500) + "...",
      });
    }
  }

  return summaries;
}
