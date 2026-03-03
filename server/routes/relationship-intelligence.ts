import { Express, Request, Response } from "express";
import { isAuthenticated, requireRole } from "../replitAuth";
import { db, pool } from "../db";
import {
  relationshipContacts,
  contactSources,
  newsAlerts,
  knowledgeBaseEntries,
  outreachLog,
} from "@shared/schema";
import { eq, and, desc, ilike, or, sql, inArray } from "drizzle-orm";
import multer from "multer";
import { openai } from "../ai";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRelationshipIntelligenceRoutes(app: Express) {

  // =============================================
  // CONTACTS CRUD
  // =============================================

  const riRoles = requireRole("admin", "attorney", "compliance_officer");

  app.get("/api/relationship-intelligence/contacts", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { search, company, tag, priority, limit: limitStr, offset: offsetStr } = req.query;
      const limitVal = Math.min(parseInt(limitStr as string) || 50, 200);
      const offsetVal = parseInt(offsetStr as string) || 0;

      const conditions = [
        eq(relationshipContacts.userId, userId),
        eq(relationshipContacts.isActive, true),
      ];

      if (search) {
        conditions.push(
          or(
            ilike(relationshipContacts.fullName, `%${search}%`),
            ilike(relationshipContacts.email, `%${search}%`),
            ilike(relationshipContacts.company, `%${search}%`)
          )!
        );
      }
      if (company) {
        conditions.push(ilike(relationshipContacts.company, `%${company}%`));
      }
      if (priority) {
        conditions.push(eq(relationshipContacts.priorityLevel, parseInt(priority as string)));
      }

      const contacts = await db
        .select()
        .from(relationshipContacts)
        .where(and(...conditions))
        .orderBy(relationshipContacts.priorityLevel, desc(relationshipContacts.updatedAt))
        .limit(limitVal)
        .offset(offsetVal);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(relationshipContacts)
        .where(and(...conditions));

      res.json({ contacts, total: Number(countResult.count) });
    } catch (error: any) {
      console.error("[RI] Error fetching contacts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/relationship-intelligence/contacts/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [contact] = await db
        .select()
        .from(relationshipContacts)
        .where(and(eq(relationshipContacts.id, req.params.id), eq(relationshipContacts.userId, userId)));

      if (!contact) return res.status(404).json({ message: "Contact not found" });
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/relationship-intelligence/contacts", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, email, phone, company, jobTitle, linkedinUrl, city, state, country, tags, priorityLevel } = req.body;

      const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

      const [contact] = await db.insert(relationshipContacts).values({
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        fullName,
        email: email || null,
        phone: phone || null,
        company: company || null,
        jobTitle: jobTitle || null,
        linkedinUrl: linkedinUrl || null,
        city: city || null,
        state: state || null,
        country: country || null,
        tags: tags || [],
        priorityLevel: priorityLevel || 3,
      }).returning();

      res.status(201).json(contact);
    } catch (error: any) {
      console.error("[RI] Error creating contact:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/relationship-intelligence/contacts/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, email, phone, company, jobTitle, linkedinUrl, city, state, country, tags, priorityLevel } = req.body;

      const [existing] = await db
        .select()
        .from(relationshipContacts)
        .where(and(eq(relationshipContacts.id, req.params.id), eq(relationshipContacts.userId, userId)));
      if (!existing) return res.status(404).json({ message: "Contact not found" });

      const updates: any = { updatedAt: new Date() };
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (firstName !== undefined || lastName !== undefined) {
        const newFirst = firstName !== undefined ? firstName : existing.firstName;
        const newLast = lastName !== undefined ? lastName : existing.lastName;
        updates.fullName = [newFirst, newLast].filter(Boolean).join(" ") || existing.fullName;
      }
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (company !== undefined) updates.company = company;
      if (jobTitle !== undefined) updates.jobTitle = jobTitle;
      if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (country !== undefined) updates.country = country;
      if (tags !== undefined) updates.tags = tags;
      if (priorityLevel !== undefined) updates.priorityLevel = priorityLevel;

      const [updated] = await db
        .update(relationshipContacts)
        .set(updates)
        .where(and(eq(relationshipContacts.id, req.params.id), eq(relationshipContacts.userId, userId)))
        .returning();

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/relationship-intelligence/contacts/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [deleted] = await db
        .update(relationshipContacts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(relationshipContacts.id, req.params.id), eq(relationshipContacts.userId, userId)))
        .returning();

      if (!deleted) return res.status(404).json({ message: "Contact not found" });
      res.json({ message: "Contact deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // CSV UPLOAD
  // =============================================

  app.post("/api/relationship-intelligence/contacts/import-csv", isAuthenticated, riRoles, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!req.file) return res.status(400).json({ message: "No file provided" });

      const csvText = req.file.buffer.toString("utf-8");
      const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim());
      if (lines.length < 2) return res.status(400).json({ message: "CSV must have a header row and at least one data row" });

      const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/[^a-z_]/g, "_"));
      const headerMap: Record<string, number> = {};
      headers.forEach((h: string, i: number) => { headerMap[h] = i; });

      const getCol = (row: string[], ...keys: string[]) => {
        for (const key of keys) {
          const idx = headerMap[key];
          if (idx !== undefined && row[idx]?.trim()) return row[idx].trim();
        }
        return null;
      };

      let sourceId: string | null = null;
      const [source] = await db.insert(contactSources).values({
        userId,
        sourceType: "csv_upload",
        lastSyncedAt: new Date(),
        syncStatus: "completed",
      }).returning();
      sourceId = source.id;

      const results = { imported: 0, merged: 0, skipped: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length === 0) continue;

        const firstName = getCol(cols, "first_name", "firstname", "first") || "";
        const lastName = getCol(cols, "last_name", "lastname", "last") || "";
        const email = getCol(cols, "email", "email_address", "e_mail");
        const phone = getCol(cols, "phone", "phone_number", "telephone");
        const company = getCol(cols, "company", "organization", "company_name", "org");
        const jobTitle = getCol(cols, "title", "job_title", "position", "role");
        const city = getCol(cols, "city");
        const state = getCol(cols, "state", "province");
        const country = getCol(cols, "country");

        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        if (!fullName) { results.skipped++; continue; }

        try {
          if (email) {
            const [existing] = await db
              .select()
              .from(relationshipContacts)
              .where(and(
                eq(relationshipContacts.userId, userId),
                eq(relationshipContacts.email, email),
                eq(relationshipContacts.isActive, true)
              ));
            if (existing) {
              await db.update(relationshipContacts).set({
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName,
                fullName: fullName || existing.fullName,
                company: company || existing.company,
                jobTitle: jobTitle || existing.jobTitle,
                phone: phone || existing.phone,
                city: city || existing.city,
                state: state || existing.state,
                country: country || existing.country,
                updatedAt: new Date(),
              }).where(eq(relationshipContacts.id, existing.id));
              results.merged++;
              continue;
            }
          }

          if (company) {
            const [existing] = await db
              .select()
              .from(relationshipContacts)
              .where(and(
                eq(relationshipContacts.userId, userId),
                ilike(relationshipContacts.fullName, fullName),
                ilike(relationshipContacts.company, company),
                eq(relationshipContacts.isActive, true)
              ));
            if (existing) {
              results.merged++;
              continue;
            }
          }

          await db.insert(relationshipContacts).values({
            userId,
            sourceId,
            firstName: firstName || null,
            lastName: lastName || null,
            fullName,
            email,
            phone,
            company,
            jobTitle,
            city,
            state,
            country,
            tags: [],
            priorityLevel: 3,
          });
          results.imported++;
        } catch (err: any) {
          results.errors.push(`Row ${i + 1}: ${err.message}`);
          results.skipped++;
        }
      }

      await db.update(contactSources).set({ contactCount: results.imported + results.merged }).where(eq(contactSources.id, sourceId));

      res.json(results);
    } catch (error: any) {
      console.error("[RI] CSV import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // CONTACT SOURCES
  // =============================================

  app.get("/api/relationship-intelligence/sources", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const sources = await db.select().from(contactSources)
        .where(eq(contactSources.userId, userId))
        .orderBy(desc(contactSources.createdAt));
      res.json(sources);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // NEWS ALERTS
  // =============================================

  app.get("/api/relationship-intelligence/alerts", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { category, sentiment, contactId, unreadOnly, limit: limitStr, offset: offsetStr } = req.query;
      const limitVal = Math.min(parseInt(limitStr as string) || 50, 200);
      const offsetVal = parseInt(offsetStr as string) || 0;

      const conditions = [
        eq(newsAlerts.userId, userId),
        eq(newsAlerts.isDismissed, false),
      ];

      if (category) conditions.push(eq(newsAlerts.category, category as any));
      if (sentiment) conditions.push(eq(newsAlerts.sentiment, sentiment as any));
      if (contactId) conditions.push(eq(newsAlerts.contactId, contactId as string));
      if (unreadOnly === "true") conditions.push(eq(newsAlerts.isRead, false));

      const alerts = await db
        .select({
          alert: newsAlerts,
          contact: {
            id: relationshipContacts.id,
            fullName: relationshipContacts.fullName,
            company: relationshipContacts.company,
            jobTitle: relationshipContacts.jobTitle,
            email: relationshipContacts.email,
            priorityLevel: relationshipContacts.priorityLevel,
            tags: relationshipContacts.tags,
          },
        })
        .from(newsAlerts)
        .innerJoin(relationshipContacts, eq(newsAlerts.contactId, relationshipContacts.id))
        .where(and(...conditions))
        .orderBy(desc(newsAlerts.createdAt))
        .limit(limitVal)
        .offset(offsetVal);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(newsAlerts)
        .where(and(eq(newsAlerts.userId, userId), eq(newsAlerts.isDismissed, false)));

      res.json({ alerts, total: Number(countResult.count) });
    } catch (error: any) {
      console.error("[RI] Error fetching alerts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/relationship-intelligence/alerts/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { isRead, isDismissed, isActedOn } = req.body;

      const updates: any = {};
      if (isRead !== undefined) updates.isRead = isRead;
      if (isDismissed !== undefined) updates.isDismissed = isDismissed;
      if (isActedOn !== undefined) updates.isActedOn = isActedOn;

      const [updated] = await db
        .update(newsAlerts)
        .set(updates)
        .where(and(eq(newsAlerts.id, req.params.id), eq(newsAlerts.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Alert not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // NEWS SCANNING
  // =============================================

  app.post("/api/relationship-intelligence/scan", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { contactId } = req.body;

      const newsApiKey = process.env.NEWS_API_KEY || process.env.NewsAPI_API;
      if (!newsApiKey) {
        return res.status(400).json({ message: "NEWS_API_KEY is not configured. Please add it to your environment variables." });
      }

      const sixHoursAgo = new Date(Date.now() - 6 * 3600000);

      let allContacts;
      if (contactId) {
        allContacts = await db
          .select()
          .from(relationshipContacts)
          .where(and(
            eq(relationshipContacts.id, contactId),
            eq(relationshipContacts.userId, userId),
            eq(relationshipContacts.isActive, true)
          ));
      } else {
        allContacts = await db
          .select()
          .from(relationshipContacts)
          .where(and(
            eq(relationshipContacts.userId, userId),
            eq(relationshipContacts.isActive, true)
          ))
          .orderBy(relationshipContacts.priorityLevel);
      }

      if (allContacts.length === 0) {
        return res.json({ scanned: 0, companies: 0, alertsCreated: 0, skipped: 0, message: "No contacts to scan" });
      }

      const contactsToScan = allContacts.filter(c =>
        !c.lastNewsScanAt || c.lastNewsScanAt < sixHoursAgo
      );
      const skippedCount = allContacts.length - contactsToScan.length;

      if (contactsToScan.length === 0) {
        return res.json({ scanned: 0, companies: 0, alertsCreated: 0, skipped: skippedCount, message: "All contacts were scanned within the last 6 hours" });
      }

      const companyGroups = new Map<string, typeof contactsToScan>();
      const noCompanyVIPs: typeof contactsToScan = [];

      for (const contact of contactsToScan) {
        if (contact.company && contact.company.trim()) {
          const companyKey = contact.company.trim().toLowerCase();
          if (!companyGroups.has(companyKey)) {
            companyGroups.set(companyKey, []);
          }
          companyGroups.get(companyKey)!.push(contact);
        } else if (contact.priorityLevel === 1) {
          noCompanyVIPs.push(contact);
        }
      }

      let totalAlerts = 0;
      let totalApiCalls = 0;
      const MAX_API_CALLS = 90;

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      async function fetchNewsArticles(searchQuery: string): Promise<any[]> {
        if (totalApiCalls >= MAX_API_CALLS) {
          console.log("[RI] Approaching API call limit, stopping further requests");
          return [];
        }
        totalApiCalls++;
        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${newsApiKey}`
          );
          const data = await response.json();
          if (data.status === "error") {
            console.error(`[RI] NewsAPI error: ${data.message}`);
            return [];
          }
          return data.articles || [];
        } catch (err) {
          console.error("[RI] NewsAPI fetch error:", err);
          return [];
        }
      }

      function contactMatchesArticle(contact: typeof contactsToScan[0], article: any): boolean {
        const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
        const nameParts = contact.fullName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
        const lastNameMatch = nameParts.length > 1 && text.includes(nameParts[nameParts.length - 1]);
        const fullNameMatch = text.includes(contact.fullName.toLowerCase());
        return fullNameMatch || lastNameMatch;
      }

      async function processArticleForContact(contact: typeof contactsToScan[0], article: any) {
        let category: string = "general";
        let sentiment: string = "neutral";
        let summary = article.description || article.title;

        try {
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [{
              role: "system",
              content: "You analyze news articles for relevance to specific people. Respond with JSON only."
            }, {
              role: "user",
              content: `Analyze this news article for: ${contact.fullName}${contact.company ? ` at ${contact.company}` : ""}${contact.jobTitle ? `, ${contact.jobTitle}` : ""}.

Headline: ${article.title}
Snippet: ${article.description || ""}

Respond with JSON: { "match": true/false, "confidence": 0.0-1.0, "category": "promotion|funding|acquisition|legal|award|departure|partnership|ipo|bankruptcy|regulatory|general", "sentiment": "positive|negative|neutral", "summary": "1-2 sentence summary" }`
            }],
            response_format: { type: "json_object" },
            max_completion_tokens: 200,
          });

          const analysis = JSON.parse(aiResponse.choices[0].message.content || "{}");
          if (!analysis.match || analysis.confidence <= 0.4) return false;
          category = analysis.category || "general";
          sentiment = analysis.sentiment || "neutral";
          if (analysis.summary) summary = analysis.summary;
        } catch {
        }

        const existingAlert = await db
          .select()
          .from(newsAlerts)
          .where(and(
            eq(newsAlerts.contactId, contact.id),
            eq(newsAlerts.headline, article.title || "")
          ))
          .limit(1);

        if (existingAlert.length > 0) return false;

        await db.insert(newsAlerts).values({
          contactId: contact.id,
          userId,
          headline: article.title || "News Article",
          sourceName: article.source?.name || "News",
          sourceUrl: article.url || "",
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
          summary,
          sentiment: sentiment as any,
          category: category as any,
          relevanceScore: 0.8,
        });
        return true;
      }

      console.log(`[RI] Starting scan: ${companyGroups.size} companies, ${noCompanyVIPs.length} individual VIPs, ${skippedCount} skipped (recently scanned)`);

      for (const [companyKey, contacts] of companyGroups) {
        if (totalApiCalls >= MAX_API_CALLS) break;

        const companyName = contacts[0].company!;
        const searchQuery = `"${companyName}"`;

        const articles = await fetchNewsArticles(searchQuery);
        await delay(200);

        for (const article of articles) {
          const nameMatchedContacts = contacts.filter(c => contactMatchesArticle(c, article));

          const targetContacts = nameMatchedContacts.length > 0
            ? nameMatchedContacts
            : [contacts.reduce((best, c) => c.priorityLevel < best.priorityLevel ? c : best, contacts[0])];

          for (const contact of targetContacts) {
            try {
              const created = await processArticleForContact(contact, article);
              if (created) totalAlerts++;
            } catch (err) {
              console.error(`[RI] Error processing article for ${contact.fullName}:`, err);
            }
          }
        }

        const contactIds = contacts.map(c => c.id);
        if (contactIds.length > 0) {
          await db.update(relationshipContacts)
            .set({ lastNewsScanAt: new Date() })
            .where(inArray(relationshipContacts.id, contactIds));
        }
      }

      for (const contact of noCompanyVIPs) {
        if (totalApiCalls >= MAX_API_CALLS) break;

        const searchQuery = `"${contact.fullName}"`;
        const articles = await fetchNewsArticles(searchQuery);
        await delay(200);

        for (const article of articles) {
          if (!contactMatchesArticle(contact, article)) continue;

          try {
            const created = await processArticleForContact(contact, article);
            if (created) totalAlerts++;
          } catch (err) {
            console.error(`[RI] Error processing article for VIP ${contact.fullName}:`, err);
          }
        }

        await db.update(relationshipContacts)
          .set({ lastNewsScanAt: new Date() })
          .where(eq(relationshipContacts.id, contact.id));
      }

      console.log(`[RI] Scan complete: ${contactsToScan.length} contacts, ${companyGroups.size} companies, ${totalAlerts} alerts created, ${totalApiCalls} API calls, ${skippedCount} skipped`);

      res.json({
        scanned: contactsToScan.length,
        companies: companyGroups.size,
        alertsCreated: totalAlerts,
        skipped: skippedCount,
        apiCallsUsed: totalApiCalls,
      });
    } catch (error: any) {
      console.error("[RI] Scan error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // KNOWLEDGE BASE
  // =============================================

  app.get("/api/relationship-intelligence/knowledge-base", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { search, documentType, limit: limitStr, offset: offsetStr } = req.query;
      const limitVal = Math.min(parseInt(limitStr as string) || 50, 200);
      const offsetVal = parseInt(offsetStr as string) || 0;

      const conditions = [eq(knowledgeBaseEntries.userId, userId)];

      if (search) {
        conditions.push(
          or(
            ilike(knowledgeBaseEntries.title, `%${search}%`),
            ilike(knowledgeBaseEntries.content, `%${search}%`)
          )!
        );
      }
      if (documentType) {
        conditions.push(eq(knowledgeBaseEntries.documentType, documentType as any));
      }

      const entries = await db
        .select()
        .from(knowledgeBaseEntries)
        .where(and(...conditions))
        .orderBy(desc(knowledgeBaseEntries.createdAt))
        .limit(limitVal)
        .offset(offsetVal);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(knowledgeBaseEntries)
        .where(eq(knowledgeBaseEntries.userId, userId));

      res.json({ entries, total: Number(countResult.count) });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/relationship-intelligence/knowledge-base", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { documentType, title, content, dealValue, dealDate, tags } = req.body;

      if (!content) return res.status(400).json({ message: "Content is required" });

      let summary = null;
      let entitiesMentioned: string[] = [];
      let companiesMentioned: string[] = [];
      let peopleMentioned: string[] = [];

      try {
        const extractionResponse = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [{
            role: "system",
            content: "Extract named entities from documents. Respond with JSON only."
          }, {
            role: "user",
            content: `Extract entities from this document:

Title: ${title || "Untitled"}
Content: ${content.substring(0, 4000)}

Respond with JSON: { "summary": "2-3 sentence summary", "people": ["name1","name2"], "companies": ["company1"], "entities": ["all entities including locations, deals, topics"] }`
          }],
          response_format: { type: "json_object" },
          max_completion_tokens: 500,
        });

        const extracted = JSON.parse(extractionResponse.choices[0].message.content || "{}");
        summary = extracted.summary || null;
        peopleMentioned = extracted.people || [];
        companiesMentioned = extracted.companies || [];
        entitiesMentioned = extracted.entities || [];
      } catch {
        summary = content.substring(0, 200);
      }

      const [entry] = await db.insert(knowledgeBaseEntries).values({
        userId,
        documentType: documentType || "other",
        title: title || "Untitled Document",
        content,
        summary,
        entitiesMentioned,
        companiesMentioned,
        peopleMentioned,
        dealValue: dealValue || null,
        dealDate: dealDate || null,
        tags: tags || [],
      }).returning();

      res.status(201).json(entry);
    } catch (error: any) {
      console.error("[RI] Error creating KB entry:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/relationship-intelligence/knowledge-base/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [deleted] = await db.delete(knowledgeBaseEntries)
        .where(and(eq(knowledgeBaseEntries.id, req.params.id), eq(knowledgeBaseEntries.userId, userId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Entry not found" });
      res.json({ message: "Entry deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // KNOWLEDGE BASE CONNECTION
  // =============================================

  app.post("/api/relationship-intelligence/connect", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { alertId } = req.body;

      const [alert] = await db.select().from(newsAlerts).where(and(eq(newsAlerts.id, alertId), eq(newsAlerts.userId, userId)));
      if (!alert) return res.status(404).json({ message: "Alert not found" });

      const [contact] = await db.select().from(relationshipContacts).where(eq(relationshipContacts.id, alert.contactId));
      if (!contact) return res.status(404).json({ message: "Contact not found" });

      const kbEntries = await db
        .select()
        .from(knowledgeBaseEntries)
        .where(eq(knowledgeBaseEntries.userId, userId));

      const matchedEntries: any[] = [];

      for (const entry of kbEntries) {
        const nameMatch = entry.peopleMentioned?.some(p =>
          p.toLowerCase().includes(contact.fullName.toLowerCase()) ||
          contact.fullName.toLowerCase().includes(p.toLowerCase())
        );
        const companyMatch = contact.company && entry.companiesMentioned?.some(c =>
          c.toLowerCase().includes(contact.company!.toLowerCase()) ||
          contact.company!.toLowerCase().includes(c.toLowerCase())
        );
        const contentMatch = entry.content.toLowerCase().includes(contact.fullName.toLowerCase()) ||
          (contact.company && entry.content.toLowerCase().includes(contact.company.toLowerCase()));

        if (nameMatch || companyMatch || contentMatch) {
          matchedEntries.push({
            id: entry.id,
            title: entry.title,
            documentType: entry.documentType,
            summary: entry.summary,
            relevance: nameMatch ? 1.0 : companyMatch ? 0.85 : 0.7,
            matchType: nameMatch ? "person" : companyMatch ? "company" : "content",
          });
        }
      }

      matchedEntries.sort((a, b) => b.relevance - a.relevance);
      const topMatches = matchedEntries.slice(0, 10);

      let connectionSummary = "No knowledge base connections found.";
      if (topMatches.length > 0) {
        try {
          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-5",
            messages: [{
              role: "system",
              content: "You synthesize connections between news events and historical business relationships. Be concise and actionable."
            }, {
              role: "user",
              content: `News about ${contact.fullName} (${contact.jobTitle || ""} at ${contact.company || ""}):
Headline: ${alert.headline}
Summary: ${alert.summary || ""}

Knowledge Base matches found:
${topMatches.map(m => `- ${m.title} (${m.documentType}): ${m.summary || "No summary"}`).join("\n")}

Write a 2-3 sentence connection summary explaining how this news relates to the user's history with this person/company, and suggest an outreach angle.`
            }],
            max_completion_tokens: 200,
          });
          connectionSummary = summaryResponse.choices[0].message.content || connectionSummary;
        } catch {
          connectionSummary = `Found ${topMatches.length} knowledge base connection(s) related to ${contact.fullName} and ${contact.company || "their organization"}.`;
        }
      }

      const kbConnections = {
        entries: topMatches,
        connectionSummary,
      };

      await db.update(newsAlerts).set({ knowledgeBaseConnections: kbConnections }).where(eq(newsAlerts.id, alertId));

      res.json(kbConnections);
    } catch (error: any) {
      console.error("[RI] KB connection error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // AI OUTREACH GENERATION
  // =============================================

  app.post("/api/relationship-intelligence/outreach/generate", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { alertId, contactId } = req.body;

      let alert = null;
      let contact = null;

      if (alertId) {
        [alert] = await db.select().from(newsAlerts).where(and(eq(newsAlerts.id, alertId), eq(newsAlerts.userId, userId)));
      }
      if (contactId || alert?.contactId) {
        [contact] = await db.select().from(relationshipContacts).where(eq(relationshipContacts.id, contactId || alert!.contactId));
      }

      if (!contact) return res.status(404).json({ message: "Contact not found" });

      const recentOutreach = await db
        .select()
        .from(outreachLog)
        .where(and(eq(outreachLog.contactId, contact.id), eq(outreachLog.userId, userId)))
        .orderBy(desc(outreachLog.sentAt))
        .limit(3);

      const kbConnections = alert?.knowledgeBaseConnections as any;

      const outreachResponse = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{
          role: "system",
          content: `You are a professional relationship intelligence assistant. Generate warm but professional outreach messages that reference specific shared history. Do not use emojis. Respond with JSON only.`
        }, {
          role: "user",
          content: `Generate outreach messages for:

Contact: ${contact.fullName}, ${contact.jobTitle || "Professional"} at ${contact.company || "their organization"}
Tags: ${(contact.tags || []).join(", ") || "none"}
Priority: ${contact.priorityLevel === 1 ? "VIP" : contact.priorityLevel === 2 ? "High" : "Normal"}

${alert ? `News Event:
Headline: ${alert.headline}
Summary: ${alert.summary || ""}
Category: ${alert.category || "general"}
Sentiment: ${alert.sentiment || "neutral"}` : "No specific news event — general reconnection outreach."}

${kbConnections?.entries?.length ? `Knowledge Base Connections:
${kbConnections.entries.map((e: any) => `- ${e.title} (${e.documentType}): ${e.summary || "No summary"}`).join("\n")}
Connection Summary: ${kbConnections.connectionSummary}` : "No knowledge base connections found."}

${recentOutreach.length ? `Previous Outreach:
${recentOutreach.map((o: any) => `- ${o.channel} on ${new Date(o.sentAt).toLocaleDateString()}: ${o.messageContent?.substring(0, 100)}`).join("\n")}` : "No previous outreach history."}

Generate 3 variants as JSON:
{
  "variants": [
    { "type": "short", "channel": "linkedin", "message": "2-3 sentences", "subjectLine": null, "tone": "congratulatory|informational|opportunity-seeking|supportive" },
    { "type": "medium", "channel": "email", "message": "1 paragraph", "subjectLine": "subject for email", "tone": "..." },
    { "type": "detailed", "channel": "email", "message": "2-3 paragraphs with specific references", "subjectLine": "subject for email", "tone": "..." }
  ],
  "kbConnectionUsed": "brief description of which KB connection was leveraged, or 'none'"
}`
        }],
        response_format: { type: "json_object" },
        max_completion_tokens: 1000,
      });

      const outreach = JSON.parse(outreachResponse.choices[0].message.content || "{}");
      res.json(outreach);
    } catch (error: any) {
      console.error("[RI] Outreach generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // OUTREACH LOG
  // =============================================

  app.get("/api/relationship-intelligence/outreach", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { contactId } = req.query;

      const conditions = [eq(outreachLog.userId, userId)];
      if (contactId) conditions.push(eq(outreachLog.contactId, contactId as string));

      const logs = await db
        .select()
        .from(outreachLog)
        .where(and(...conditions))
        .orderBy(desc(outreachLog.sentAt))
        .limit(50);

      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/relationship-intelligence/outreach", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { contactId, newsAlertId, channel, messageContent, notes } = req.body;

      const [entry] = await db.insert(outreachLog).values({
        userId,
        contactId,
        newsAlertId: newsAlertId || null,
        channel: channel || "email",
        messageContent,
        notes,
      }).returning();

      if (newsAlertId) {
        await db.update(newsAlerts).set({ isActedOn: true }).where(eq(newsAlerts.id, newsAlertId));
      }

      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/relationship-intelligence/outreach/:id", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { responseReceived, outcome, notes } = req.body;

      const updates: any = {};
      if (responseReceived !== undefined) {
        updates.responseReceived = responseReceived;
        if (responseReceived) updates.responseAt = new Date();
      }
      if (outcome !== undefined) updates.outcome = outcome;
      if (notes !== undefined) updates.notes = notes;

      const [updated] = await db
        .update(outreachLog)
        .set(updates)
        .where(and(eq(outreachLog.id, req.params.id), eq(outreachLog.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Outreach entry not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // DASHBOARD STATS
  // =============================================

  app.get("/api/relationship-intelligence/stats", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;

      const [contactCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(relationshipContacts)
        .where(and(eq(relationshipContacts.userId, userId), eq(relationshipContacts.isActive, true)));

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [alertsThisWeek] = await db
        .select({ count: sql<number>`count(*)` })
        .from(newsAlerts)
        .where(and(
          eq(newsAlerts.userId, userId),
          sql`${newsAlerts.createdAt} > ${weekAgo}`
        ));

      const [outreachSent] = await db
        .select({ count: sql<number>`count(*)` })
        .from(outreachLog)
        .where(eq(outreachLog.userId, userId));

      const [meetingsBooked] = await db
        .select({ count: sql<number>`count(*)` })
        .from(outreachLog)
        .where(and(eq(outreachLog.userId, userId), eq(outreachLog.outcome, "meeting_booked")));

      const [kbCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(knowledgeBaseEntries)
        .where(eq(knowledgeBaseEntries.userId, userId));

      const [unreadAlerts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(newsAlerts)
        .where(and(eq(newsAlerts.userId, userId), eq(newsAlerts.isRead, false), eq(newsAlerts.isDismissed, false)));

      res.json({
        contactsMonitored: Number(contactCount.count),
        alertsThisWeek: Number(alertsThisWeek.count),
        outreachSent: Number(outreachSent.count),
        meetingsBooked: Number(meetingsBooked.count),
        knowledgeBaseEntries: Number(kbCount.count),
        unreadAlerts: Number(unreadAlerts.count),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/relationship-intelligence/seed-demo", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const [existing] = await db
        .select({ count: sql<number>`count(*)` })
        .from(relationshipContacts)
        .where(eq(relationshipContacts.userId, userId));

      if (Number(existing.count) > 0) {
        return res.json({ message: "Demo data already exists", seeded: false });
      }

      const { nanoid } = await import("nanoid");
      const client = await pool.connect();
      const q = (text: string, params: any[]) => client.query(text, params);

      try {
      await client.query("BEGIN");

      const kbEntries = [
        { id: nanoid(21), type: "deal", title: "Meridian Capital Partners \u2014 Series C Financing", content: "Represented Meridian Capital Partners in their $85M Series C financing round led by Apex Ventures. Key terms included 2x liquidation preference. Key contacts: Victoria Chen (CFO), Marcus Webb (Partner, Apex Ventures).", summary: "$85M Series C for Meridian Capital Partners led by Apex Ventures.", people: "{Victoria Chen,Marcus Webb,Diana Kowalski}", companies: "{Meridian Capital Partners,Apex Ventures}", entities: "{Series C,liquidation preference,fintech}", value: "85000000", date: "2023-09-15", tags: "{venture capital,fintech}" },
        { id: nanoid(21), type: "litigation", title: "Hargrove v. PacificTech \u2014 Patent Dispute", content: "Represented Hargrove in patent infringement against PacificTech. Opposing counsel: James Whitfield. Expert: Dr. Elena Vasquez. Settled $12.5M with cross-license.", summary: "Patent case settled $12.5M with cross-license.", people: "{James Whitfield,Elena Vasquez}", companies: "{Hargrove Industries,PacificTech Solutions}", entities: "{patent,AI,settlement}", value: "12500000", date: "2024-03-20", tags: "{patent,litigation}" },
        { id: nanoid(21), type: "transaction", title: "Atlas Healthcare \u2014 Coastal Medical Acquisition", content: "Advised Atlas Healthcare on $142M acquisition of Coastal Medical Associates. Key contacts: Dr. Patricia Morales (CEO), Sandra Kim (founder).", summary: "Atlas Healthcare acquires Coastal Medical for $142M.", people: "{Patricia Morales,Sandra Kim,Franklin Torres}", companies: "{Atlas Healthcare Group,Coastal Medical Associates}", entities: "{acquisition,healthcare,earnout}", value: "142000000", date: "2024-01-10", tags: "{healthcare,M&A}" },
        { id: nanoid(21), type: "regulatory_filing", title: "SEC Investigation \u2014 Pinnacle Financial Trading", content: "Coordinated SEC inquiry response for Pinnacle Financial Group. Contacts: Nathan Cross (CCO), Isabelle Fontaine (GC). Resolved with $2.3M civil penalty.", summary: "SEC investigation resolved with $2.3M penalty.", people: "{Nathan Cross,Isabelle Fontaine}", companies: "{Pinnacle Financial Group,SEC}", entities: "{front-running,consent decree,compliance}", value: "2300000", date: "2024-06-01", tags: "{SEC,regulatory}" },
        { id: nanoid(21), type: "contract", title: "Global Logistics \u2014 TechVault Cloud MSA", content: "Negotiated $28M cloud migration MSA. Contacts: Margaret Huang (CTO), Rajesh Patel (VP Sales).", summary: "$28M cloud migration MSA with EU data sovereignty.", people: "{Margaret Huang,Rajesh Patel}", companies: "{Global Logistics Corp,TechVault Cloud}", entities: "{cloud migration,SLA,GDPR}", value: "28000000", date: "2024-08-22", tags: "{technology,cloud}" },
        { id: nanoid(21), type: "due_diligence", title: "Silverstone Energy \u2014 ESG Due Diligence", content: "ESG compliance due diligence for Silverstone Energy $500M green bond. Identified three Scope 3 emissions remediation items. Contact: Caroline West.", summary: "ESG due diligence for $500M green bond.", people: "{Caroline West,Alex Thornton}", companies: "{Silverstone Energy}", entities: "{ESG,green bond,Scope 3}", value: "500000000", date: "2024-11-05", tags: "{ESG,energy}" },
      ];

      for (const kb of kbEntries) {
        await q("INSERT INTO knowledge_base_entries (id,user_id,document_type,title,content,summary,people_mentioned,companies_mentioned,entities_mentioned,deal_value,deal_date,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [kb.id, userId, kb.type, kb.title, kb.content, kb.summary, kb.people, kb.companies, kb.entities, kb.value, kb.date, kb.tags]);
      }

      const contacts = [
        { id: nanoid(21), fn: "Victoria", ln: "Chen", email: "v.chen@meridiancap.com", co: "Meridian Capital Partners", title: "Chief Financial Officer", city: "San Francisco", st: "CA", ctry: "US", tags: "{client,deal_team}", pri: 1 },
        { id: nanoid(21), fn: "Marcus", ln: "Webb", email: "m.webb@apexventures.com", co: "Apex Ventures", title: "Managing Partner", city: "Palo Alto", st: "CA", ctry: "US", tags: "{investor}", pri: 1 },
        { id: nanoid(21), fn: "James", ln: "Whitfield", email: "jwhitfield@prestonsterling.com", co: "Preston & Sterling LLP", title: "Senior Litigation Partner", city: "San Francisco", st: "CA", ctry: "US", tags: "{opposing_counsel}", pri: 2 },
        { id: nanoid(21), fn: "Patricia", ln: "Morales", email: "p.morales@atlashealthcare.com", co: "Atlas Healthcare Group", title: "Chief Executive Officer", city: "Atlanta", st: "GA", ctry: "US", tags: "{client,healthcare}", pri: 1 },
        { id: nanoid(21), fn: "Sandra", ln: "Kim", email: "s.kim@coastalmedical.com", co: "Coastal Medical Associates", title: "Founding Partner", city: "Charleston", st: "SC", ctry: "US", tags: "{prospect}", pri: 2 },
        { id: nanoid(21), fn: "Nathan", ln: "Cross", email: "n.cross@pinnaclefin.com", co: "Pinnacle Financial Group", title: "Chief Compliance Officer", city: "New York", st: "NY", ctry: "US", tags: "{client,compliance}", pri: 2 },
        { id: nanoid(21), fn: "Isabelle", ln: "Fontaine", email: "i.fontaine@pinnaclefin.com", co: "Pinnacle Financial Group", title: "General Counsel", city: "New York", st: "NY", ctry: "US", tags: "{client,legal}", pri: 1 },
        { id: nanoid(21), fn: "Margaret", ln: "Huang", email: "m.huang@globallogistics.com", co: "Global Logistics Corp", title: "Chief Technology Officer", city: "Chicago", st: "IL", ctry: "US", tags: "{client,technology}", pri: 2 },
        { id: nanoid(21), fn: "Caroline", ln: "West", email: "c.west@silverstoneenergy.com", co: "Silverstone Energy", title: "VP Sustainability", city: "Houston", st: "TX", ctry: "US", tags: "{client,ESG}", pri: 2 },
        { id: nanoid(21), fn: "Rajesh", ln: "Patel", email: "r.patel@techvault.io", co: "TechVault Cloud", title: "VP Enterprise Sales", city: "Seattle", st: "WA", ctry: "US", tags: "{vendor}", pri: 3 },
        { id: nanoid(21), fn: "Diana", ln: "Kowalski", email: "d.kowalski@kflegal.com", co: "Kowalski & Finch LLP", title: "Partner", city: "Boston", st: "MA", ctry: "US", tags: "{co-counsel}", pri: 3 },
        { id: nanoid(21), fn: "Franklin", ln: "Torres", email: "f.torres@atlashealthcare.com", co: "Atlas Healthcare Group", title: "CFO", city: "Atlanta", st: "GA", ctry: "US", tags: "{client}", pri: 2 },
        { id: nanoid(21), fn: "Elena", ln: "Vasquez", email: "evasquez@stanford.edu", co: "Stanford University", title: "Professor of CS", city: "Stanford", st: "CA", ctry: "US", tags: "{expert_witness}", pri: 3 },
        { id: nanoid(21), fn: "Alex", ln: "Thornton", email: "a.thornton@greenmark.com", co: "GreenMark Verification", title: "Lead Auditor", city: "Denver", st: "CO", ctry: "US", tags: "{vendor}", pri: 3 },
        { id: nanoid(21), fn: "David", ln: "Rothstein", email: "d.rothstein@eurocounsel.com", co: "EuroCounsel Partners", title: "Of Counsel", city: "London", st: "", ctry: "UK", tags: "{co-counsel}", pri: 3 },
      ];

      for (const c of contacts) {
        await q("INSERT INTO relationship_contacts (id,user_id,first_name,last_name,full_name,email,company,job_title,city,state,country,tags,priority_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [c.id, userId, c.fn, c.ln, c.fn + " " + c.ln, c.email, c.co, c.title, c.city, c.st, c.ctry, c.tags, c.pri]);
      }

      const now = new Date();
      const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000);
      const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

      function kbc(kbIdx: number, t: string, dt: string, s: string, rel: number, cs: string) {
        return JSON.stringify({ entries: [{ id: kbEntries[kbIdx].id, title: t, documentType: dt, summary: s, relevance: rel }], connectionSummary: cs });
      }

      const stories = [
        { cIdx: 0, headline: "Meridian Capital Partners CFO Victoria Chen Named to Forbes Finance 50 List", source: "Forbes", url: "https://forbes.com/lists/finance-50", time: hoursAgo(3), summary: "Victoria Chen recognized on Forbes Finance 50 for steering Meridian through successful Series C and achieving profitability.", sentiment: "positive", category: "award", score: 0.95, kb: kbc(0, "Meridian Series C", "deal", "$85M Series C round.", 0.98, "You represented Meridian in their $85M Series C. Victoria was your primary contact. This award validates the trajectory."), outreach: "Congratulate Victoria on the Forbes recognition.", channel: "email" },
        { cIdx: 1, headline: "Apex Ventures Closes $2.1B Fund VII, Targets AI and Climate Tech", source: "TechCrunch", url: "https://techcrunch.com/apex", time: hoursAgo(8), summary: "Apex Ventures Fund VII at $2.1B. Marcus Webb targets AI infrastructure and climate technology.", sentiment: "positive", category: "funding", score: 0.92, kb: kbc(0, "Meridian Series C", "deal", "Webb led the Series C.", 0.90, "Webb led the Meridian Series C your firm handled. His $2.1B fund is a major deal flow opportunity."), outreach: "Congratulate Marcus on the fund close.", channel: "email" },
        { cIdx: 2, headline: "Preston & Sterling Partner James Whitfield Elected to ACTL", source: "The American Lawyer", url: "https://americanlawyer.com/whitfield", time: daysAgo(1), summary: "James Whitfield elected Fellow of ACTL for IP litigation expertise.", sentiment: "positive", category: "award", score: 0.82, kb: kbc(1, "Hargrove v. PacificTech", "litigation", "Opposing counsel. Settled $12.5M.", 0.88, "Whitfield was opposing counsel. Professional acknowledgment strengthens relationship."), outreach: "Congratulate Whitfield on ACTL fellowship.", channel: "linkedin" },
        { cIdx: 3, headline: "Atlas Healthcare Announces $300M Midwest Expansion", source: "Modern Healthcare", url: "https://modernhealthcare.com/atlas", time: hoursAgo(5), summary: "Atlas Healthcare plans $300M expansion acquiring three regional medical networks.", sentiment: "positive", category: "acquisition", score: 0.97, kb: kbc(2, "Atlas Coastal Medical", "transaction", "Advised Atlas on $142M acquisition.", 0.96, "You advised Atlas on $142M Coastal Medical acquisition. $300M expansion is a direct follow-on opportunity."), outreach: "Reach out about expansion, reference Coastal Medical.", channel: "email" },
        { cIdx: 6, headline: "Pinnacle GC Isabelle Fontaine Keynotes SEC Enforcement Conference", source: "Law360", url: "https://law360.com/sec", time: daysAgo(2), summary: "Fontaine discussed compliance evolution at SEC Enforcement Conference.", sentiment: "neutral", category: "regulatory", score: 0.88, kb: kbc(3, "SEC Pinnacle", "regulatory_filing", "SEC response. $2.3M penalty.", 0.94, "You coordinated Pinnacle SEC response. Could lead to follow-on advisory work."), outreach: "Reference SEC matter, inquire about compliance needs.", channel: "email" },
        { cIdx: 7, headline: "Global Logistics CTO Margaret Huang Chairs AI Standards Committee", source: "Supply Chain Dive", url: "https://supplychaindive.com/huang", time: daysAgo(1), summary: "Margaret Huang appointed chair of Industry AI Standards Committee.", sentiment: "positive", category: "promotion", score: 0.78, kb: kbc(4, "Global Logistics MSA", "contract", "$28M cloud MSA.", 0.82, "You negotiated the cloud MSA. AI governance may drive compliance needs."), outreach: "Congratulate on committee appointment.", channel: "linkedin" },
        { cIdx: 8, headline: "Silverstone Energy Receives MSCI ESG AA Rating, Shares Jump 8%", source: "Bloomberg", url: "https://bloomberg.com/silverstone", time: hoursAgo(12), summary: "Silverstone upgraded to MSCI ESG AA citing Scope 3 improvements.", sentiment: "positive", category: "award", score: 0.85, kb: kbc(5, "Silverstone ESG DD", "due_diligence", "Scope 3 items.", 0.93, "Your ESG DD identified the Scope 3 items in this upgrade."), outreach: "Congratulate on MSCI upgrade.", channel: "email" },
        { cIdx: 4, headline: "Sandra Kim Launches Healthcare Venture Studio", source: "Becker's Hospital Review", url: "https://beckershospitalreview.com/kim", time: daysAgo(3), summary: "Sandra Kim launched Magnolia Health Ventures deploying $25M across digital health startups.", sentiment: "positive", category: "funding", score: 0.80, kb: kbc(2, "Atlas Coastal Medical", "transaction", "Kim was seller.", 0.75, "Kim was sell-side in Coastal Medical deal. Venture studio = new legal work."), outreach: "Congratulate, offer fund formation counsel.", channel: "email" },
        { cIdx: 9, headline: "TechVault Cloud Achieves FedRAMP High Authorization", source: "GovTech", url: "https://govtech.com/techvault", time: daysAgo(2), summary: "TechVault achieved FedRAMP High authorization.", sentiment: "positive", category: "partnership", score: 0.65, kb: null, outreach: "Acknowledge FedRAMP milestone.", channel: "linkedin" },
        { cIdx: 12, headline: "Stanford Professor Elena Vasquez Publishes AI Bias Research in Nature", source: "Nature", url: "https://nature.com/vasquez", time: daysAgo(4), summary: "Dr. Vasquez published study on AI bias in patent examination.", sentiment: "neutral", category: "general", score: 0.70, kb: kbc(1, "Hargrove v. PacificTech", "litigation", "Vasquez was expert witness.", 0.80, "Vasquez was your expert witness. Research could inform future IP strategies."), outreach: "Congratulate, explore research implications.", channel: "email" },
        { cIdx: 5, headline: "Pinnacle CCO Nathan Cross Appointed to FINRA Advisory Committee", source: "Financial Times", url: "https://ft.com/cross-finra", time: hoursAgo(18), summary: "Cross appointed to FINRA Market Regulation Advisory Committee.", sentiment: "positive", category: "promotion", score: 0.86, kb: kbc(3, "SEC Pinnacle", "regulatory_filing", "Cross was key SEC contact.", 0.91, "Cross was your contact during SEC investigation. FINRA appointment validates compliance transformation."), outreach: "Congratulate, reference compliance improvements.", channel: "email" },
      ];

      for (const s of stories) {
        const alertId = nanoid(21);
        if (s.kb) {
          await q("INSERT INTO news_alerts (id,contact_id,user_id,headline,source_name,source_url,published_at,summary,sentiment,category,relevance_score,knowledge_base_connections,suggested_outreach,outreach_channel) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)", [alertId, contacts[s.cIdx].id, userId, s.headline, s.source, s.url, s.time, s.summary, s.sentiment, s.category, s.score, s.kb, s.outreach, s.channel]);
        } else {
          await q("INSERT INTO news_alerts (id,contact_id,user_id,headline,source_name,source_url,published_at,summary,sentiment,category,relevance_score,suggested_outreach,outreach_channel) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [alertId, contacts[s.cIdx].id, userId, s.headline, s.source, s.url, s.time, s.summary, s.sentiment, s.category, s.score, s.outreach, s.channel]);
        }
      }

      const outreachEntries = [
        { cIdx: 0, ch: "email", msg: "Victoria, congratulations on the milestone. Wonderful watching Meridian grow since the Series C.", outcome: "replied", sent: daysAgo(14) },
        { cIdx: 3, ch: "email", msg: "Dr. Morales, the Coastal Medical integration seems to exceed projections. Our team is available.", outcome: "meeting_booked", sent: daysAgo(21) },
        { cIdx: 1, ch: "linkedin", msg: "Marcus, great to see Apex leading the NovaBridge round. Let me know if we can help.", outcome: "replied", sent: daysAgo(30) },
      ];

      for (const o of outreachEntries) {
        await q("INSERT INTO outreach_log (id,user_id,contact_id,channel,message_content,response_received,outcome,sent_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [nanoid(21), userId, contacts[o.cIdx].id, o.ch, o.msg, true, o.outcome, o.sent]);
      }

      await q("INSERT INTO contact_sources (id,user_id,source_type,last_synced_at,sync_status,contact_count) VALUES ($1,$2,$3,NOW(),$4,$5)", [nanoid(21), userId, "manual", "completed", 15]);

      await client.query("COMMIT");
      client.release();

      res.json({ message: "Demo data seeded successfully", seeded: true, contacts: contacts.length, alerts: stories.length, kbEntries: kbEntries.length });
      } catch (txError: any) {
        await client.query("ROLLBACK");
        client.release();
        throw txError;
      }
    } catch (error: any) {
      console.error("[RI] Seed demo error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // IMPORT CONTACTS FROM CASE COMMUNICATIONS
  // =============================================

  const DOMAIN_TO_COMPANY: Record<string, string> = {
    "usawaterpolo.org": "USA Water Polo",
    "morganlewis.com": "Morgan Lewis & Bockius",
    "mckinsey.com": "McKinsey & Company",
    "warburgpincus.com": "Warburg Pincus",
    "falconfund.net": "Falcon Fund Management",
    "freepoint.com": "Freepoint Commodities",
    "hbs.edu": "Harvard Business School",
    "roarmedia.com": "Roar Media",
    "sierracap.com": "Sierra Capital",
    "crown-chicago.com": "Crown Chicago Industries",
    "manningllp.com": "Manning LLP",
    "TysonMendes.com": "Tyson & Mendes",
    "tysonmendes.com": "Tyson & Mendes",
    "whitecase.com": "White & Case LLP",
    "qvlaw.net": "QV Law",
    "villanova.edu": "Villanova University",
    "ey.com": "Ernst & Young",
    "citi.com": "Citigroup",
    "brown.edu": "Brown University",
    "stanford.edu": "Stanford University",
    "belenjesuit.org": "Belen Jesuit Preparatory",
    "msprecovery.com": "MSP Recovery",
    "msprecoverylawfirm.com": "MSP Recovery Law Firm",
  };

  const FILTERED_DOMAINS = new Set([
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
    "sbcglobal.net", "msn.com", "icloud.com", "me.com", "live.com",
    "protonmail.com", "zoho.com", "mail.com",
  ]);

  const SYSTEM_EMAILS = new Set([
    "noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon",
    "notifications", "subscriptions", "info@", "support@", "membership",
    "reporting@usawaterpolo.org", "ethicschair@usawaterpolo.org",
    "membership@usawaterpolo.org", "mmm@usawaterpolo.org",
  ]);

  const BOT_SENDERS = [
    "via google docs", "reddit", "bloomberg", "wordpress.com",
    "sport80.com", "replit.com", "bloomerang", "comment-reply@",
    "drive-shares-dm-noreply@", "noreply@sport80.com",
  ];

  function parseEmailContact(raw: string): { name: string; email: string } | null {
    if (!raw || raw.trim().length === 0) return null;
    raw = raw.trim();

    let name = "";
    let email = "";

    const angleMatch = raw.match(/<([^>]+)>/);
    if (angleMatch) {
      email = angleMatch[1].trim().toLowerCase();
      name = raw.substring(0, raw.indexOf("<")).trim();
      name = name.replace(/^["']+|["']+$/g, "").trim();
    } else if (raw.includes("@")) {
      email = raw.trim().toLowerCase();
    }

    if (!email || !email.includes("@") || email.length > 254) return null;

    const viaMatch = name.match(/^'?(.+?)'?\s+via\s+/i);
    if (viaMatch) {
      name = viaMatch[1].trim().replace(/^'|'$/g, "");
    }

    name = name.replace(/^["']+|["']+$/g, "").trim();

    const localPart = email.split("@")[0];
    const lowerLocal = localPart.toLowerCase();
    const domain = email.split("@")[1];

    if (SYSTEM_EMAILS.has(lowerLocal) || SYSTEM_EMAILS.has(email)) return null;
    if (lowerLocal.startsWith("noreply") || lowerLocal.startsWith("no-reply") || lowerLocal.startsWith("donotreply") || lowerLocal.startsWith("do-not-reply") || lowerLocal.startsWith("mailer-daemon")) return null;

    const lowerRaw = raw.toLowerCase();
    for (const bot of BOT_SENDERS) {
      if (lowerRaw.includes(bot) || email.includes(bot)) return null;
    }

    if (!name || name.length < 2) {
      const parts = localPart.split(/[._-]/);
      if (parts.length >= 2) {
        name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
      } else {
        return null;
      }
    }

    if (/^\w{10,}$/.test(name) || /^[0-9]+$/.test(name)) return null;

    return { name, email };
  }

  function splitName(fullName: string): { firstName: string; lastName: string } {
    const cleaned = fullName.replace(/\s+/g, " ").trim();
    const parts = cleaned.split(" ");

    if (parts.length === 1) return { firstName: parts[0], lastName: "" };

    if (parts[parts.length - 1].includes(",")) {
      const last = parts[parts.length - 1].replace(",", "");
      return { firstName: parts.slice(0, -1).join(" "), lastName: last };
    }

    const lastComma = cleaned.match(/^([^,]+),\s*(.+)$/);
    if (lastComma) {
      return { firstName: lastComma[2].trim(), lastName: lastComma[1].trim() };
    }

    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  app.get("/api/relationship-intelligence/cases-with-comms", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c.title, count(comm.id)::int as comm_count,
               count(DISTINCT comm.sender)::int as sender_count
        FROM cases c
        INNER JOIN communications comm ON comm.case_id = c.id
        GROUP BY c.id, c.title
        HAVING count(comm.id) > 0
        ORDER BY count(comm.id) DESC
      `);
      res.json(result.rows);
    } catch (error: any) {
      console.error("[RI] Error fetching cases with comms:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/relationship-intelligence/import-from-case", isAuthenticated, riRoles, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { caseId } = req.body;

      if (!caseId) {
        return res.status(400).json({ message: "caseId is required" });
      }

      const caseResult = await pool.query("SELECT id, title FROM cases WHERE id = $1", [caseId]);
      if (caseResult.rows.length === 0) {
        return res.status(404).json({ message: "Case not found" });
      }
      const caseTitle = caseResult.rows[0].title;

      const sendersResult = await pool.query(`
        SELECT sender, count(*)::int as cnt
        FROM communications
        WHERE case_id = $1 AND sender IS NOT NULL AND sender != ''
        GROUP BY sender
      `, [caseId]);

      const recipientsResult = await pool.query(`
        SELECT recipients
        FROM communications
        WHERE case_id = $1 AND recipients IS NOT NULL
      `, [caseId]);

      const contactMap = new Map<string, { name: string; email: string; sendCount: number; recvCount: number }>();

      for (const row of sendersResult.rows) {
        const parsed = parseEmailContact(row.sender);
        if (!parsed) continue;
        const existing = contactMap.get(parsed.email);
        if (existing) {
          existing.sendCount += row.cnt;
          if (parsed.name.length > existing.name.length && !parsed.name.includes("via")) {
            existing.name = parsed.name;
          }
        } else {
          contactMap.set(parsed.email, { name: parsed.name, email: parsed.email, sendCount: row.cnt, recvCount: 0 });
        }
      }

      for (const row of recipientsResult.rows) {
        let recipients: string[] = [];
        if (Array.isArray(row.recipients)) {
          recipients = row.recipients;
        } else if (typeof row.recipients === "string") {
          try { recipients = JSON.parse(row.recipients); } catch { recipients = [row.recipients]; }
        }

        for (const r of recipients) {
          if (typeof r !== "string") continue;
          const parts = r.split(/,\s*(?=")/);
          for (const part of parts) {
            const parsed = parseEmailContact(part.trim());
            if (!parsed) continue;
            const existing = contactMap.get(parsed.email);
            if (existing) {
              existing.recvCount += 1;
              if (parsed.name.length > existing.name.length && !parsed.name.includes("via")) {
                existing.name = parsed.name;
              }
            } else {
              contactMap.set(parsed.email, { name: parsed.name, email: parsed.email, sendCount: 0, recvCount: 1 });
            }
          }
        }
      }

      const contacts = Array.from(contactMap.values());
      contacts.sort((a, b) => (b.sendCount + b.recvCount) - (a.sendCount + a.recvCount));

      const totalContacts = contacts.length;
      const vipThreshold = Math.ceil(totalContacts * 0.1);
      const highThreshold = Math.ceil(totalContacts * 0.3);

      const existingResult = await pool.query(
        "SELECT email FROM relationship_contacts WHERE user_id = $1 AND is_active = true",
        [userId]
      );
      const existingEmails = new Set(existingResult.rows.map((r: any) => r.email?.toLowerCase()));

      const { nanoid } = await import("nanoid");
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        let imported = 0;
        let skipped = 0;
        const topPeople: string[] = [];
        const topCompanies = new Set<string>();

        const toInsert: any[][] = [];
        for (let i = 0; i < contacts.length; i++) {
          const c = contacts[i];

          if (existingEmails.has(c.email)) {
            skipped++;
            continue;
          }

          const { firstName, lastName } = splitName(c.name);
          const domain = c.email.split("@")[1];
          const company = DOMAIN_TO_COMPANY[domain] || DOMAIN_TO_COMPANY[domain.toLowerCase()] || null;
          const isPersonalDomain = FILTERED_DOMAINS.has(domain);

          let priority = 3;
          if (i < vipThreshold) priority = 1;
          else if (i < highThreshold) priority = 2;

          const tags: string[] = ["case_import"];
          if (company) tags.push("organization");
          if (isPersonalDomain) tags.push("personal_email");

          const pgTags = `{${tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(",")}}`;
          toInsert.push([nanoid(21), userId, firstName.slice(0, 255), lastName.slice(0, 255), c.name.slice(0, 255), c.email.slice(0, 255), company ? company.slice(0, 255) : null, pgTags, priority]);
          existingEmails.add(c.email);

          if (i < 20) topPeople.push(c.name);
          if (company) topCompanies.add(company);
        }

        const BATCH_SIZE = 50;
        for (let b = 0; b < toInsert.length; b += BATCH_SIZE) {
          const batch = toInsert.slice(b, b + BATCH_SIZE);
          const placeholders: string[] = [];
          const values: any[] = [];
          batch.forEach((row, idx) => {
            const offset = idx * 9;
            placeholders.push(`($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6},$${offset+7},$${offset+8},$${offset+9})`);
            values.push(...row);
          });
          await client.query(
            `INSERT INTO relationship_contacts (id,user_id,first_name,last_name,full_name,email,company,tags,priority_level) VALUES ${placeholders.join(",")}`,
            values
          );
        }
        imported = toInsert.length;

        const sourceId = nanoid(21);
        await client.query(
          `INSERT INTO contact_sources (id, user_id, source_type, last_synced_at, sync_status, contact_count)
           VALUES ($1, $2, $3, NOW(), $4, $5)`,
          [sourceId, userId, "case_import", "completed", imported]
        );

        const topPeopleArr = topPeople.slice(0, 15);
        const topCompaniesArr = Array.from(topCompanies).slice(0, 10);
        const kbId = nanoid(21);
        const kbContent = `Case "${caseTitle}" — ${totalContacts} unique contacts extracted from communications. Top communicators: ${topPeopleArr.join(", ")}. Organizations involved: ${topCompaniesArr.join(", ")}.`;
        const kbSummary = `${totalContacts} contacts extracted from "${caseTitle}" case communications.`;
        const safeCaseTag = caseTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 50);

        await client.query(
          `INSERT INTO knowledge_base_entries
           (id, user_id, document_type, title, content, summary, people_mentioned, companies_mentioned, entities_mentioned, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::text[], $9::text[], $10::text[])`,
          [
            kbId, userId, "litigation",
            `${caseTitle} — Contact Network Analysis`.slice(0, 500),
            kbContent, kbSummary,
            topPeopleArr,
            topCompaniesArr,
            ["case_import", "communications", "contact_network"],
            ["case_import", safeCaseTag]
          ]
        );

        await client.query("COMMIT");
        client.release();

        res.json({
          message: `Imported ${imported} contacts from "${caseTitle}"`,
          imported,
          skipped,
          totalExtracted: totalContacts,
          caseTitle,
          topCommunicators: topPeople.slice(0, 10),
          organizations: Array.from(topCompanies).slice(0, 10),
          knowledgeBaseEntryId: kbId,
        });
      } catch (txError: any) {
        await client.query("ROLLBACK");
        client.release();
        throw txError;
      }
    } catch (error: any) {
      console.error("[RI] Import from case error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  console.log("[RelationshipIntelligence] Routes registered");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

