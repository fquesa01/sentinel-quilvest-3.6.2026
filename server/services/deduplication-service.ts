import crypto from "crypto";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
  fileSize: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  masterDocumentId?: string;
  existingHashId?: string;
}

export interface NearDuplicateResult {
  clusterId?: string;
  similarityScore: number;
  isPrimary: boolean;
}

export class DeduplicationService {
  private static SHINGLE_SIZE = 5;
  private static NUM_HASHES = 100;
  private static SIMILARITY_THRESHOLD = 85;

  static calculateHashes(content: string | Buffer): HashResult {
    const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    
    return {
      md5: crypto.createHash("md5").update(buffer).digest("hex"),
      sha1: crypto.createHash("sha1").update(buffer).digest("hex"),
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      fileSize: buffer.length,
    };
  }

  static async storeDocumentHash(
    communicationId: string,
    hashes: HashResult
  ): Promise<string> {
    const [hashRecord] = await db
      .insert(schema.documentHashes)
      .values({
        communicationId,
        md5Hash: hashes.md5,
        sha1Hash: hashes.sha1,
        sha256Hash: hashes.sha256,
        fileSize: hashes.fileSize,
        isDuplicate: false,
      })
      .returning();

    return hashRecord.id;
  }

  static async checkForExactDuplicate(
    hashes: HashResult,
    excludeDocumentId?: string
  ): Promise<DuplicateCheckResult> {
    const conditions = [eq(schema.documentHashes.sha256Hash, hashes.sha256)];
    
    if (excludeDocumentId) {
      conditions.push(sql`${schema.documentHashes.communicationId} != ${excludeDocumentId}`);
    }

    const [existing] = await db
      .select()
      .from(schema.documentHashes)
      .where(and(...conditions))
      .limit(1);

    if (existing) {
      const masterId = existing.isDuplicate 
        ? existing.masterDocumentId 
        : existing.communicationId;

      return {
        isDuplicate: true,
        masterDocumentId: masterId || existing.communicationId || undefined,
        existingHashId: existing.id,
      };
    }

    return { isDuplicate: false };
  }

  static async markAsDuplicate(
    communicationId: string,
    masterDocumentId: string
  ): Promise<void> {
    await db
      .update(schema.documentHashes)
      .set({
        isDuplicate: true,
        masterDocumentId,
      })
      .where(eq(schema.documentHashes.communicationId, communicationId));

    await db
      .update(schema.communications)
      .set({
        isDuplicate: "true",
        masterDocumentId,
      })
      .where(eq(schema.communications.id, communicationId));
  }

  static generateShingles(text: string): Set<string> {
    const normalizedText = text.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalizedText.split(" ");
    const shingles = new Set<string>();

    for (let i = 0; i <= words.length - this.SHINGLE_SIZE; i++) {
      const shingle = words.slice(i, i + this.SHINGLE_SIZE).join(" ");
      shingles.add(shingle);
    }

    return shingles;
  }

  static hashShingle(shingle: string, seed: number): number {
    const hash = crypto.createHash("md5").update(shingle + seed.toString()).digest();
    return hash.readUInt32BE(0);
  }

  static generateMinHashSignature(shingles: Set<string>): number[] {
    const signature: number[] = [];
    const shingleArray = Array.from(shingles);

    for (let i = 0; i < this.NUM_HASHES; i++) {
      let minHash = Infinity;
      for (const shingle of shingleArray) {
        const hashValue = this.hashShingle(shingle, i);
        if (hashValue < minHash) {
          minHash = hashValue;
        }
      }
      signature.push(minHash === Infinity ? 0 : minHash);
    }

    return signature;
  }

  static calculateJaccardSimilarity(sig1: number[], sig2: number[]): number {
    if (sig1.length !== sig2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) {
        matches++;
      }
    }
    
