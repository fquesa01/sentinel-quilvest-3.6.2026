import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface FamilyInfo {
  familyId: string;
  parentCommunicationId: string;
  attachments: {
    communicationId: string;
    attachmentName: string;
    attachmentSize?: number;
    attachmentType?: string;
    attachmentIndex: number;
  }[];
}

export class DocumentFamilyService {
  private static familyCounter = 0;

  static generateFamilyId(): string {
    this.familyCounter++;
    return `FAM-${String(this.familyCounter).padStart(7, "0")}`;
  }

  static async createFamily(
    caseId: string,
    parentCommunicationId: string,
    attachments: {
      communicationId: string;
      name: string;
      size?: number;
      type?: string;
    }[]
  ): Promise<string> {
    const familyId = this.generateFamilyId();

    const [family] = await db
      .insert(schema.documentFamilies)
      .values({
        caseId,
        familyType: "email_attachments",
        parentDocumentId: parentCommunicationId,
        memberDocumentIds: [parentCommunicationId, ...attachments.map((a) => a.communicationId)],
        hasAttachments: attachments.length > 0 ? "true" : "false",
        attachmentCount: attachments.length,
      })
      .returning();

    await db.insert(schema.documentFamilyMembers).values({
      familyId: family.id,
      communicationId: parentCommunicationId,
      relationship: "parent",
      attachmentIndex: 0,
    });

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      await db.insert(schema.documentFamilyMembers).values({
        familyId: family.id,
        communicationId: attachment.communicationId,
        relationship: "attachment",
        attachmentIndex: i + 1,
        attachmentName: attachment.name,
        attachmentSize: attachment.size ? BigInt(attachment.size) : null,
        attachmentType: attachment.type,
      });
    }

    await db
      .update(schema.communications)
      .set({ documentFamilyId: family.id })
      .where(eq(schema.communications.id, parentCommunicationId));

    for (const attachment of attachments) {
      await db
        .update(schema.communications)
        .set({
          documentFamilyId: family.id,
          parentDocumentId: parentCommunicationId,
        })
        .where(eq(schema.communications.id, attachment.communicationId));
    }

    return family.id;
  }

  static async getFamilyById(familyId: string): Promise<{
    family: schema.DocumentFamily | null;
    members: (schema.DocumentFamilyMember & { communication?: schema.Communication })[];
  }> {
    const [family] = await db
      .select()
      .from(schema.documentFamilies)
      .where(eq(schema.documentFamilies.id, familyId));

    if (!family) {
      return { family: null, members: [] };
    }

    const members = await db
      .select()
      .from(schema.documentFamilyMembers)
      .where(eq(schema.documentFamilyMembers.familyId, familyId))
      .orderBy(schema.documentFamilyMembers.attachmentIndex);

    const membersWithCommunications = await Promise.all(
      members.map(async (member) => {
        const [communication] = await db
          .select()
          .from(schema.communications)
          .where(eq(schema.communications.id, member.communicationId));
        return { ...member, communication };
      })
    );

    return { family, members: membersWithCommunications };
  }

  static async getFamiliesForCase(caseId: string): Promise<schema.DocumentFamily[]> {
    return db
      .select()
      .from(schema.documentFamilies)
      .where(eq(schema.documentFamilies.caseId, caseId))
      .orderBy(sql`${schema.documentFamilies.attachmentCount} DESC`);
  }

  static async getFamilyForDocument(communicationId: string): Promise<{
    family: schema.DocumentFamily | null;
    isParent: boolean;
    members: schema.DocumentFamilyMember[];
  }> {
    const [member] = await db
      .select()
      .from(schema.documentFamilyMembers)
      .where(eq(schema.documentFamilyMembers.communicationId, communicationId));

    if (!member) {
      return { family: null, isParent: false, members: [] };
    }

    const [family] = await db
      .select()
      .from(schema.documentFamilies)
      .where(eq(schema.documentFamilies.id, member.familyId));

    const members = await db
      .select()
      .from(schema.documentFamilyMembers)
      .where(eq(schema.documentFamilyMembers.familyId, member.familyId))
      .orderBy(schema.documentFamilyMembers.attachmentIndex);

    return {
      family,
      isParent: member.relationship === "parent",
      members,
    };
  }

  static async applyTagToFamily(
    familyId: string,
    tagId: string,
    applyToAttachments: boolean = true
  ): Promise<void> {
    const members = await db
      .select()
      .from(schema.documentFamilyMembers)
      .where(eq(schema.documentFamilyMembers.familyId, familyId));

    const targetMembers = applyToAttachments
      ? members
      : members.filter((m) => m.relationship === "parent");

    for (const member of targetMembers) {
      const [existingTag] = await db
        .select()
        .from(schema.communicationTags)
        .where(
          and(
            eq(schema.communicationTags.communicationId, member.communicationId),
            eq(schema.communicationTags.tagId, tagId)
          )
        );

      if (!existingTag) {
        await db.insert(schema.communicationTags).values({
          communicationId: member.communicationId,
          tagId,
        });
      }
    }
  }

  static async processEmailWithAttachments(
    caseId: string,
    parentEmailId: string,
    attachmentMetadata: {
      id: string;
      name: string;
      size?: number;
      type?: string;
    }[]
  ): Promise<string | null> {
    if (attachmentMetadata.length === 0) {
      return null;
    }

    const [existingMember] = await db
      .select()
      .from(schema.documentFamilyMembers)
      .where(eq(schema.documentFamilyMembers.communicationId, parentEmailId));

    if (existingMember) {
      return existingMember.familyId;
    }

    return this.createFamily(
      caseId,
      parentEmailId,
      attachmentMetadata.map((a) => ({
        communicationId: a.id,
        name: a.name,
        size: a.size,
        type: a.type,
      }))
    );
  }

  static async runCaseFamilyGrouping(
    caseId: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{
    totalDocuments: number;
    familiesCreated: number;
    attachmentsGrouped: number;
  }> {
    const emails = await db
      .select()
      .from(schema.communications)
      .where(
        and(
          eq(schema.communications.caseId, caseId),
          eq(schema.communications.containsAttachments, "true")
        )
      );

    const total = emails.length;
    let processed = 0;
    let familiesCreated = 0;
    let attachmentsGrouped = 0;

    for (const email of emails) {
      const attachmentIds = email.attachmentIds as string[] | null;
      
      if (attachmentIds && attachmentIds.length > 0) {
        const attachmentMetadata: { id: string; name: string; size?: number; type?: string }[] = [];
        
        for (const attachmentId of attachmentIds) {
          const [attachment] = await db
            .select()
            .from(schema.communications)
            .where(eq(schema.communications.id, attachmentId));
          
          if (attachment) {
            attachmentMetadata.push({
              id: attachment.id,
              name: attachment.subject || "Attachment",
              size: attachment.fileSize || undefined,
              type: attachment.mimeType || undefined,
            });
          }
        }

        if (attachmentMetadata.length > 0) {
          const familyId = await this.processEmailWithAttachments(
            caseId,
            email.id,
            attachmentMetadata
          );
          
          if (familyId) {
            familiesCreated++;
            attachmentsGrouped += attachmentMetadata.length;
          }
        }
      }

      processed++;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    return {
      totalDocuments: total,
      familiesCreated,
      attachmentsGrouped,
    };
  }
}

export default DocumentFamilyService;
