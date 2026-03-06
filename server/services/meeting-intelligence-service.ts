import { openai } from "../ai";

interface Attendee {
  name: string;
  email: string;
}

interface ArticleInsight {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt: string;
}

interface NewsInsight {
  name: string;
  articles: ArticleInsight[];
}

interface MeetingIntelligence {
  attendeeSummary: string;
  newsInsights: NewsInsight[];
  generatedAt: string;
}

async function searchNewsForPerson(query: string): Promise<{ title: string; url: string; description: string; source: string; publishedAt: string }[]> {
  const newsApiKey = process.env.NEWS_API_KEY || process.env.NewsAPI_API;
  if (!newsApiKey) {
    console.log("[MeetingIntelligence] No NewsAPI key configured");
    return [];
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&pageSize=5&language=en&apiKey=${newsApiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(`[MeetingIntelligence] NewsAPI returned ${resp.status} for query: ${query}`);
      return [];
    }
    const data = await resp.json();
    return (data.articles || []).map((a: any) => ({
      title: a.title || "",
      url: a.url || "",
      description: a.description || "",
      source: a.source?.name || "",
      publishedAt: a.publishedAt || "",
    }));
  } catch (err) {
    console.error("[MeetingIntelligence] NewsAPI search failed:", err);
    return [];
  }
}

function inferCompanyFromEmail(email: string): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const freeProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "me.com", "protonmail.com", "mail.com"];
  if (freeProviders.includes(domain)) return null;
  const companyName = domain.split(".")[0];
  return companyName.charAt(0).toUpperCase() + companyName.slice(1);
}

export async function generateMeetingIntelligence(attendees: Attendee[]): Promise<MeetingIntelligence> {
  const validAttendees = attendees.filter(a => a.name || a.email);
  if (validAttendees.length === 0) {
    return {
      attendeeSummary: "No attendee information available.",
      newsInsights: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const attendeeDescriptions = validAttendees.map(a => {
    const company = inferCompanyFromEmail(a.email);
    return `- ${a.name || "Unknown"}${a.email ? ` (${a.email})` : ""}${company ? ` — likely affiliated with ${company}` : ""}`;
  }).join("\n");

  let attendeeSummary = "";
  try {
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a concise business intelligence analyst for a private equity firm. Given a list of meeting attendees with their names and email addresses, provide a brief professional summary of who they are and their likely roles/affiliations based on available context (email domains, name patterns). Keep it concise — 2-4 sentences max. Focus on what would be useful for a PE executive preparing for the meeting."
        },
        {
          role: "user",
          content: `Summarize these meeting attendees:\n${attendeeDescriptions}`
        }
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    attendeeSummary = summaryResponse.choices[0]?.message?.content || "Unable to generate attendee summary.";
  } catch (err) {
    console.error("[MeetingIntelligence] Failed to generate attendee summary:", err);
    attendeeSummary = `Meeting with ${validAttendees.map(a => a.name || a.email).join(", ")}.`;
  }

  const newsInsights: NewsInsight[] = [];
  for (const attendee of validAttendees) {
    const searchQueries: string[] = [];
    if (attendee.name) searchQueries.push(attendee.name);
    const company = inferCompanyFromEmail(attendee.email);
    if (company) searchQueries.push(company);

    const allArticles: { title: string; url: string; description: string; source: string; publishedAt: string }[] = [];
    for (const query of searchQueries) {
      const results = await searchNewsForPerson(query);
      allArticles.push(...results);
    }

    const uniqueArticles = allArticles.filter((a, i, arr) => 
      a.url && arr.findIndex(b => b.url === a.url) === i
    ).slice(0, 3);

    if (uniqueArticles.length === 0) {
      newsInsights.push({ name: attendee.name || attendee.email, articles: [] });
      continue;
    }

    let summarizedArticles: ArticleInsight[] = [];
    try {
      const articleTexts = uniqueArticles.map((a, i) => 
        `Article ${i + 1}: "${a.title}" (${a.source}, ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : "recent"})\n${a.description}`
      ).join("\n\n");

      const summaryResp = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a business intelligence analyst. For each article provided, write a 1-2 sentence summary highlighting what's relevant for a PE executive meeting this person or company. Return a JSON array with objects containing 'index' (0-based) and 'summary' fields. Return only valid JSON."
          },
          {
            role: "user",
            content: `Person/Company: ${attendee.name || company || "Unknown"}\n\nArticles:\n${articleTexts}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const summaryText = summaryResp.choices[0]?.message?.content || "[]";
      const cleaned = summaryText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as { index: number; summary: string }[];

      summarizedArticles = uniqueArticles.map((a, i) => ({
        title: a.title,
        url: a.url,
        summary: parsed.find(p => p.index === i)?.summary || a.description || "",
        source: a.source,
        publishedAt: a.publishedAt,
      }));
    } catch (err) {
      console.error("[MeetingIntelligence] Failed to summarize articles:", err);
      summarizedArticles = uniqueArticles.map(a => ({
        title: a.title,
        url: a.url,
        summary: a.description || "",
        source: a.source,
        publishedAt: a.publishedAt,
      }));
    }

    newsInsights.push({
      name: attendee.name || attendee.email,
      articles: summarizedArticles,
    });
  }

  return {
    attendeeSummary,
    newsInsights,
    generatedAt: new Date().toISOString(),
  };
}
