import { Client } from "@microsoft/microsoft-graph-client";
import { google } from "googleapis";
import { db } from "../db";
import { emailAccounts, syncedEmails, emailAttachmentsTable } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY environment variable is required for email token encryption. Generate one with: openssl rand -base64 32");
  }
  return Buffer.from(key, "base64");
}

export function encrypt(text: string): string {
  const KEY = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decrypt(text: string): string {
  const KEY = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const MS_AUTHORITY = "https://login.microsoftonline.com/common";
const MS_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Mail.Read",
  "Mail.ReadWrite",
  "Mail.Send",
];

export function getMicrosoftAuthUrl(state: string): string {
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 
    `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/email/oauth/microsoft/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || "",
    response_type: "code",
    redirect_uri: redirectUri,
    scope: MS_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `${MS_AUTHORITY}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(code: string) {
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 
    `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/email/oauth/microsoft/callback`;

  const response = await fetch(`${MS_AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed: ${await response.text()}`);
  }

  return response.json();
}

export async function refreshMicrosoftToken(refreshToken: string) {
  const response = await fetch(`${MS_AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID || "",
      client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Microsoft token refresh failed: ${await response.text()}`);
  }

  return response.json();
}

function getMicrosoftClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function getGoogleAuthUrl(state: string): string {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/email/oauth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    state,
    prompt: "consent",
  });
}

export async function exchangeGoogleCode(code: string) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/email/oauth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshGoogleToken(refreshToken: string) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/api/email/oauth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function saveEmailAccount(
  userId: string,
  provider: "microsoft" | "google",
  tokens: any,
  userInfo: { email: string; name?: string }
) {
  const existing = await db.query.emailAccounts.findFirst({
    where: and(
      eq(emailAccounts.userId, userId),
      eq(emailAccounts.email, userInfo.email)
    ),
  });

  const accountData = {
    userId,
    provider,
    email: userInfo.email,
    displayName: userInfo.name || null,
    accessToken: encrypt(tokens.access_token),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    tokenExpiresAt: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null,
    syncEnabled: true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(emailAccounts)
      .set(accountData)
      .where(eq(emailAccounts.id, existing.id));
    return existing.id;
  } else {
    const [newAccount] = await db.insert(emailAccounts)
      .values(accountData)
      .returning({ id: emailAccounts.id });
    return newAccount.id;
  }
}

