import { Router } from "express";
import { db } from "./db";
import { 
  ddTransactionTypes,
  ddIndustrySectors,
  ddChecklistSections,
  ddChecklistItemsMaster,
  ddIndustryChecklistItems,
  ddTransactionTypeChecklistItems,
  ddChecklistTemplates,
  ddChecklistTemplateItems,
  ddDealChecklists,
  ddDealChecklistItems,
  insertDDChecklistTemplateSchema,
  insertDDDealChecklistSchema,
} from "@shared/schema";
import { eq, asc, and, or, isNull } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";

const router = Router();

// ========== TRANSACTION TYPES ==========
router.get("/transaction-types", isAuthenticated, async (req, res) => {
  try {
    const types = await db.select().from(ddTransactionTypes)
      .where(eq(ddTransactionTypes.isActive, true))
      .orderBy(asc(ddTransactionTypes.displayOrder));
    
    const grouped = types.reduce((acc, type) => {
      if (!acc[type.category]) acc[type.category] = [];
      acc[type.category].push(type);
      return acc;
    }, {} as Record<string, typeof types>);
    
    res.json({ transactionTypes: types, grouped });
  } catch (error) {
    console.error("Error fetching transaction types:", error);
    res.status(500).json({ error: "Failed to fetch transaction types" });
  }
});

// ========== INDUSTRY SECTORS ==========
router.get("/industry-sectors", isAuthenticated, async (req, res) => {
  try {
    const sectors = await db.select().from(ddIndustrySectors)
      .where(eq(ddIndustrySectors.isActive, true))
      .orderBy(asc(ddIndustrySectors.displayOrder));
    
    const parents = sectors.filter(s => !s.parentSectorId);
    const children = sectors.filter(s => s.parentSectorId);
    
    const hierarchy = parents.map(parent => ({
      ...parent,
      children: children.filter(c => c.parentSectorId === parent.id)
    }));
    
    res.json({ sectors: hierarchy });
  } catch (error) {
    console.error("Error fetching industry sectors:", error);
    res.status(500).json({ error: "Failed to fetch industry sectors" });
  }
});

// ========== CHECKLIST SECTIONS ==========
router.get("/checklist-sections", isAuthenticated, async (req, res) => {
  try {
    const sections = await db.select().from(ddChecklistSections)
      .where(eq(ddChecklistSections.isActive, true))
      .orderBy(asc(ddChecklistSections.displayOrder));
    
    res.json({ sections });
  } catch (error) {
    console.error("Error fetching checklist sections:", error);
    res.status(500).json({ error: "Failed to fetch sections" });
  }
});

