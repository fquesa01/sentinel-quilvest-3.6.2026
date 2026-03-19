import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

type TransactionType = (typeof schema.closingTransactionTypeEnum.enumValues)[number];

interface DealSettings {
  dealTypeConfirmed?: boolean;
  detectedDealType?: string;
  detectedConfidence?: number;
  detectedReason?: string;
  detectedAt?: string;
  detectedFromDocument?: string;
  [key: string]: unknown;
}

interface ClosingFieldUpdates {
  propertyAddress?: string;
  purchasePrice?: string;
  closingDate?: string;
  updatedAt?: Date;
}

interface PartyFieldUpdates {
  name?: string;
  entityType?: string;
  address?: string;
  signerName?: string;
  signerTitle?: string;
  email?: string;
}

const DEAL_TYPE_TO_CLOSING_TYPE: Record<string, TransactionType> = {
  residential_financed: "closing_disclosure",
  residential_cash: "cash_settlement",
  refinance: "closing_disclosure",
  heloc: "closing_disclosure",
  reverse_mortgage: "closing_disclosure",
  new_construction: "closing_disclosure",
  short_sale: "closing_disclosure",
  foreclosure_reo: "closing_disclosure",
  estate_probate: "cash_settlement",
  commercial_financed: "hud1",
  commercial_cash: "cash_settlement",
  commercial_refinance: "hud1",
  cmbs: "cmbs_funding_memo",
  construction_loan: "construction_sources_uses",
  ground_lease: "ground_lease_closing",
  exchange_1031: "1031_exchange",
  portfolio_bulk: "portfolio_settlement",
  sale_leaseback: "alta_combined",
  distressed_asset: "hud1",
  co_op: "cash_settlement",
  mixed_use: "hud1",
  opportunity_zone: "sources_and_uses",
  loan_assumption: "hud1",
  deed_in_lieu: "cash_settlement",
  capital_stack: "capital_stack",
  reit_contribution: "reit_contribution",
  condo_subdivision: "hud1",
  leasehold_financing: "hud1",
  real_estate: "alta_combined",
  debt: "lender_funding",
  equity: "sources_and_uses",
  investment: "sources_and_uses",
  ma_asset_purchase: "sources_and_uses",
  ma_stock_purchase: "sources_and_uses",
  ma_asset: "sources_and_uses",
  ma_stock: "sources_and_uses",
  ma_merger: "sources_and_uses",
  merger: "sources_and_uses",
  financing_debt: "lender_funding",
  financing_equity: "sources_and_uses",
};

const CLOSING_TYPE_LABELS: Record<string, string> = {
  closing_disclosure: "Closing Disclosure",
  seller_closing_disclosure: "Seller Closing Disclosure",
  hud1: "HUD-1",
  hud1a: "HUD-1A",
  cash_settlement: "Cash Settlement Statement",
  alta_combined: "ALTA Combined",
  alta_buyer: "ALTA Buyer Statement",
  alta_seller: "ALTA Seller Statement",
  sources_and_uses: "Sources & Uses",
  lender_funding: "Lender Funding Sheet",
  funds_flow: "Funds Flow",
  construction_sources_uses: "Construction Sources & Uses",
  construction_draw: "Construction Draw Schedule",
  cmbs_funding_memo: "CMBS Funding Memo",
  capital_stack: "Capital Stack",
  investor_waterfall: "Investor Waterfall",
  "1031_exchange": "1031 Exchange",
  qi_statement: "QI Statement",
  portfolio_settlement: "Portfolio Settlement",
  ground_lease_closing: "Ground Lease Closing",
  master_closing: "Master Closing Statement",
  reit_contribution: "REIT Contribution",
};

const DEFAULT_CLOSING_TYPE: TransactionType = "alta_combined";

export function mapDealTypeToClosingType(dealType: string | null | undefined): TransactionType {
  if (!dealType) return DEFAULT_CLOSING_TYPE;
  const normalized = dealType.replace(/-/g, "_");
  return DEAL_TYPE_TO_CLOSING_TYPE[normalized] || DEFAULT_CLOSING_TYPE;
}

