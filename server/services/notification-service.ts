import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Parse @mentions from text and extract user IDs
 * Supports formats:
 * - @userId (direct ID mention)
 * - @username (name-based mention, requires lookup)
 */
export function parseMentions(text: string): string[] {
  if (!text) return [];

  // Match @userId pattern (UUID format)
  const uuidRegex = /@([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  const matches = text.matchAll(uuidRegex);
  
  const userIds = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      userIds.add(match[1]);
    }
  }
  
  return Array.from(userIds);
}

/**
 * Create notification for a user
 */
export async function createNotification(
  recipientUserId: string,
  type: "annotation_mention" | "case_assignment" | "document_review_request" | "alert_escalation" | "system",
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>
): Promise<typeof schema.notifications.$inferSelect> {
  const [notification] = await db.insert(schema.notifications).values({
    recipientUserId,
    type,
    title,
    message,
    actionUrl,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    isRead: false,
    emailSent: false,
  }).returning();

  return notification;
}

/**
 * Save annotation mentions to database
 */
export async function saveAnnotationMentions(
  documentCodingId: string,
  mentionedUserIds: string[],
  mentionedBy: string
): Promise<void> {
  // First, delete all existing mentions for this document coding to avoid duplicates
  await db
    .delete(schema.annotationMentions)
    .where(eq(schema.annotationMentions.documentCodingId, documentCodingId));

  if (mentionedUserIds.length === 0) return;

  // De-duplicate and filter out self-mentions
  const uniqueUserIds = Array.from(new Set(mentionedUserIds))
    .filter(userId => userId !== mentionedBy);

  if (uniqueUserIds.length === 0) return;

  await db.insert(schema.annotationMentions).values(
    uniqueUserIds.map(userId => ({
      documentCodingId,
      mentionedUserId: userId,
      mentionedBy,
    }))
  );
}

/**
 * Get notifications for a user
 */
export async function getNotificationsForUser(
  userId: string,
  unreadOnly = false
): Promise<typeof schema.notifications.$inferSelect[]> {
  const query = db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.recipientUserId, userId))
    .orderBy(schema.notifications.createdAt);

  if (unreadOnly) {
    query.where(eq(schema.notifications.isRead, false));
  }

  return await query;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await db
    .update(schema.notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(eq(schema.notifications.id, notificationId));
}

/**
 * Send email notification via SendGrid
 */
export async function sendEmailNotification(
  notification: typeof schema.notifications.$inferSelect,
  userEmail: string,
  userName?: string
): Promise<boolean> {
  try {
    // Import email service dynamically to avoid circular dependencies
    const { emailService } = await import('./email-service');
    
    const success = await emailService.sendNotificationEmail({
      recipientName: userName || 'User',
      recipientEmail: userEmail,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl || undefined,
      actionText: 'View Details',
    });

    if (success) {
      // Mark as sent in database
      await db
        .update(schema.notifications)
        .set({
          emailSent: true,
          emailSentAt: new Date(),
        })
        .where(eq(schema.notifications.id, notification.id));
      
      console.log(`[Notification] Email sent to ${userEmail}: ${notification.title}`);
    }

    return success;
  } catch (error) {
    console.error("Error sending email notification:", error);
    return false;
  }
}
