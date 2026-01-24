import { db } from "../db";
import { connectedCalendarAccounts, externalCalendarEvents, calendarEvents } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { decryptToken, encryptToken } from "../routes/calendar-oauth";

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

// Microsoft Graph API configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CALENDAR_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CALENDAR_CLIENT_SECRET;

interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  status?: string;
  htmlLink?: string;
  organizer?: { email: string; displayName?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  conferenceData?: { conferenceUrl?: string; conferenceSolution?: string };
}

// Refresh Google access token if expired
async function refreshGoogleToken(account: any): Promise<string | null> {
  if (!account.refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return null;
  }

  // Decrypt the stored access token to check if valid
  const decryptedAccessToken = decryptToken(account.accessToken);
  
  // Check if token is still valid
  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) > new Date()) {
    return decryptedAccessToken;
  }

  // Decrypt refresh token for use
  const decryptedRefreshToken = decryptToken(account.refreshToken);
  if (!decryptedRefreshToken) {
    await updateAccountSyncError(account.id, "Token decryption failed");
    return null;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh Google token:", await response.text());
      await updateAccountSyncError(account.id, "Token refresh failed");
      return null;
    }

    const tokens = await response.json();
    
    // Encrypt new access token before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    
    await db.update(connectedCalendarAccounts)
      .set({
        accessToken: encryptedAccessToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(connectedCalendarAccounts.id, account.id));

    return tokens.access_token;
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    return null;
  }
}

// Refresh Microsoft access token if expired
async function refreshMicrosoftToken(account: any): Promise<string | null> {
  if (!account.refreshToken || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return null;
  }

  // Decrypt the stored access token to check if valid
  const decryptedAccessToken = decryptToken(account.accessToken);
  
  // Check if token is still valid
  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) > new Date()) {
    return decryptedAccessToken;
  }

  // Decrypt refresh token for use
  const decryptedRefreshToken = decryptToken(account.refreshToken);
  if (!decryptedRefreshToken) {
    await updateAccountSyncError(account.id, "Token decryption failed");
    return null;
  }

  try {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
        scope: "openid profile email offline_access Calendars.ReadWrite",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh Microsoft token:", await response.text());
      await updateAccountSyncError(account.id, "Token refresh failed");
      return null;
    }

    const tokens = await response.json();
    
    // Encrypt new tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : account.refreshToken;
    
    await db.update(connectedCalendarAccounts)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(connectedCalendarAccounts.id, account.id));

    return tokens.access_token;
  } catch (error) {
    console.error("Error refreshing Microsoft token:", error);
    return null;
  }
}

// Update account sync error
async function updateAccountSyncError(accountId: string, error: string) {
  await db.update(connectedCalendarAccounts)
    .set({
      syncStatus: "error",
      syncError: error,
      updatedAt: new Date(),
    })
    .where(eq(connectedCalendarAccounts.id, accountId));
}

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(
  account: any,
  startDate: Date,
  endDate: Date
): Promise<CalendarEventData[]> {
  const accessToken = await refreshGoogleToken(account);
  if (!accessToken) return [];

  try {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", startDate.toISOString());
    url.searchParams.set("timeMax", endDate.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch Google events:", errorText);
      // Mark account as error on auth failures
      if (response.status === 401 || response.status === 403) {
        await updateAccountSyncError(account.id, "Authentication failed - please reconnect");
      }
      return [];
    }

    const data = await response.json();
    
    return (data.items || []).map((event: any) => ({
      id: event.id,
      title: event.summary || "Untitled",
      description: event.description,
      startTime: new Date(event.start?.dateTime || event.start?.date),
      endTime: new Date(event.end?.dateTime || event.end?.date),
      isAllDay: !event.start?.dateTime,
      location: event.location,
      status: event.status,
      htmlLink: event.htmlLink,
      organizer: event.organizer ? { email: event.organizer.email, displayName: event.organizer.displayName } : undefined,
      attendees: event.attendees?.map((a: any) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
      })),
      conferenceData: event.conferenceData ? {
        conferenceUrl: event.conferenceData.entryPoints?.[0]?.uri,
        conferenceSolution: event.conferenceData.conferenceSolution?.name,
      } : undefined,
    }));
  } catch (error) {
    console.error("Error fetching Google events:", error);
    return [];
  }
}

