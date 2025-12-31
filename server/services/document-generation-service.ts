import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { 
  generatedDocuments,
  dealTerms,
  deals,
  type InsertGeneratedDocument,
  type GeneratedDocument,
  type DealTerms 
} from "@shared/schema";
import { eq } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

interface DocumentGenerationRequest {
  dealId: string;
  documentType: string;
  generatedBy: string;
  customInstructions?: string;
}

interface GenerationResult {
  success: boolean;
  document?: GeneratedDocument;
  error?: string;
}

const DOCUMENT_TEMPLATES: Record<string, { name: string; sections: string[] }> = {
  psa: {
    name: "Purchase and Sale Agreement",
    sections: [
      "Recitals",
      "Definitions",
      "Sale of Property",
      "Purchase Price and Earnest Money",
      "Due Diligence Period",
      "Title and Survey",
      "Conditions to Closing",
      "Closing",
      "Representations and Warranties of Seller",
      "Representations and Warranties of Buyer",
      "Covenants",
      "Indemnification",
      "Default and Remedies",
      "Miscellaneous Provisions",
      "Exhibits"
    ]
  },
  amendment: {
    name: "Amendment to Purchase and Sale Agreement",
    sections: [
      "Recitals",
      "Amendment of Terms",
      "Ratification",
      "Execution"
    ]
  },
  assignment: {
    name: "Assignment of Purchase and Sale Agreement",
    sections: [
      "Recitals",
      "Assignment",
      "Assumption of Obligations",
      "Consent of Seller",
      "Representations",
      "Execution"
    ]
  },
  deed: {
    name: "Special Warranty Deed",
    sections: [
      "Grantor Information",
      "Grantee Information",
      "Property Description",
      "Conveyance Language",
      "Warranty",
      "Acknowledgment"
    ]
  },
  bill_of_sale: {
    name: "Bill of Sale",
    sections: [
      "Seller Information",
      "Buyer Information",
      "Description of Personal Property",
      "Transfer and Conveyance",
      "Warranties",
      "Execution"
    ]
  },
  assignment_of_leases: {
    name: "Assignment and Assumption of Leases",
    sections: [
      "Recitals",
      "Assignment of Leases",
      "Assumption of Obligations",
      "Proration of Rents",
      "Indemnification",
      "Execution"
    ]
  },
  closing_certificate: {
    name: "Closing Certificate",
    sections: [
      "Recitals",
      "Representations and Warranties",
      "Covenants Fulfilled",
      "No Material Adverse Change",
      "Execution"
    ]
  },
  firpta: {
    name: "FIRPTA Affidavit",
    sections: [
      "Transferor Information",
      "Certification of Non-Foreign Status",
      "Tax Identification Number",
      "Acknowledgment"
    ]
  }
};

