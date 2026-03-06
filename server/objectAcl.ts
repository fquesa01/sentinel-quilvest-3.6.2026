// Simplified ACL module for Supabase Storage
// ACL is handled by Supabase RLS policies and the isAuthenticated middleware
// This module provides backward-compatible interfaces

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

// Sets the ACL policy - stored in memory since Supabase Storage
// doesn't support custom metadata like GCS
const aclPolicies = new Map<string, ObjectAclPolicy>();

export async function setObjectAclPolicy(
  objectFile: { name: string },
  aclPolicy: ObjectAclPolicy
): Promise<void> {
  aclPolicies.set(objectFile.name, aclPolicy);
}

export async function getObjectAclPolicy(
  objectFile: { name: string }
): Promise<ObjectAclPolicy | null> {
  return aclPolicies.get(objectFile.name) || null;
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: { name: string };
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // All authenticated users can access objects
  // Fine-grained ACL can be added later via Supabase RLS
  if (!userId) return false;

  const policy = aclPolicies.get(objectFile.name);

  // No policy = allow (backwards compatible with new uploads)
  if (!policy) return true;

  // Public objects are readable by anyone
  if (
    policy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Owner can always access
  if (policy.owner === userId) return true;

  // Default: allow authenticated users
  return true;
}