// Fetch events from Microsoft Outlook
export async function fetchMicrosoftCalendarEvents(
  account: any,
  startDate: Date,
  endDate: Date
): Promise<CalendarEventData[]> {
  const accessToken = await refreshMicrosoftToken(account);
  if (!accessToken) return [];

  try {
    const url = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
    url.searchParams.set("startDateTime", startDate.toISOString());
    url.searchParams.set("endDateTime", endDate.toISOString());
    url.searchParams.set("$top", "250");
    url.searchParams.set("$orderby", "start/dateTime");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch Microsoft events:", errorText);
      // Mark account as error on auth failures
      if (response.status === 401 || response.status === 403) {
        await updateAccountSyncError(account.id, "Authentication failed - please reconnect");
      }
      return [];
    }

    const data = await response.json();
    
    return (data.value || []).map((event: any) => ({
      id: event.id,
      title: event.subject || "Untitled",
      description: event.bodyPreview,
      startTime: new Date(event.start?.dateTime + "Z"),
      endTime: new Date(event.end?.dateTime + "Z"),
      isAllDay: event.isAllDay,
      location: event.location?.displayName,
      status: event.showAs,
      htmlLink: event.webLink,
      organizer: event.organizer?.emailAddress ? {
        email: event.organizer.emailAddress.address,
        displayName: event.organizer.emailAddress.name,
      } : undefined,
      attendees: event.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        displayName: a.emailAddress?.name,
        responseStatus: a.status?.response,
      })),
      conferenceData: event.onlineMeeting ? {
        conferenceUrl: event.onlineMeeting.joinUrl,
        conferenceSolution: event.onlineMeetingProvider,
      } : undefined,
    }));
  } catch (error) {
    console.error("Error fetching Microsoft events:", error);
    return [];
  }
}

// Push event to Google Calendar
export async function pushEventToGoogle(
  account: any,
  event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    location?: string;
  }
): Promise<string | null> {
  const accessToken = await refreshGoogleToken(account);
  if (!accessToken) return null;

  try {
    const body: any = {
      summary: event.title,
      description: event.description,
      location: event.location,
    };

    if (event.isAllDay) {
      body.start = { date: event.startTime.toISOString().split("T")[0] };
      body.end = { date: event.endTime.toISOString().split("T")[0] };
    } else {
      body.start = { dateTime: event.startTime.toISOString() };
      body.end = { dateTime: event.endTime.toISOString() };
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Failed to create Google event:", await response.text());
      return null;
    }

    const createdEvent = await response.json();
    return createdEvent.id;
  } catch (error) {
    console.error("Error creating Google event:", error);
    return null;
  }
}

// Push event to Microsoft Outlook
export async function pushEventToMicrosoft(
  account: any,
  event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    isAllDay?: boolean;
    location?: string;
  }
): Promise<string | null> {
  const accessToken = await refreshMicrosoftToken(account);
  if (!accessToken) return null;

  try {
    const body: any = {
      subject: event.title,
      body: event.description ? { contentType: "text", content: event.description } : undefined,
      start: {
        dateTime: event.startTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      },
      end: {
        dateTime: event.endTime.toISOString().replace("Z", ""),
        timeZone: "UTC",
      },
      isAllDay: event.isAllDay || false,
    };

    if (event.location) {
      body.location = { displayName: event.location };
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Failed to create Microsoft event:", await response.text());
      return null;
    }

    const createdEvent = await response.json();
    return createdEvent.id;
  } catch (error) {
    console.error("Error creating Microsoft event:", error);
    return null;
  }
}