    return Math.round((matches / sig1.length) * 100);
  }

  static async findNearDuplicates(
    communicationId: string,
    content: string,
    caseId: string,
    threshold: number = this.SIMILARITY_THRESHOLD
  ): Promise<NearDuplicateResult> {
    const shingles = this.generateShingles(content);
    
    if (shingles.size === 0) {
      return { similarityScore: 0, isPrimary: true };
    }

    const signature = this.generateMinHashSignature(shingles);
    const signatureStr = JSON.stringify(signature);

    const existingMembers = await db
      .select({
        id: schema.nearDuplicateMembers.id,
        clusterId: schema.nearDuplicateMembers.clusterId,
        communicationId: schema.nearDuplicateMembers.communicationId,
        signature: schema.nearDuplicateMembers.minHashSignature,
        isPrimary: schema.nearDuplicateMembers.isPrimary,
      })
      .from(schema.nearDuplicateMembers)
      .innerJoin(
        schema.nearDuplicateClusters,
        eq(schema.nearDuplicateMembers.clusterId, schema.nearDuplicateClusters.id)
      )
      .where(eq(schema.nearDuplicateClusters.caseId, caseId));

    let bestMatch: { clusterId: string; similarity: number } | null = null;

    for (const member of existingMembers) {
      if (!member.signature || member.communicationId === communicationId) continue;
      
      try {
        const existingSignature = JSON.parse(member.signature);
        const similarity = this.calculateJaccardSimilarity(signature, existingSignature);
        
        if (similarity >= threshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { clusterId: member.clusterId, similarity };
          }
        }
      } catch {
        continue;
      }
    }

    if (bestMatch) {
      await db.insert(schema.nearDuplicateMembers).values({
        clusterId: bestMatch.clusterId,
        communicationId,
        similarityScore: bestMatch.similarity,
        isPrimary: false,
        minHashSignature: signatureStr,
      });

      await db
        .update(schema.nearDuplicateClusters)
        .set({
          documentCount: sql`${schema.nearDuplicateClusters.documentCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.nearDuplicateClusters.id, bestMatch.clusterId));

      await db
        .update(schema.communications)
        .set({
          nearDuplicateGroupId: bestMatch.clusterId,
        })
        .where(eq(schema.communications.id, communicationId));

      return {
        clusterId: bestMatch.clusterId,
        similarityScore: bestMatch.similarity,
        isPrimary: false,
      };
    }

    const [newCluster] = await db
      .insert(schema.nearDuplicateClusters)
      .values({
        caseId,
        clusterName: `Cluster-${Date.now()}`,
        similarityThreshold: threshold,
        documentCount: 1,
        primaryDocumentId: communicationId,
        representativeText: content.substring(0, 500),
      })
      .returning();

    await db.insert(schema.nearDuplicateMembers).values({
      clusterId: newCluster.id,
      communicationId,
      similarityScore: 100,
      isPrimary: true,
      minHashSignature: signatureStr,
    });

    await db
      .update(schema.communications)
      .set({
        nearDuplicateGroupId: newCluster.id,
      })
      .where(eq(schema.communications.id, communicationId));

    return {
      clusterId: newCluster.id,
      similarityScore: 100,
      isPrimary: true,
    };
  }

  static async processDocument(
    communicationId: string,
    content: string,
    caseId: string
  ): Promise<{
    hashes: HashResult;
    duplicateResult: DuplicateCheckResult;
    nearDuplicateResult?: NearDuplicateResult;
  }> {
    const hashes = this.calculateHashes(content);
    
    const duplicateResult = await this.checkForExactDuplicate(hashes, communicationId);
    
    if (duplicateResult.isDuplicate && duplicateResult.masterDocumentId) {
      await this.markAsDuplicate(communicationId, duplicateResult.masterDocumentId);
      await this.storeDocumentHash(communicationId, hashes);
      
      return { hashes, duplicateResult };
    }

    await this.storeDocumentHash(communicationId, hashes);
    
    const nearDuplicateResult = await this.findNearDuplicates(
      communicationId,
      content,
      caseId
    );

    return { hashes, duplicateResult, nearDuplicateResult };
  }

  static async getDuplicateClusters(caseId: string): Promise<{
    clusters: schema.NearDuplicateCluster[];
    members: Map<string, schema.NearDuplicateMember[]>;
  }> {
    const clusters = await db
      .select()
      .from(schema.nearDuplicateClusters)
      .where(eq(schema.nearDuplicateClusters.caseId, caseId))
      .orderBy(sql`${schema.nearDuplicateClusters.documentCount} DESC`);

    const members = new Map<string, schema.NearDuplicateMember[]>();

    for (const cluster of clusters) {
      const clusterMembers = await db
        .select()
        .from(schema.nearDuplicateMembers)
        .where(eq(schema.nearDuplicateMembers.clusterId, cluster.id))
        .orderBy(sql`${schema.nearDuplicateMembers.isPrimary} DESC`);
      
      members.set(cluster.id, clusterMembers);
    }

    return { clusters, members };
  }

  static async setClusterPrimary(
    clusterId: string,
    newPrimaryDocumentId: string
  ): Promise<void> {
    await db
      .update(schema.nearDuplicateMembers)
      .set({ isPrimary: false })
      .where(eq(schema.nearDuplicateMembers.clusterId, clusterId));

    await db
      .update(schema.nearDuplicateMembers)
      .set({ isPrimary: true })
      .where(
        and(
          eq(schema.nearDuplicateMembers.clusterId, clusterId),
          eq(schema.nearDuplicateMembers.communicationId, newPrimaryDocumentId)
        )
      );

    await db
      .update(schema.nearDuplicateClusters)
      .set({
        primaryDocumentId: newPrimaryDocumentId,
        updatedAt: new Date(),
      })
      .where(eq(schema.nearDuplicateClusters.id, clusterId));
  }

  static async getExactDuplicates(caseId: string): Promise<{
    masterDocumentId: string;
    duplicates: string[];
  }[]> {
    const duplicates = await db
      .select({
        masterDocumentId: schema.documentHashes.masterDocumentId,
        communicationId: schema.documentHashes.communicationId,
      })
      .from(schema.documentHashes)
      .innerJoin(
        schema.communications,
        eq(schema.documentHashes.communicationId, schema.communications.id)
      )
      .where(
        and(
          eq(schema.documentHashes.isDuplicate, true),
          eq(schema.communications.caseId, caseId)
        )
      );

    const groupedDuplicates = new Map<string, string[]>();
    
    for (const dup of duplicates) {
      if (!dup.masterDocumentId) continue;
      
      const existing = groupedDuplicates.get(dup.masterDocumentId) || [];
      if (dup.communicationId) {
        existing.push(dup.communicationId);
      }
      groupedDuplicates.set(dup.masterDocumentId, existing);
    }

    return Array.from(groupedDuplicates.entries()).map(([masterDocumentId, duplicates]) => ({
      masterDocumentId,
      duplicates,
    }));
  }

  static async runCaseDeduplication(
    caseId: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<{
    totalDocuments: number;
    exactDuplicates: number;
    nearDuplicateClusters: number;
  }> {
    const communications = await db
      .select()
      .from(schema.communications)
      .where(eq(schema.communications.caseId, caseId));

    const total = communications.length;
    let processed = 0;
    let exactDuplicates = 0;
    const clusterIds = new Set<string>();

    for (const comm of communications) {
      const content = comm.body || comm.subject || "";
      
      const result = await this.processDocument(comm.id, content, caseId);
      
      if (result.duplicateResult.isDuplicate) {
        exactDuplicates++;
      }
      
      if (result.nearDuplicateResult?.clusterId) {
        clusterIds.add(result.nearDuplicateResult.clusterId);
      }

      processed++;
      if (onProgress) {
        onProgress(processed, total);
      }
    }

    return {
      totalDocuments: total,
      exactDuplicates,
      nearDuplicateClusters: clusterIds.size,
    };
  }
}

export default DeduplicationService;