// ========== GET CHECKLIST ITEMS BY SECTION ==========
router.get("/checklist-items", isAuthenticated, async (req, res) => {
  try {
    const { sectionId, industrySectorId } = req.query;
    
    let items = await db.select().from(ddChecklistItemsMaster)
      .where(
        sectionId 
          ? and(
              eq(ddChecklistItemsMaster.sectionId, sectionId as string),
              eq(ddChecklistItemsMaster.isDefault, true)
            )
          : eq(ddChecklistItemsMaster.isDefault, true)
      );
    
    if (industrySectorId) {
      const industryItems = await db.select({
        item: ddChecklistItemsMaster,
        mapping: ddIndustryChecklistItems
      })
      .from(ddIndustryChecklistItems)
      .innerJoin(ddChecklistItemsMaster, eq(ddIndustryChecklistItems.checklistItemId, ddChecklistItemsMaster.id))
      .where(eq(ddIndustryChecklistItems.industrySectorId, industrySectorId as string));
      
      const industryItemIds = new Set(industryItems.map(i => i.item.id));
      items = [
        ...items.filter(i => !industryItemIds.has(i.id)),
        ...industryItems.map(i => ({ ...i.item, isRequired: i.mapping.isRequired }))
      ];
    }
    
    res.json({ items });
  } catch (error) {
    console.error("Error fetching checklist items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// ========== BUILD CHECKLIST FOR CONFIGURATION ==========
router.post("/build-checklist", isAuthenticated, async (req, res) => {
  try {
    const { transactionTypeId, industrySectorId, includeLiveSearch = true } = req.body;
    
    let sections = await db.select().from(ddChecklistSections)
      .where(eq(ddChecklistSections.isActive, true))
      .orderBy(asc(ddChecklistSections.displayOrder));
    
    if (!includeLiveSearch) {
      sections = sections.filter(s => !s.isLiveSearch);
    }
    
    const items = await db.select().from(ddChecklistItemsMaster)
      .where(eq(ddChecklistItemsMaster.isDefault, true));
    
    let industryItems: { item: typeof ddChecklistItemsMaster.$inferSelect; mapping: typeof ddIndustryChecklistItems.$inferSelect }[] = [];
    if (industrySectorId) {
      industryItems = await db.select({
        item: ddChecklistItemsMaster,
        mapping: ddIndustryChecklistItems
      })
      .from(ddIndustryChecklistItems)
      .innerJoin(ddChecklistItemsMaster, eq(ddIndustryChecklistItems.checklistItemId, ddChecklistItemsMaster.id))
      .where(eq(ddIndustryChecklistItems.industrySectorId, industrySectorId));
    }
    
    const result = sections.map(section => {
      const sectionItems = items.filter(i => i.sectionId === section.id);
      const sectionIndustryItems = industryItems
        .filter(i => i.item.sectionId === section.id)
        .map(i => ({
          ...i.item,
          isRequired: i.mapping.isRequired,
          isIndustrySpecific: true
        }));
      
      const existingItemIds = new Set(sectionItems.map(i => i.id));
      const allItems = [
        ...sectionItems.map(i => ({ ...i, isRequired: false, isIndustrySpecific: false })),
        ...sectionIndustryItems.filter(ii => !existingItemIds.has(ii.id))
      ];
      
      return {
        ...section,
        items: allItems,
        isExpanded: true
      };
    });
    
    res.json({ sections: result });
  } catch (error) {
    console.error("Error building checklist:", error);
    res.status(500).json({ error: "Failed to build checklist" });
  }
});

// ========== TEMPLATES ==========
router.get("/templates", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const templates = await db.select().from(ddChecklistTemplates)
      .where(
        or(
          eq(ddChecklistTemplates.isShared, true),
          userId ? eq(ddChecklistTemplates.createdBy, userId) : isNull(ddChecklistTemplates.createdBy)
        )
      );
    
    res.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.post("/templates", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, transactionTypeId, industrySectorId, items } = req.body;
    
    const [template] = await db.insert(ddChecklistTemplates).values({
      name,
      description,
      transactionTypeId,
      industrySectorId,
      createdBy: userId,
      isShared: false
    }).returning();
    
    if (items && items.length > 0) {
      await db.insert(ddChecklistTemplateItems).values(
        items.map((item: any, index: number) => ({
          templateId: template.id,
          sectionId: item.sectionId,
          masterItemId: item.masterItemId || null,
          customItemText: item.customItemText,
          isIncluded: item.isIncluded ?? true,
          isRequired: item.isRequired ?? false,
          displayOrder: index
        }))
      );
    }
    
    res.json({ template });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

router.get("/templates/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [template] = await db.select().from(ddChecklistTemplates)
      .where(eq(ddChecklistTemplates.id, id));
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const items = await db.select().from(ddChecklistTemplateItems)
      .where(eq(ddChecklistTemplateItems.templateId, id))
      .orderBy(asc(ddChecklistTemplateItems.displayOrder));
    
    res.json({ template, items });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

// ========== DEAL CHECKLISTS ==========
router.post("/deals/:dealId/checklists", isAuthenticated, async (req, res) => {
  try {
    const { dealId } = req.params;
    const userId = req.user?.id;
    const { templateId, transactionTypeId, industrySectorId, name, sections, sourceType = "pe_deal" } = req.body;
    
    const [checklist] = await db.insert(ddDealChecklists).values({
      dealId,
      templateId,
      transactionTypeId,
      industrySectorId,
      sourceType,
      name: name || "Due Diligence Checklist",
      createdBy: userId,
      status: "draft"
    }).returning();
    
    if (sections && sections.length > 0) {
      const itemsToInsert = sections.flatMap((section: any) => 
        section.items.map((item: any, index: number) => ({
          dealChecklistId: checklist.id,
          sectionId: section.id,
          masterItemId: item.id?.startsWith("custom-") ? null : item.id,
          itemText: item.text || item.itemText,
          itemDescription: item.description || item.itemDescription,
          priority: item.isRequired ? "critical" : "standard",
          status: "pending",
          displayOrder: index
        }))
      );
      
      if (itemsToInsert.length > 0) {
        await db.insert(ddDealChecklistItems).values(itemsToInsert);
      }
    }
    
    res.json({ checklist });
  } catch (error) {
    console.error("Error creating deal checklist:", error);
    res.status(500).json({ error: "Failed to create deal checklist" });
  }
});

router.get("/deals/:dealId/checklists", isAuthenticated, async (req, res) => {
  try {
    const { dealId } = req.params;
    
    const checklists = await db.select().from(ddDealChecklists)
      .where(eq(ddDealChecklists.dealId, dealId));
    
    res.json({ checklists });
  } catch (error) {
    console.error("Error fetching deal checklists:", error);
    res.status(500).json({ error: "Failed to fetch deal checklists" });
  }
});

router.get("/deals/:dealId/checklists/:checklistId", isAuthenticated, async (req, res) => {
  try {
    const { checklistId } = req.params;
    
    const [checklist] = await db.select().from(ddDealChecklists)
      .where(eq(ddDealChecklists.id, checklistId));
    
    if (!checklist) {
      return res.status(404).json({ error: "Checklist not found" });
    }
    
    const items = await db.select().from(ddDealChecklistItems)
      .where(eq(ddDealChecklistItems.dealChecklistId, checklistId))
      .orderBy(asc(ddDealChecklistItems.displayOrder));
    
    const sections = await db.select().from(ddChecklistSections)
      .orderBy(asc(ddChecklistSections.displayOrder));
    
    const groupedItems = sections.map(section => ({
      ...section,
      items: items.filter(i => i.sectionId === section.id)
    })).filter(s => s.items.length > 0);
    
    res.json({ checklist, sections: groupedItems });
  } catch (error) {
    console.error("Error fetching deal checklist:", error);
    res.status(500).json({ error: "Failed to fetch checklist" });
  }
});

router.patch("/deals/:dealId/checklists/:checklistId/items/:itemId", isAuthenticated, async (req, res) => {
  try {
    const { itemId } = req.params;
    const updates = req.body;
    
    const [updated] = await db.update(ddDealChecklistItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(ddDealChecklistItems.id, itemId))
      .returning();
    
    res.json({ item: updated });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

export default router;
