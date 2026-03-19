import { db } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "@shared/schema";

export async function getVisibleUserIds(req: any): Promise<string[] | null> {
  const dbUser = req.dbUser;
  if (!dbUser) return [];
  if (dbUser.role === "admin") return null;
  if (dbUser.userType === "corporate") {
    const [membership] = await db.select().from(schema.organizationMembers).where(eq(schema.organizationMembers.userId, dbUser.id));
    if (membership) {
      const members = await db.select({ userId: schema.organizationMembers.userId }).from(schema.organizationMembers).where(eq(schema.organizationMembers.organizationId, membership.organizationId));
      return members.map(m => m.userId);
    }
  }
  return [dbUser.id];
}

export async function checkDealVisibility(req: any, dealId: string): Promise<boolean> {
  const visibleIds = await getVisibleUserIds(req);
  if (!visibleIds) return true;
  if (visibleIds.length === 0) return false;
  const [deal] = await db.select({ createdBy: schema.deals.createdBy }).from(schema.deals).where(eq(schema.deals.id, dealId));
  if (!deal) return false;
  return deal.createdBy ? visibleIds.includes(deal.createdBy) : false;
}
