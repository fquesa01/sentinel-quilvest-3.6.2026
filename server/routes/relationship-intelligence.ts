import { Express, Request, Response } from "express";
import { isAuthenticated, requireRole } from "../replitAuth";
import { db } from "../db";
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
        .where(and(eq(relationshipContacts.userId, userId), eq(relationshipContacts.isActive, true)));

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

      let contactsToScan;
      if (contactId) {
        contactsToScan = await db
          .select()
          .from(relationshipContacts)
          .where(and(
            eq(relationshipContacts.id, contactId),
            eq(relationshipContacts.userId, userId),
            eq(relationshipContacts.isActive, true)
          ));
      } else {
        contactsToScan = await db
          .select()
          .from(relationshipContacts)
          .where(and(
            eq(relationshipContacts.userId, userId),
            eq(relationshipContacts.isActive, true)
          ))
          .orderBy(relationshipContacts.priorityLevel)
          .limit(20);
      }

      if (contactsToScan.length === 0) {
        return res.json({ scanned: 0, alertsCreated: 0, message: "No contacts to scan" });
      }

      const newsApiKey = process.env.NEWS_API_KEY;
      let totalAlerts = 0;

      for (const contact of contactsToScan) {
        try {
          let articles: any[] = [];

          if (newsApiKey) {
            const searchQuery = contact.company
              ? `"${contact.fullName}" OR ("${contact.fullName}" AND "${contact.company}")`
              : `"${contact.fullName}"`;

            const response = await fetch(
              `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&sortBy=publishedAt&language=en&pageSize=5&apiKey=${newsApiKey}`
            );
            const data = await response.json();
            if (data.articles) articles = data.articles;
          } else {
            articles = generateDemoNewsForContact(contact);
          }

          for (const article of articles) {
            let verified = true;
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
                max_tokens: 200,
              });

              const analysis = JSON.parse(aiResponse.choices[0].message.content || "{}");
              verified = analysis.match && analysis.confidence > 0.6;
              category = analysis.category || "general";
              sentiment = analysis.sentiment || "neutral";
              if (analysis.summary) summary = analysis.summary;
            } catch {
              verified = true;
            }

            if (!verified) continue;

            const existingAlert = await db
              .select()
              .from(newsAlerts)
              .where(and(
                eq(newsAlerts.contactId, contact.id),
                eq(newsAlerts.headline, article.title || "")
              ))
              .limit(1);

            if (existingAlert.length > 0) continue;

            await db.insert(newsAlerts).values({
              contactId: contact.id,
              userId,
              headline: article.title || "News Article",
              sourceName: article.source?.name || article.sourceName || "News",
              sourceUrl: article.url || article.sourceUrl || "",
              publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
              summary,
              sentiment: sentiment as any,
              category: category as any,
              relevanceScore: 0.8,
            });
            totalAlerts++;
          }

          await db.update(relationshipContacts).set({ lastNewsScanAt: new Date() }).where(eq(relationshipContacts.id, contact.id));
        } catch (err) {
          console.error(`[RI] Error scanning contact ${contact.fullName}:`, err);
        }
      }

      res.json({ scanned: contactsToScan.length, alertsCreated: totalAlerts });
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
          max_tokens: 500,
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
            max_tokens: 200,
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
        max_tokens: 1000,
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

function generateDemoNewsForContact(contact: any) {
  const categories = [
    { cat: "promotion", headline: `${contact.fullName} Named to Senior Leadership Role at ${contact.company || "Major Firm"}`, sentiment: "positive" },
    { cat: "partnership", headline: `${contact.company || "Company"} Announces Strategic Partnership in New Market`, sentiment: "positive" },
    { cat: "award", headline: `${contact.fullName} Recognized Among Top Industry Leaders`, sentiment: "positive" },
    { cat: "funding", headline: `${contact.company || "Company"} Secures New Round of Growth Capital`, sentiment: "positive" },
    { cat: "acquisition", headline: `${contact.company || "Company"} Explores Acquisition of Regional Competitor`, sentiment: "neutral" },
  ];

  const selected = categories[Math.floor(Math.random() * categories.length)];
  return [{
    title: selected.headline,
    description: `${contact.fullName}${contact.jobTitle ? `, ${contact.jobTitle}` : ""} at ${contact.company || "a leading organization"} was featured in recent industry coverage.`,
    source: { name: "Industry News" },
    url: "#",
    publishedAt: new Date().toISOString(),
    sourceName: "Industry News",
    sourceUrl: "#",
    category: selected.cat,
    sentiment: selected.sentiment,
  }];
}