export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, accountId),
  });

  if (!account) throw new Error("Account not found");

  const isExpired = account.tokenExpiresAt &&
    account.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

  if (isExpired && account.refreshToken) {
    const decryptedRefresh = decrypt(account.refreshToken);

    let newTokens;
    if (account.provider === "microsoft") {
      newTokens = await refreshMicrosoftToken(decryptedRefresh);
    } else {
      newTokens = await refreshGoogleToken(decryptedRefresh);
    }

    await db.update(emailAccounts)
      .set({
        accessToken: encrypt(newTokens.access_token),
        refreshToken: newTokens.refresh_token
          ? encrypt(newTokens.refresh_token)
          : account.refreshToken,
        tokenExpiresAt: new Date(Date.now() + (newTokens.expires_in || 3600) * 1000),
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    return newTokens.access_token;
  }

  return decrypt(account.accessToken);
}

export async function syncMicrosoftEmails(accountId: string, fullSync = false) {
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, accountId),
  });

  if (!account || account.provider !== "microsoft") {
    throw new Error("Invalid Microsoft account");
  }

  await db.update(emailAccounts)
    .set({ syncStatus: "syncing", updatedAt: new Date() })
    .where(eq(emailAccounts.id, accountId));

  try {
    const accessToken = await getValidAccessToken(accountId);
    const client = getMicrosoftClient(accessToken);

    let messages: any[] = [];
    let deltaLink: string | null = null;

    if (fullSync || !account.syncCursor) {
      const response = await client
        .api("/me/messages")
        .select("id,conversationId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,sentDateTime,receivedDateTime,isRead,importance,isDraft,hasAttachments")
        .top(500)
        .orderby("receivedDateTime desc")
        .get();

      messages = response.value;
      deltaLink = response["@odata.deltaLink"];
    } else {
      const response = await client.api(account.syncCursor).get();
      messages = response.value;
      deltaLink = response["@odata.deltaLink"];
    }

    for (const msg of messages) {
      await upsertEmail(accountId, {
        externalId: msg.id,
        conversationId: msg.conversationId,
        subject: msg.subject,
        snippet: msg.bodyPreview,
        bodyHtml: msg.body?.contentType === "html" ? msg.body.content : null,
        bodyText: msg.body?.contentType === "text" ? msg.body.content : null,
        fromAddress: msg.from?.emailAddress?.address,
        fromName: msg.from?.emailAddress?.name,
        toRecipients: msg.toRecipients?.map((r: any) => ({
          email: r.emailAddress.address,
          name: r.emailAddress.name,
        })) || [],
        ccRecipients: msg.ccRecipients?.map((r: any) => ({
          email: r.emailAddress.address,
          name: r.emailAddress.name,
        })) || [],
        sentAt: msg.sentDateTime ? new Date(msg.sentDateTime) : null,
        receivedAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
        isRead: msg.isRead,
        isDraft: msg.isDraft,
        importance: msg.importance?.toLowerCase() || "normal",
        folder: msg.isDraft ? "drafts" : "inbox",
      });

      if (msg.hasAttachments) {
        try {
          const attachments = await client
            .api(`/me/messages/${msg.id}/attachments`)
            .select("id,name,contentType,size")
            .get();

          for (const att of attachments.value) {
            await upsertAttachment(msg.id, accountId, {
              externalId: att.id,
              filename: att.name,
              mimeType: att.contentType,
              size: att.size,
            });
          }
        } catch (attError) {
          console.error("Error fetching attachments:", attError);
        }
      }
    }

    await db.update(emailAccounts)
      .set({
        syncCursor: deltaLink,
        lastSyncAt: new Date(),
        syncStatus: "idle",
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    return { synced: messages.length };

  } catch (error: any) {
    await db.update(emailAccounts)
      .set({
        syncStatus: "error",
        syncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    throw error;
  }
}

export async function syncGoogleEmails(accountId: string, fullSync = false) {
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, accountId),
  });

  if (!account || account.provider !== "google") {
    throw new Error("Invalid Google account");
  }

  await db.update(emailAccounts)
    .set({ syncStatus: "syncing", updatedAt: new Date() })
    .where(eq(emailAccounts.id, accountId));

  try {
    const accessToken = await getValidAccessToken(accountId);
    const gmail = getGmailClient(accessToken);

    let messageIds: string[] = [];
    let historyId: string | null = null;

    if (fullSync || !account.syncCursor) {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 500,
        q: "in:inbox OR in:sent",
      });

      messageIds = listResponse.data.messages?.map((m) => m.id!) || [];

      const profile = await gmail.users.getProfile({ userId: "me" });
      historyId = profile.data.historyId || null;
    } else {
      const historyResponse = await gmail.users.history.list({
        userId: "me",
        startHistoryId: account.syncCursor,
        historyTypes: ["messageAdded", "messageDeleted"],
      });

      const history = historyResponse.data.history || [];
      for (const h of history) {
        if (h.messagesAdded) {
          messageIds.push(...h.messagesAdded.map((m) => m.message?.id!).filter(Boolean));
        }
      }

      historyId = historyResponse.data.historyId || account.syncCursor;
    }

    for (const msgId of messageIds) {
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: msgId,
          format: "full",
        });

        const headers = msg.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;

        let bodyHtml = "";
        let bodyText = "";
        const parts = msg.data.payload?.parts || [];

        const extractBodyParts = (messageParts: any[], result: { html: string; text: string }) => {
          for (const part of messageParts) {
            if (part.mimeType === "text/html" && part.body?.data) {
              result.html = Buffer.from(part.body.data, "base64").toString("utf8");
            } else if (part.mimeType === "text/plain" && part.body?.data) {
              result.text = Buffer.from(part.body.data, "base64").toString("utf8");
            } else if (part.parts) {
              extractBodyParts(part.parts, result);
            }
          }
        };

        if (msg.data.payload?.body?.data) {
          const content = Buffer.from(msg.data.payload.body.data, "base64").toString("utf8");
          if (msg.data.payload.mimeType === "text/html") {
            bodyHtml = content;
          } else {
            bodyText = content;
          }
        } else {
          const bodyResult = { html: "", text: "" };
          extractBodyParts(parts, bodyResult);
          bodyHtml = bodyResult.html;
          bodyText = bodyResult.text;
        }

        const parseAddress = (header: string | undefined | null): { email: string; name: string } => {
          if (!header) return { email: "", name: "" };
          const match = header.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
          return match
            ? { email: match[2], name: match[1] || "" }
            : { email: header, name: "" };
        };

        const parseAddresses = (header: string | undefined | null): { email: string; name: string }[] => {
          if (!header) return [];
          return header.split(",").map((addr) => parseAddress(addr.trim()));
        };

        const from = parseAddress(getHeader("From") ?? null);
        const labels = msg.data.labelIds || [];

        await upsertEmail(accountId, {
          externalId: msg.data.id!,
          threadId: msg.data.threadId,
          subject: getHeader("Subject") || "(no subject)",
          snippet: msg.data.snippet || "",
          bodyHtml,
          bodyText,
          fromAddress: from.email,
          fromName: from.name,
          toRecipients: parseAddresses(getHeader("To") ?? null),
          ccRecipients: parseAddresses(getHeader("Cc") ?? null),
          sentAt: msg.data.internalDate
            ? new Date(parseInt(msg.data.internalDate))
            : null,
          receivedAt: msg.data.internalDate
            ? new Date(parseInt(msg.data.internalDate))
            : null,
          isRead: !labels.includes("UNREAD"),
          isDraft: labels.includes("DRAFT"),
          folder: labels.includes("SENT") ? "sent" : "inbox",
          importance: labels.includes("IMPORTANT") ? "high" : "normal",
        });

        const attachmentParts = parts.filter((p) => p.filename && p.body?.attachmentId);
        for (const att of attachmentParts) {
          await upsertAttachment(msg.data.id!, accountId, {
            externalId: att.body?.attachmentId,
            filename: att.filename!,
            mimeType: att.mimeType || "application/octet-stream",
            size: att.body?.size || 0,
          });
        }
      } catch (msgError) {
        console.error(`Error processing message ${msgId}:`, msgError);
      }
    }

    await db.update(emailAccounts)
      .set({
        syncCursor: historyId,
        lastSyncAt: new Date(),
        syncStatus: "idle",
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    return { synced: messageIds.length };

  } catch (error: any) {
    await db.update(emailAccounts)
      .set({
        syncStatus: "error",
        syncError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    throw error;
  }
}

async function upsertEmail(accountId: string, data: any) {
  const existing = await db.query.syncedEmails.findFirst({
    where: and(
      eq(syncedEmails.accountId, accountId),
      eq(syncedEmails.externalId, data.externalId)
    ),
  });

  if (existing) {
    await db.update(syncedEmails)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(syncedEmails.id, existing.id));
    return existing.id;
  } else {
    const [newEmail] = await db.insert(syncedEmails)
      .values({ accountId, ...data })
      .returning({ id: syncedEmails.id });
    return newEmail.id;
  }
}

async function upsertAttachment(emailExternalId: string, accountId: string, data: any) {
  const email = await db.query.syncedEmails.findFirst({
    where: and(
      eq(syncedEmails.accountId, accountId),
      eq(syncedEmails.externalId, emailExternalId)
    ),
  });

  if (!email) return;

  const existing = await db.query.emailAttachmentsTable.findFirst({
    where: and(
      eq(emailAttachmentsTable.emailId, email.id),
      eq(emailAttachmentsTable.externalId, data.externalId)
    ),
  });

  if (!existing) {
    await db.insert(emailAttachmentsTable).values({
      emailId: email.id,
      ...data,
    });
  }
}

export async function sendEmail(
  accountId: string,
  options: {
    to: { email: string; name?: string }[];
    cc?: { email: string; name?: string }[];
    bcc?: { email: string; name?: string }[];
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    replyToMessageId?: string;
  }
) {
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, accountId),
  });

  if (!account) throw new Error("Account not found");

  const accessToken = await getValidAccessToken(accountId);

  if (account.provider === "microsoft") {
    const client = getMicrosoftClient(accessToken);

    const message: any = {
      subject: options.subject,
      body: {
        contentType: "HTML",
        content: options.bodyHtml,
      },
      toRecipients: options.to.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    };

    if (options.cc?.length) {
      message.ccRecipients = options.cc.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      }));
    }

    if (options.bcc?.length) {
      message.bccRecipients = options.bcc.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      }));
    }

    if (options.replyToMessageId) {
      await client
        .api(`/me/messages/${options.replyToMessageId}/reply`)
        .post({ message, comment: options.bodyHtml });
    } else {
      await client.api("/me/sendMail").post({ message });
    }

  } else {
    const gmail = getGmailClient(accessToken);

    const formatAddress = (r: { email: string; name?: string }) =>
      r.name ? `"${r.name}" <${r.email}>` : r.email;

    const headers = [
      `To: ${options.to.map(formatAddress).join(", ")}`,
      `Subject: ${options.subject}`,
      `Content-Type: text/html; charset=utf-8`,
    ];

    if (options.cc?.length) {
      headers.push(`Cc: ${options.cc.map(formatAddress).join(", ")}`);
    }

    const raw = Buffer.from(
      headers.join("\r\n") + "\r\n\r\n" + options.bodyHtml
    ).toString("base64url");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId: options.replyToMessageId || undefined,
      },
    });
  }

  setTimeout(() => {
    if (account.provider === "microsoft") {
      syncMicrosoftEmails(accountId);
    } else {
      syncGoogleEmails(accountId);
    }
  }, 2000);

  return { success: true };
}