export class DocumentGenerationService {
  async generateDocument(request: DocumentGenerationRequest): Promise<GenerationResult> {
    try {
      const terms = await db.query.dealTerms.findFirst({
        where: eq(dealTerms.dealId, request.dealId),
      });

      const [deal] = await db.select().from(deals).where(eq(deals.id, request.dealId));

      if (!terms) {
        return {
          success: false,
          error: "No deal terms found. Please add deal terms first.",
        };
      }

      if (!deal) {
        return {
          success: false,
          error: "Deal not found.",
        };
      }

      const template = DOCUMENT_TEMPLATES[request.documentType];
      if (!template) {
        return {
          success: false,
          error: `Unknown document type: ${request.documentType}`,
        };
      }

      const content = await this.generateDocumentContent(
        template,
        terms,
        deal,
        request.customInstructions
      );

      const [savedDoc] = await db.insert(generatedDocuments).values({
        dealId: request.dealId,
        documentType: request.documentType,
        documentName: `${template.name} - ${deal.title}`,
        generatedContent: content,
        termsSnapshotJson: terms as any,
        dealTermsId: terms.id,
        generatedBy: request.generatedBy,
        status: 'draft',
        version: 1,
      }).returning();

      return {
        success: true,
        document: savedDoc,
      };
    } catch (error: any) {
      console.error("Document generation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async generateDocumentContent(
    template: { name: string; sections: string[] },
    terms: DealTerms,
    deal: any,
    customInstructions?: string
  ): Promise<string> {
    const prompt = `You are a real estate attorney drafting a ${template.name} for a commercial real estate transaction.

## DEAL TERMS

Property: ${terms.propertyName || 'TBD'} at ${terms.propertyAddress || 'TBD'}, ${terms.propertyCity || ''}, ${terms.propertyState || ''} ${terms.propertyZip || ''}
Property Type: ${terms.propertyType || 'Commercial'}

Buyer: ${terms.buyerName || '[BUYER]'}
Buyer Entity Type: ${terms.buyerEntityType || 'LLC'}
Buyer State of Formation: ${terms.buyerStateOfFormation || '[STATE]'}
Buyer Address: ${terms.buyerAddress || '[ADDRESS]'}
Buyer Signer: ${terms.buyerSignerName || '[NAME]'}, ${terms.buyerSignerTitle || '[TITLE]'}

Seller: ${terms.sellerName || '[SELLER]'}
Seller Entity Type: ${terms.sellerEntityType || 'LLC'}
Seller State of Formation: ${terms.sellerStateOfFormation || '[STATE]'}
Seller Address: ${terms.sellerAddress || '[ADDRESS]'}
Seller Signer: ${terms.sellerSignerName || '[NAME]'}, ${terms.sellerSignerTitle || '[TITLE]'}

Escrow Agent: ${terms.escrowAgentName || '[ESCROW AGENT]'}
Escrow Contact: ${terms.escrowAgentContact || ''}, ${terms.escrowAgentEmail || ''}
Escrow Address: ${terms.escrowAgentAddress || ''}

Purchase Price: ${terms.purchasePrice || '$[AMOUNT]'}
Initial Deposit: ${terms.initialDeposit || '$[AMOUNT]'} due within ${terms.initialDepositDays || '[X]'} business days
Additional Deposit: ${terms.additionalDeposit || 'N/A'} ${terms.additionalDepositTrigger ? `(${terms.additionalDepositTrigger})` : ''}

Effective Date: ${terms.effectiveDate || '[DATE]'}
Due Diligence Period: ${terms.dueDiligencePeriodDays || '[X]'} days
Due Diligence Expiration: ${terms.dueDiligenceExpiration || '[DATE]'}
Closing Date: ${terms.closingDate || '[DATE]'}

Financing Contingency: ${terms.hasFinancingContingency ? `Yes, ${terms.financingContingencyDays || '[X]'} days` : 'No'}

Title Objection Period: ${terms.titleObjectionPeriodDays || '[X]'} days
Survey Objection Period: ${terms.surveyObjectionPeriodDays || '[X]'} days
Title Cure Period: ${terms.titleCurePeriodDays || '[X]'} days
Title Insurance: ${terms.titleInsuranceAmount || 'Equal to Purchase Price'}

Reps Survival: ${terms.repsSurvivalMonths || '[X]'} months
Reps Cap: ${terms.repsCap || 'N/A'}
Reps Basket: ${terms.repsBasket || 'N/A'}

Special Conditions: ${Array.isArray(terms.specialConditions) ? terms.specialConditions.join('; ') : 'None'}

## REQUIRED SECTIONS

${template.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## INSTRUCTIONS

Generate a complete ${template.name} document with all required sections.
Use standard legal language appropriate for a commercial real estate transaction.
Include proper definitions, cross-references, and legal boilerplate.
Use [BRACKETS] for any missing information that needs to be filled in.
Format with clear section headers and numbered paragraphs.

${customInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}` : ''}

Generate the full document now:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      config: {
        temperature: 0.3,
        maxOutputTokens: 16000,
      }
    });

    let responseText = '';
    if ((response as any).text) {
      responseText = (response as any).text;
    } else if ((response as any).candidates?.length) {
      for (const candidate of (response as any).candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text) {
              responseText += part.text;
            }
          }
        }
      }
    }

    return responseText;
  }

  async getGeneratedDocuments(dealId: string): Promise<GeneratedDocument[]> {
    return await db.query.generatedDocuments.findMany({
      where: eq(generatedDocuments.dealId, dealId),
      orderBy: (docs, { desc }) => [desc(docs.generatedAt)],
    });
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | null> {
    const result = await db.query.generatedDocuments.findFirst({
      where: eq(generatedDocuments.id, id),
    });
    return result || null;
  }

  async updateDocumentStatus(id: string, status: string): Promise<GeneratedDocument> {
    const [updated] = await db.update(generatedDocuments)
      .set({ status, updatedAt: new Date() })
      .where(eq(generatedDocuments.id, id))
      .returning();
    return updated;
  }

  getAvailableDocumentTypes(): { id: string; name: string; sections: string[] }[] {
    return Object.entries(DOCUMENT_TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      sections: template.sections,
    }));
  }
}

export const documentGenerationService = new DocumentGenerationService();