// Sync external calendar events to local database
export async function syncExternalEventsToLocal(
  account: any,
  startDate: Date,
  endDate: Date
): Promise<void> {
  let events: CalendarEventData[] = [];

  if (account.provider === "google") {
    events = await fetchGoogleCalendarEvents(account, startDate, endDate);
  } else if (account.provider === "microsoft") {
    events = await fetchMicrosoftCalendarEvents(account, startDate, endDate);
  }

  for (const event of events) {
    // Check if event already exists
    const existing = await db.select()
      .from(externalCalendarEvents)
      .where(and(
        eq(externalCalendarEvents.connectedAccountId, account.id),
        eq(externalCalendarEvents.externalEventId, event.id)
      ));

    if (existing.length > 0) {
      // Update existing event
      await db.update(externalCalendarEvents)
        .set({
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          isAllDay: event.isAllDay,
          location: event.location,
          status: event.status,
          organizer: event.organizer,
          attendees: event.attendees,
          htmlLink: event.htmlLink,
          conferenceData: event.conferenceData,
          syncedAt: new Date(),
        })
        .where(eq(externalCalendarEvents.id, existing[0].id));
    } else {
      // Insert new event
      await db.insert(externalCalendarEvents).values({
        connectedAccountId: account.id,
        externalEventId: event.id,
        externalCalendarId: "primary",
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        location: event.location,
        status: event.status,
        organizer: event.organizer,
        attendees: event.attendees,
        htmlLink: event.htmlLink,
        conferenceData: event.conferenceData,
      });
    }
  }

  // Update last synced time
  await db.update(connectedCalendarAccounts)
    .set({
      lastSyncedAt: new Date(),
      syncStatus: "active",
      syncError: null,
      updatedAt: new Date(),
    })
    .where(eq(connectedCalendarAccounts.id, account.id));
}

// Push local event to external calendar
export async function pushLocalEventToExternal(
  eventId: string,
  accountId: string
): Promise<boolean> {
  // Get the local event
  const [event] = await db.select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId));

  if (!event) return false;

  // Get the connected account
  const [account] = await db.select()
    .from(connectedCalendarAccounts)
    .where(eq(connectedCalendarAccounts.id, accountId));

  if (!account) return false;

  let externalId: string | null = null;

  if (account.provider === "google") {
    externalId = await pushEventToGoogle(account, {
      title: event.title,
      description: event.description || undefined,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      isAllDay: event.isAllDay,
      location: event.location || undefined,
    });
  } else if (account.provider === "microsoft") {
    externalId = await pushEventToMicrosoft(account, {
      title: event.title,
      description: event.description || undefined,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      isAllDay: event.isAllDay,
      location: event.location || undefined,
    });
  }

  if (externalId) {
    // Update local event with external ID
    await db.update(calendarEvents)
      .set({
        externalEventId: externalId,
        externalCalendarAccountId: accountId,
        syncedToExternal: true,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, eventId));
    return true;
  }

  return false;
}

// Get all external events for a user within a date range
export async function getExternalEventsForUser(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const accounts = await db.select()
    .from(connectedCalendarAccounts)
    .where(eq(connectedCalendarAccounts.userId, userId));

  const accountIds = accounts.map(a => a.id);
  
  if (accountIds.length === 0) return [];

  const events = await db.select()
    .from(externalCalendarEvents)
    .where(and(
      gte(externalCalendarEvents.startTime, startDate),
      lte(externalCalendarEvents.endTime, endDate)
    ));

  // Filter to only include events from user's connected accounts
  return events.filter(e => accountIds.includes(e.connectedAccountId));
}

// Trigger sync for all connected accounts for a user
export async function syncAllAccountsForUser(userId: string): Promise<void> {
  const accounts = await db.select()
    .from(connectedCalendarAccounts)
    .where(and(
      eq(connectedCalendarAccounts.userId, userId),
      eq(connectedCalendarAccounts.syncStatus, "active")
    ));

  // Sync next 30 days
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  for (const account of accounts) {
    try {
      await syncExternalEventsToLocal(account, startDate, endDate);
    } catch (error) {
      console.error(`Error syncing account ${account.id}:`, error);
      await updateAccountSyncError(account.id, String(error));
    }
  }
}