function parseAmount(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,$\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function computeBalance(lineItems: schema.ClosingLineItem[]) {
  let totalSources = 0;
  let totalUses = 0;
  for (const item of lineItems) {
    const amt = parseAmount(item.amount);
    if (item.side === "source" || item.side === "buyer_credit" || item.side === "seller_credit") {
      totalSources += amt;
    } else {
      totalUses += amt;
    }
  }
  return {
    totalSources: totalSources.toFixed(2),
    totalUses: totalUses.toFixed(2),
    difference: (totalSources - totalUses).toFixed(2),
    balanceValid: Math.abs(totalSources - totalUses) < 0.01,
  };
}

async function recomputeClosingBalance(closingId: string) {
  const lineItems = await db.select().from(schema.closingLineItems)
    .where(eq(schema.closingLineItems.closingId, closingId));
  const balance = computeBalance(lineItems);
  await db.update(schema.closingTransactions)
    .set({
      totalSources: balance.totalSources,
      totalUses: balance.totalUses,
      balanceValid: balance.balanceValid,
      updatedAt: new Date(),
    })
    .where(eq(schema.closingTransactions.id, closingId));
  return balance;
}

export async function autoGenerateClosingStatement(dealId: string): Promise<void> {
  try {
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, dealId));
    if (!deal) {
      console.log(`[ClosingAutoGen] Deal ${dealId} not found`);
      return;
    }

    let dealType = deal.dealType;
    const settings = (deal.settings || {}) as DealSettings;
    if (!dealType && settings.detectedDealType) {
      const confidence = settings.detectedConfidence ?? 0;
      if (confidence < 0.7) {
        console.log(`[ClosingAutoGen] Detected deal type "${settings.detectedDealType}" has low confidence (${confidence}), skipping`);
        return;
      }
      dealType = settings.detectedDealType;
    }

    if (!dealType) {
      console.log(`[ClosingAutoGen] Deal "${deal.title}" has no deal type classified yet, skipping`);
      return;
    }

    const closingType = mapDealTypeToClosingType(dealType);

    const existingAutoGenerated = await db.select({ id: schema.closingTransactions.id })
      .from(schema.closingTransactions)
      .where(and(
        eq(schema.closingTransactions.dealId, dealId),
        eq(schema.closingTransactions.autoGenerated, true)
      ));

    if (existingAutoGenerated.length > 0) {
      console.log(`[ClosingAutoGen] Deal ${dealId} already has an auto-generated closing, skipping creation`);
      return;
    }

    const title = CLOSING_TYPE_LABELS[closingType] || "Closing Statement";

    let closing;
    try {
      [closing] = await db.insert(schema.closingTransactions).values({
        dealId,
        transactionType: closingType,
        title,
        status: "draft",
        autoGenerated: true,
      }).returning();
    } catch (insertErr: unknown) {
      const recheck = await db.select({ id: schema.closingTransactions.id })
        .from(schema.closingTransactions)
        .where(and(
          eq(schema.closingTransactions.dealId, dealId),
          eq(schema.closingTransactions.autoGenerated, true)
        ));
      if (recheck.length > 0) {
        console.log(`[ClosingAutoGen] Concurrent creation detected for deal ${dealId}, skipping`);
        return;
      }
      throw insertErr;
    }

    console.log(`[ClosingAutoGen] Created auto-generated closing "${title}" (${closingType}) for deal "${deal.title}"`);

    const [terms] = await db.select().from(schema.dealTerms)
      .where(eq(schema.dealTerms.dealId, dealId));

    if (terms) {
      await populateClosingFromTerms(closing.id, terms);
    }

    console.log(`[ClosingAutoGen] Auto-generation complete for deal "${deal.title}"`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[ClosingAutoGen] Error auto-generating closing for deal ${dealId}:`, msg);
  }
}

async function populateClosingFromTerms(closingId: string, terms: schema.DealTerms): Promise<void> {
  const parties: schema.InsertClosingParty[] = [];
  if (terms.buyerName) {
    parties.push({
      closingId,
      role: "buyer",
      name: terms.buyerName,
      entityType: terms.buyerEntityType || undefined,
      address: terms.buyerAddress || undefined,
      signerName: terms.buyerSignerName || undefined,
      signerTitle: terms.buyerSignerTitle || undefined,
    });
  }
  if (terms.sellerName) {
    parties.push({
      closingId,
      role: "seller",
      name: terms.sellerName,
      entityType: terms.sellerEntityType || undefined,
      address: terms.sellerAddress || undefined,
      signerName: terms.sellerSignerName || undefined,
      signerTitle: terms.sellerSignerTitle || undefined,
    });
  }
  if (terms.escrowAgentName) {
    parties.push({
      closingId,
      role: "escrow_agent",
      name: terms.escrowAgentName,
      address: terms.escrowAgentAddress || undefined,
      email: terms.escrowAgentEmail || undefined,
    });
  }
  if (parties.length > 0) {
    await db.insert(schema.closingParties).values(parties);
  }

  const lineItems: schema.InsertClosingLineItem[] = [];
  if (terms.purchasePrice) {
    lineItems.push({
      closingId,
      lineNumber: 100,
      category: "purchase_price",
      side: "use",
      description: "Contract Sales Price",
      amount: terms.purchasePrice,
      sortOrder: 1,
    });
  }
  if (terms.initialDeposit) {
    lineItems.push({
      closingId,
      lineNumber: 201,
      category: "earnest_money",
      side: "source",
      description: "Earnest Money Deposit",
      amount: terms.initialDeposit,
      sortOrder: 2,
    });
  }
  if (lineItems.length > 0) {
    await db.insert(schema.closingLineItems).values(lineItems);
    await recomputeClosingBalance(closingId);
  }

  const propertyAddress = terms.propertyAddress
    ? [terms.propertyAddress, terms.propertyCity, terms.propertyState, terms.propertyZip].filter(Boolean).join(", ")
    : null;

  if (propertyAddress || terms.purchasePrice || terms.closingDate) {
    await db.update(schema.closingTransactions)
      .set({
        propertyAddress: propertyAddress || undefined,
        purchasePrice: terms.purchasePrice || undefined,
        closingDate: terms.closingDate || undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.closingTransactions.id, closingId));
  }
}

export async function autoUpdateClosingStatement(dealId: string): Promise<void> {
  try {
    const [autoClosing] = await db.select()
      .from(schema.closingTransactions)
      .where(and(
        eq(schema.closingTransactions.dealId, dealId),
        eq(schema.closingTransactions.autoGenerated, true)
      ));

    if (!autoClosing) return;

    const [terms] = await db.select().from(schema.dealTerms)
      .where(eq(schema.dealTerms.dealId, dealId));

    if (!terms) return;

    const updates: ClosingFieldUpdates = {};
    const propertyAddress = terms.propertyAddress
      ? [terms.propertyAddress, terms.propertyCity, terms.propertyState, terms.propertyZip].filter(Boolean).join(", ")
      : null;

    if (propertyAddress && propertyAddress !== autoClosing.propertyAddress) {
      updates.propertyAddress = propertyAddress;
    }
    if (terms.purchasePrice && terms.purchasePrice !== autoClosing.purchasePrice) {
      updates.purchasePrice = terms.purchasePrice;
    }
    if (terms.closingDate && terms.closingDate !== autoClosing.closingDate) {
      updates.closingDate = terms.closingDate;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(schema.closingTransactions)
        .set(updates)
        .where(eq(schema.closingTransactions.id, autoClosing.id));
      console.log(`[ClosingAutoGen] Updated auto-generated closing for deal ${dealId}: ${Object.keys(updates).filter(k => k !== 'updatedAt').join(', ')}`);
    }

    const existingParties = await db.select()
      .from(schema.closingParties)
      .where(eq(schema.closingParties.closingId, autoClosing.id));
    const existingByRole = new Map(existingParties.map(p => [p.role, p]));

    if (terms.buyerName) {
      const existing = existingByRole.get("buyer");
      if (existing) {
        const partyUpdates: PartyFieldUpdates = {};
        if (terms.buyerName !== existing.name) partyUpdates.name = terms.buyerName;
        if (terms.buyerEntityType && terms.buyerEntityType !== existing.entityType) partyUpdates.entityType = terms.buyerEntityType;
        if (terms.buyerAddress && terms.buyerAddress !== existing.address) partyUpdates.address = terms.buyerAddress;
        if (terms.buyerSignerName && terms.buyerSignerName !== existing.signerName) partyUpdates.signerName = terms.buyerSignerName;
        if (terms.buyerSignerTitle && terms.buyerSignerTitle !== existing.signerTitle) partyUpdates.signerTitle = terms.buyerSignerTitle;
        if (Object.keys(partyUpdates).length > 0) {
          await db.update(schema.closingParties).set(partyUpdates).where(eq(schema.closingParties.id, existing.id));
        }
      } else {
        await db.insert(schema.closingParties).values({
          closingId: autoClosing.id,
          role: "buyer",
          name: terms.buyerName,
          entityType: terms.buyerEntityType || undefined,
          address: terms.buyerAddress || undefined,
          signerName: terms.buyerSignerName || undefined,
          signerTitle: terms.buyerSignerTitle || undefined,
        });
      }
    }
    if (terms.sellerName) {
      const existing = existingByRole.get("seller");
      if (existing) {
        const partyUpdates: PartyFieldUpdates = {};
        if (terms.sellerName !== existing.name) partyUpdates.name = terms.sellerName;
        if (terms.sellerEntityType && terms.sellerEntityType !== existing.entityType) partyUpdates.entityType = terms.sellerEntityType;
        if (terms.sellerAddress && terms.sellerAddress !== existing.address) partyUpdates.address = terms.sellerAddress;
        if (terms.sellerSignerName && terms.sellerSignerName !== existing.signerName) partyUpdates.signerName = terms.sellerSignerName;
        if (terms.sellerSignerTitle && terms.sellerSignerTitle !== existing.signerTitle) partyUpdates.signerTitle = terms.sellerSignerTitle;
        if (Object.keys(partyUpdates).length > 0) {
          await db.update(schema.closingParties).set(partyUpdates).where(eq(schema.closingParties.id, existing.id));
        }
      } else {
        await db.insert(schema.closingParties).values({
          closingId: autoClosing.id,
          role: "seller",
          name: terms.sellerName,
          entityType: terms.sellerEntityType || undefined,
          address: terms.sellerAddress || undefined,
          signerName: terms.sellerSignerName || undefined,
          signerTitle: terms.sellerSignerTitle || undefined,
        });
      }
    }
    if (terms.escrowAgentName) {
      const existing = existingByRole.get("escrow_agent");
      if (existing) {
        const partyUpdates: PartyFieldUpdates = {};
        if (terms.escrowAgentName !== existing.name) partyUpdates.name = terms.escrowAgentName;
        if (terms.escrowAgentAddress && terms.escrowAgentAddress !== existing.address) partyUpdates.address = terms.escrowAgentAddress;
        if (terms.escrowAgentEmail && terms.escrowAgentEmail !== existing.email) partyUpdates.email = terms.escrowAgentEmail;
        if (Object.keys(partyUpdates).length > 0) {
          await db.update(schema.closingParties).set(partyUpdates).where(eq(schema.closingParties.id, existing.id));
        }
      } else {
        await db.insert(schema.closingParties).values({
          closingId: autoClosing.id,
          role: "escrow_agent",
          name: terms.escrowAgentName,
          address: terms.escrowAgentAddress || undefined,
          email: terms.escrowAgentEmail || undefined,
        });
      }
    }

    const existingLineItems = await db.select()
      .from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.closingId, autoClosing.id));
    const existingCategories = new Set(existingLineItems.map(li => li.category));

    const newLineItems: schema.InsertClosingLineItem[] = [];
    if (terms.purchasePrice && !existingCategories.has("purchase_price")) {
      newLineItems.push({
        closingId: autoClosing.id,
        lineNumber: 100,
        category: "purchase_price",
        side: "use",
        description: "Contract Sales Price",
        amount: terms.purchasePrice,
        sortOrder: 1,
      });
    }
    if (terms.initialDeposit && !existingCategories.has("earnest_money")) {
      newLineItems.push({
        closingId: autoClosing.id,
        lineNumber: 201,
        category: "earnest_money",
        side: "source",
        description: "Earnest Money Deposit",
        amount: terms.initialDeposit,
        sortOrder: 2,
      });
    }
    if (newLineItems.length > 0) {
      await db.insert(schema.closingLineItems).values(newLineItems);
      await recomputeClosingBalance(autoClosing.id);
      console.log(`[ClosingAutoGen] Added ${newLineItems.length} new line items to auto-generated closing`);
    }

    let needsRebalance = false;
    if (existingCategories.has("purchase_price") && terms.purchasePrice) {
      const [existingPP] = existingLineItems.filter(li => li.category === "purchase_price");
      if (existingPP && existingPP.amount !== terms.purchasePrice) {
        await db.update(schema.closingLineItems)
          .set({ amount: terms.purchasePrice })
          .where(eq(schema.closingLineItems.id, existingPP.id));
        needsRebalance = true;
        console.log(`[ClosingAutoGen] Updated purchase price line item`);
      }
    }
    if (existingCategories.has("earnest_money") && terms.initialDeposit) {
      const [existingEM] = existingLineItems.filter(li => li.category === "earnest_money");
      if (existingEM && existingEM.amount !== terms.initialDeposit) {
        await db.update(schema.closingLineItems)
          .set({ amount: terms.initialDeposit })
          .where(eq(schema.closingLineItems.id, existingEM.id));
        needsRebalance = true;
        console.log(`[ClosingAutoGen] Updated earnest money line item`);
      }
    }
    if (needsRebalance) {
      await recomputeClosingBalance(autoClosing.id);
    }

    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, dealId));
    if (deal) {
      let dealType = deal.dealType;
      const settings = (deal.settings || {}) as DealSettings;
      if (!dealType && settings.detectedDealType) {
        dealType = settings.detectedDealType;
      }
      if (dealType) {
        const newClosingType = mapDealTypeToClosingType(dealType);
        if (newClosingType !== autoClosing.transactionType) {
          console.log(`[ClosingAutoGen] Deal type changed from ${autoClosing.transactionType} to ${newClosingType} for deal "${deal.title}". Creating new statement.`);

          await db.update(schema.closingTransactions)
            .set({ autoGenerated: false, updatedAt: new Date() })
            .where(eq(schema.closingTransactions.id, autoClosing.id));

          const newTitle = CLOSING_TYPE_LABELS[newClosingType] || "Closing Statement";
          const [newClosing] = await db.insert(schema.closingTransactions).values({
            dealId,
            transactionType: newClosingType,
            title: newTitle,
            status: "draft",
            autoGenerated: true,
          }).returning();

          await populateClosingFromTerms(newClosing.id, terms);
        }
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[ClosingAutoGen] Error updating closing for deal ${dealId}:`, msg);
  }
}
