import { Router } from "express";
import { db } from "../db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";
import { generateClosingStatementPDF } from "../services/closing-pdf-service";
import { ObjectStorageService } from "../objectStorage";

const router = Router();
router.use(isAuthenticated);

const closingTransactionTypeLabels: Record<string, string> = {
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
};

function parseAmount(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,$\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
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

type ProrationInput = {
  annualAmount: string | null;
  periodStartDate: string | null;
  periodEndDate: string | null;
  prorateDate: string | null;
  method?: string | null;
};

function computeProration(proration: ProrationInput) {
  const annual = parseAmount(proration.annualAmount);
  if (!annual || !proration.periodStartDate || !proration.periodEndDate || !proration.prorateDate) {
    return { dailyRate: "0", buyerCredit: "0", sellerCredit: "0", daysInPeriod: 0, buyerDays: 0, sellerDays: 0 };
  }

  const start = new Date(proration.periodStartDate);
  const end = new Date(proration.periodEndDate);
  const prorate = new Date(proration.prorateDate);

  const daysInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyRate = annual / (proration.method === "calendar_day" ? 365 : 360);
  const rawSellerDays = Math.ceil((prorate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const sellerDays = Math.max(0, Math.min(rawSellerDays, daysInPeriod));
  const buyerDays = Math.max(0, daysInPeriod - sellerDays);

  const sellerShare = dailyRate * sellerDays;
  const buyerShare = dailyRate * buyerDays;

  return {
    dailyRate: dailyRate.toFixed(4),
    buyerCredit: buyerShare.toFixed(2),
    sellerCredit: sellerShare.toFixed(2),
    daysInPeriod,
    buyerDays,
    sellerDays,
  };
}

router.get("/deals/:dealId/closings", async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const closings = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.dealId, dealId))
      .orderBy(desc(schema.closingTransactions.createdAt));

    res.json(closings);
  } catch (error: any) {
    console.error("Error fetching closings:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:id", async (req: any, res) => {
  try {
    const [closing] = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, req.params.id));
    if (!closing) return res.status(404).json({ message: "Closing not found" });
    res.json(closing);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/deals/:dealId/closings", async (req: any, res) => {
  try {
    const { dealId } = req.params;
    const body = { ...req.body, dealId };

    const [closing] = await db.insert(schema.closingTransactions).values({
      dealId,
      transactionType: body.transactionType,
      title: body.title || closingTransactionTypeLabels[body.transactionType] || "New Closing",
      status: body.status || "draft",
      fileNumber: body.fileNumber,
      closingDate: body.closingDate,
      disbursementDate: body.disbursementDate,
      propertyAddress: body.propertyAddress,
      purchasePrice: body.purchasePrice,
      loanAmount: body.loanAmount,
      earnestMoney: body.earnestMoney,
      notes: body.notes,
      createdBy: req.user?.id,
    }).returning();

    if (body.autoPopulate) {
      const [terms] = await db.select().from(schema.dealTerms)
        .where(eq(schema.dealTerms.dealId, dealId));

      if (terms) {
        const parties: schema.InsertClosingParty[] = [];
        if (terms.buyerName) {
          parties.push({
            closingId: closing.id,
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
            closingId: closing.id,
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
            closingId: closing.id,
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
            closingId: closing.id,
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
            closingId: closing.id,
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
          await recomputeClosingBalance(closing.id);
        }

        if (terms.propertyAddress || terms.purchasePrice) {
          await db.update(schema.closingTransactions)
            .set({
              propertyAddress: terms.propertyAddress ? [terms.propertyAddress, terms.propertyCity, terms.propertyState, terms.propertyZip].filter(Boolean).join(", ") : closing.propertyAddress,
              purchasePrice: terms.purchasePrice || closing.purchasePrice,
              closingDate: terms.closingDate || closing.closingDate,
            })
            .where(eq(schema.closingTransactions.id, closing.id));
        }
      }
    }

    const [result] = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, closing.id));
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error creating closing:", error);
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closings/:id", async (req: any, res) => {
  try {
    const updates: any = { ...req.body, updatedAt: new Date() };
    delete updates.id;
    delete updates.createdAt;
    delete updates.dealId;

    const [closing] = await db.update(schema.closingTransactions)
      .set(updates)
      .where(eq(schema.closingTransactions.id, req.params.id))
      .returning();
    if (!closing) return res.status(404).json({ message: "Closing not found" });
    res.json(closing);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closings/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:id/summary", async (req: any, res) => {
  try {
    const closingId = req.params.id;

    const [closing] = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, closingId));
    if (!closing) return res.status(404).json({ message: "Closing not found" });

    const lineItems = await db.select().from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.closingId, closingId))
      .orderBy(asc(schema.closingLineItems.sortOrder));

    const parties = await db.select().from(schema.closingParties)
      .where(eq(schema.closingParties.closingId, closingId));

    const prorations = await db.select().from(schema.closingProrations)
      .where(eq(schema.closingProrations.closingId, closingId));

    const escrows = await db.select().from(schema.closingEscrows)
      .where(eq(schema.closingEscrows.closingId, closingId));

    const payoffs = await db.select().from(schema.closingPayoffs)
      .where(eq(schema.closingPayoffs.closingId, closingId));

    const commissions = await db.select().from(schema.closingCommissions)
      .where(eq(schema.closingCommissions.closingId, closingId));

    const wires = await db.select().from(schema.closingWires)
      .where(eq(schema.closingWires.closingId, closingId));

    const computedProrations = prorations.map(p => ({
      ...p,
      computed: computeProration(p),
    }));

    const balance = computeBalance(lineItems);

    let totalPayoffs = 0;
    for (const p of payoffs) totalPayoffs += parseAmount(p.totalPayoff);

    let totalCommissions = 0;
    for (const c of commissions) totalCommissions += parseAmount(c.amount);

    let totalEscrows = 0;
    for (const e of escrows) totalEscrows += parseAmount(e.amount);

    let totalWires = 0;
    for (const w of wires) totalWires += parseAmount(w.amount);

    const groupedLineItems: Record<string, schema.ClosingLineItem[]> = {};
    for (const item of lineItems) {
      const key = item.category;
      if (!groupedLineItems[key]) groupedLineItems[key] = [];
      groupedLineItems[key].push(item);
    }

    await db.update(schema.closingTransactions)
      .set({
        totalSources: balance.totalSources,
        totalUses: balance.totalUses,
        balanceValid: balance.balanceValid,
        updatedAt: new Date(),
      })
      .where(eq(schema.closingTransactions.id, closingId));

    res.json({
      closing,
      lineItems,
      groupedLineItems,
      parties,
      prorations: computedProrations,
      escrows,
      payoffs,
      commissions,
      wires,
      balance,
      totals: {
        payoffs: totalPayoffs.toFixed(2),
        commissions: totalCommissions.toFixed(2),
        escrows: totalEscrows.toFixed(2),
        wires: totalWires.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error("Error computing summary:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/line-items", async (req: any, res) => {
  try {
    const items = await db.select().from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.closingId, req.params.closingId))
      .orderBy(asc(schema.closingLineItems.sortOrder));
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/line-items", async (req: any, res) => {
  try {
    const closingId = req.params.closingId;
    const [item] = await db.insert(schema.closingLineItems).values({
      ...req.body,
      closingId,
    }).returning();
    await recomputeClosingBalance(closingId);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-line-items/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    const [item] = await db.update(schema.closingLineItems)
      .set(updates)
      .where(eq(schema.closingLineItems.id, req.params.id))
      .returning();
    if (!item) return res.status(404).json({ message: "Line item not found" });
    await recomputeClosingBalance(item.closingId);
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-line-items/:id", async (req: any, res) => {
  try {
    const [item] = await db.select({ closingId: schema.closingLineItems.closingId })
      .from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.id, req.params.id));
    await db.delete(schema.closingLineItems)
      .where(eq(schema.closingLineItems.id, req.params.id));
    if (item) await recomputeClosingBalance(item.closingId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/parties", async (req: any, res) => {
  try {
    const parties = await db.select().from(schema.closingParties)
      .where(eq(schema.closingParties.closingId, req.params.closingId));
    res.json(parties);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/parties", async (req: any, res) => {
  try {
    const [party] = await db.insert(schema.closingParties).values({
      ...req.body,
      closingId: req.params.closingId,
    }).returning();
    res.status(201).json(party);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-parties/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    const [party] = await db.update(schema.closingParties)
      .set(updates)
      .where(eq(schema.closingParties.id, req.params.id))
      .returning();
    if (!party) return res.status(404).json({ message: "Party not found" });
    res.json(party);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-parties/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingParties)
      .where(eq(schema.closingParties.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/prorations", async (req: any, res) => {
  try {
    const prorations = await db.select().from(schema.closingProrations)
      .where(eq(schema.closingProrations.closingId, req.params.closingId));
    res.json(prorations.map(p => ({ ...p, computed: computeProration(p) })));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/prorations", async (req: any, res) => {
  try {
    const data = { ...req.body, closingId: req.params.closingId };
    const computed = computeProration(data);
    const [proration] = await db.insert(schema.closingProrations).values({
      ...data,
      dailyRate: computed.dailyRate,
      buyerCredit: computed.buyerCredit,
      sellerCredit: computed.sellerCredit,
      daysInPeriod: computed.daysInPeriod,
      buyerDays: computed.buyerDays,
      sellerDays: computed.sellerDays,
    }).returning();
    res.status(201).json({ ...proration, computed });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-prorations/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    delete updates.computed;
    const merged = { ...updates };
    if (merged.annualAmount || merged.periodStartDate || merged.periodEndDate || merged.prorateDate) {
      const [existing] = await db.select().from(schema.closingProrations)
        .where(eq(schema.closingProrations.id, req.params.id));
      if (existing) {
        const full = { ...existing, ...merged };
        const computed = computeProration(full);
        merged.dailyRate = computed.dailyRate;
        merged.buyerCredit = computed.buyerCredit;
        merged.sellerCredit = computed.sellerCredit;
        merged.daysInPeriod = computed.daysInPeriod;
        merged.buyerDays = computed.buyerDays;
        merged.sellerDays = computed.sellerDays;
      }
    }
    const [proration] = await db.update(schema.closingProrations)
      .set(merged)
      .where(eq(schema.closingProrations.id, req.params.id))
      .returning();
    if (!proration) return res.status(404).json({ message: "Proration not found" });
    res.json({ ...proration, computed: computeProration(proration) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-prorations/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingProrations)
      .where(eq(schema.closingProrations.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/escrows", async (req: any, res) => {
  try {
    const escrows = await db.select().from(schema.closingEscrows)
      .where(eq(schema.closingEscrows.closingId, req.params.closingId));
    res.json(escrows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/escrows", async (req: any, res) => {
  try {
    const [escrow] = await db.insert(schema.closingEscrows).values({
      ...req.body,
      closingId: req.params.closingId,
    }).returning();
    res.status(201).json(escrow);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-escrows/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    const [escrow] = await db.update(schema.closingEscrows)
      .set(updates)
      .where(eq(schema.closingEscrows.id, req.params.id))
      .returning();
    if (!escrow) return res.status(404).json({ message: "Escrow not found" });
    res.json(escrow);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-escrows/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingEscrows)
      .where(eq(schema.closingEscrows.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/payoffs", async (req: any, res) => {
  try {
    const payoffs = await db.select().from(schema.closingPayoffs)
      .where(eq(schema.closingPayoffs.closingId, req.params.closingId));
    res.json(payoffs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/payoffs", async (req: any, res) => {
  try {
    const [payoff] = await db.insert(schema.closingPayoffs).values({
      ...req.body,
      closingId: req.params.closingId,
    }).returning();
    res.status(201).json(payoff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-payoffs/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    const [payoff] = await db.update(schema.closingPayoffs)
      .set(updates)
      .where(eq(schema.closingPayoffs.id, req.params.id))
      .returning();
    if (!payoff) return res.status(404).json({ message: "Payoff not found" });
    res.json(payoff);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-payoffs/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingPayoffs)
      .where(eq(schema.closingPayoffs.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/commissions", async (req: any, res) => {
  try {
    const commissions = await db.select().from(schema.closingCommissions)
      .where(eq(schema.closingCommissions.closingId, req.params.closingId));
    res.json(commissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/commissions", async (req: any, res) => {
  try {
    const [commission] = await db.insert(schema.closingCommissions).values({
      ...req.body,
      closingId: req.params.closingId,
    }).returning();
    res.status(201).json(commission);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-commissions/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    const [commission] = await db.update(schema.closingCommissions)
      .set(updates)
      .where(eq(schema.closingCommissions.id, req.params.id))
      .returning();
    if (!commission) return res.status(404).json({ message: "Commission not found" });
    res.json(commission);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-commissions/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingCommissions)
      .where(eq(schema.closingCommissions.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:closingId/wires", async (req: any, res) => {
  try {
    const wires = await db.select().from(schema.closingWires)
      .where(eq(schema.closingWires.closingId, req.params.closingId));
    res.json(wires);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:closingId/wires", async (req: any, res) => {
  try {
    const [wire] = await db.insert(schema.closingWires).values({
      ...req.body,
      closingId: req.params.closingId,
    }).returning();
    res.status(201).json(wire);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-wires/:id", async (req: any, res) => {
  try {
    const updates = { ...req.body };
    delete updates.id;
    delete updates.createdAt;
    delete updates.closingId;
    delete updates.sentAt;
    delete updates.confirmedAt;
    const [wire] = await db.update(schema.closingWires)
      .set(updates)
      .where(eq(schema.closingWires.id, req.params.id))
      .returning();
    if (!wire) return res.status(404).json({ message: "Wire not found" });
    res.json(wire);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/closing-wires/:id/status", async (req: any, res) => {
  try {
    const { status } = req.body;
    const updates: any = { status };
    if (status === "sent") updates.sentAt = new Date();
    if (status === "confirmed") updates.confirmedAt = new Date();

    const [wire] = await db.update(schema.closingWires)
      .set(updates)
      .where(eq(schema.closingWires.id, req.params.id))
      .returning();
    if (!wire) return res.status(404).json({ message: "Wire not found" });
    res.json(wire);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/closing-wires/:id", async (req: any, res) => {
  try {
    await db.delete(schema.closingWires)
      .where(eq(schema.closingWires.id, req.params.id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/closings/:id/pdf", async (req: any, res) => {
  try {
    const closingId = req.params.id;

    const [closing] = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, closingId));
    if (!closing) return res.status(404).json({ message: "Closing not found" });

    const lineItems = await db.select().from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.closingId, closingId))
      .orderBy(asc(schema.closingLineItems.sortOrder));

    const parties = await db.select().from(schema.closingParties)
      .where(eq(schema.closingParties.closingId, closingId));

    const prorations = await db.select().from(schema.closingProrations)
      .where(eq(schema.closingProrations.closingId, closingId));

    const escrows = await db.select().from(schema.closingEscrows)
      .where(eq(schema.closingEscrows.closingId, closingId));

    const payoffs = await db.select().from(schema.closingPayoffs)
      .where(eq(schema.closingPayoffs.closingId, closingId));

    const commissions = await db.select().from(schema.closingCommissions)
      .where(eq(schema.closingCommissions.closingId, closingId));

    const wires = await db.select().from(schema.closingWires)
      .where(eq(schema.closingWires.closingId, closingId));

    const computedProrations = prorations.map(p => ({
      ...p,
      computed: computeProration(p),
    }));

    const balance = computeBalance(lineItems);

    let totalPayoffs = 0;
    for (const p of payoffs) totalPayoffs += parseAmount(p.totalPayoff);
    let totalCommissions = 0;
    for (const c of commissions) totalCommissions += parseAmount(c.amount);
    let totalEscrows = 0;
    for (const e of escrows) totalEscrows += parseAmount(e.amount);
    let totalWires = 0;
    for (const w of wires) totalWires += parseAmount(w.amount);

    const pdfData = {
      closing,
      lineItems,
      parties,
      prorations: computedProrations,
      escrows,
      payoffs,
      commissions,
      wires,
      balance,
      totals: {
        payoffs: totalPayoffs.toFixed(2),
        commissions: totalCommissions.toFixed(2),
        escrows: totalEscrows.toFixed(2),
        wires: totalWires.toFixed(2),
      },
    };

    const doc = generateClosingStatementPDF(pdfData);

    const filename = `${(closing.title || "Closing-Statement").replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-")}-${closingId.slice(0, 8)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    const disposition = req.query.inline === "1" ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (error: any) {
    console.error("Error generating closing PDF:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/closings/:id/save-to-data-room", async (req: any, res) => {
  try {
    const closingId = req.params.id;

    const [closing] = await db.select().from(schema.closingTransactions)
      .where(eq(schema.closingTransactions.id, closingId));
    if (!closing) return res.status(404).json({ message: "Closing not found" });

    const [dataRoom] = await db.select().from(schema.dataRooms)
      .where(eq(schema.dataRooms.dealId, closing.dealId));
    if (!dataRoom) return res.status(404).json({ message: "No data room found for this deal. Create a data room first." });

    const lineItems = await db.select().from(schema.closingLineItems)
      .where(eq(schema.closingLineItems.closingId, closingId))
      .orderBy(asc(schema.closingLineItems.sortOrder));
    const parties = await db.select().from(schema.closingParties)
      .where(eq(schema.closingParties.closingId, closingId));
    const prorations = await db.select().from(schema.closingProrations)
      .where(eq(schema.closingProrations.closingId, closingId));
    const escrows = await db.select().from(schema.closingEscrows)
      .where(eq(schema.closingEscrows.closingId, closingId));
    const payoffs = await db.select().from(schema.closingPayoffs)
      .where(eq(schema.closingPayoffs.closingId, closingId));
    const commissions = await db.select().from(schema.closingCommissions)
      .where(eq(schema.closingCommissions.closingId, closingId));
    const wires = await db.select().from(schema.closingWires)
      .where(eq(schema.closingWires.closingId, closingId));

    const computedProrations = prorations.map(p => ({ ...p, computed: computeProration(p) }));
    const balance = computeBalance(lineItems);

    let totalPayoffs = 0;
    for (const p of payoffs) totalPayoffs += parseAmount(p.totalPayoff);
    let totalCommissions = 0;
    for (const c of commissions) totalCommissions += parseAmount(c.amount);
    let totalEscrows = 0;
    for (const e of escrows) totalEscrows += parseAmount(e.amount);
    let totalWires = 0;
    for (const w of wires) totalWires += parseAmount(w.amount);

    const pdfDoc = generateClosingStatementPDF({
      closing,
      lineItems,
      parties,
      prorations: computedProrations,
      escrows,
      payoffs,
      commissions,
      wires,
      balance,
      totals: {
        payoffs: totalPayoffs.toFixed(2),
        commissions: totalCommissions.toFixed(2),
        escrows: totalEscrows.toFixed(2),
        wires: totalWires.toFixed(2),
      },
    });

    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => {
      pdfDoc.on("end", resolve);
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });
    const pdfBuffer = Buffer.concat(chunks);

    const typeLabel = closingTransactionTypeLabels[closing.transactionType] || closing.transactionType;
    const fileName = `${typeLabel} - ${closing.title || "Closing Statement"} - ${new Date().toISOString().slice(0, 10)}.pdf`;

    let storagePath: string | undefined;
    try {
      const objectStorage = new ObjectStorageService();
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const targetPath = `data-rooms/${dataRoom.id}/closing-statements/${Date.now()}_${safeName}`;
      await objectStorage.uploadBuffer(targetPath, pdfBuffer, "application/pdf");
      storagePath = targetPath;
    } catch (storageErr: any) {
      console.warn("[SaveToDataRoom] Object storage upload failed, document record will be created without storage path:", storageErr.message);
    }

    const [document] = await db.insert(schema.dataRoomDocuments).values({
      dataRoomId: dataRoom.id,
      fileName,
      fileSize: pdfBuffer.length,
      fileType: "application/pdf",
      storagePath: storagePath || null,
      description: `Generated ${typeLabel} for closing "${closing.title}"`,
      documentCategory: "closing_statement",
      tags: ["closing", "generated", closing.transactionType],
      uploadedBy: req.user?.id,
      metadata: { closingId, transactionType: closing.transactionType, generatedAt: new Date().toISOString() },
    }).returning();

    res.json({
      success: true,
      documentId: document.id,
      fileName,
      dataRoomId: dataRoom.id,
      message: `Closing statement saved to data room "${dataRoom.name}"`,
    });
  } catch (error: any) {
    console.error("Error saving closing PDF to data room:", error);
    res.status(500).json({ message: error.message });
  }
});

export function registerClosingRoutes(app: any) {
  app.use("/api", router);
}

export default router;