export async function getUserEmailAccounts(userId: string) {
  return db.query.emailAccounts.findMany({
    where: eq(emailAccounts.userId, userId),
  });
}

export async function getAccountEmails(
  accountId: string,
  options: { folder?: string; limit?: number; offset?: number; search?: string } = {}
) {
  const { folder = "inbox", limit = 50, offset = 0, search } = options;

  let query = db.select().from(syncedEmails)
    .where(and(
      eq(syncedEmails.accountId, accountId),
      folder !== "all" ? eq(syncedEmails.folder, folder) : undefined
    ))
    .orderBy(desc(syncedEmails.receivedAt))
    .limit(limit)
    .offset(offset);

  return query;
}

export async function getEmailById(emailId: string) {
  return db.query.syncedEmails.findFirst({
    where: eq(syncedEmails.id, emailId),
  });
}

export async function markEmailAsRead(emailId: string, isRead: boolean = true) {
  await db.update(syncedEmails)
    .set({ isRead, updatedAt: new Date() })
    .where(eq(syncedEmails.id, emailId));
}

export async function starEmail(emailId: string, isStarred: boolean = true) {
  await db.update(syncedEmails)
    .set({ isStarred, updatedAt: new Date() })
    .where(eq(syncedEmails.id, emailId));
}

export async function tagEmailWithMatter(emailId: string, matterId: string | null, privilegeStatus?: string) {
  await db.update(syncedEmails)
    .set({
      matterId,
      privilegeStatus: privilegeStatus || null,
      updatedAt: new Date(),
    })
    .where(eq(syncedEmails.id, emailId));
}
