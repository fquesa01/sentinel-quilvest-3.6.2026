import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc, asc, sql, inArray, isNull, ne } from "drizzle-orm";
import type { PredictionCategoryType, PredictionModelStatusType } from "@shared/schema";

interface KeywordScore {
  keyword: string;
  weight: number;
  category: PredictionCategoryType;
}

interface PredictionResult {
  communicationId: string;
  predictedCategory: PredictionCategoryType;
  confidenceScore: number;
  responsiveScore: number;
  nonResponsiveScore: number;
  privilegedScore: number;
  hotScore: number;
  matchedKeywords: string[];
  explanationText: string;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export class TARService {
  private static readonly STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
    "used", "this", "that", "these", "those", "i", "you", "he", "she", "it",
    "we", "they", "what", "which", "who", "whom", "whose", "where", "when",
    "why", "how", "all", "each", "every", "both", "few", "more", "most",
    "other", "some", "such", "no", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "also", "now", "here", "there", "then",
  ]);

  static async createModel(
    caseId: string,
    name: string,
    description: string | null,
    createdBy: string
  ): Promise<schema.PredictionModel> {
    const [model] = await db
      .insert(schema.predictionModels)
      .values({
        caseId,
        name,
        description,
        status: "pending",
        modelType: "keyword_similarity",
        createdBy,
      })
      .returning();

    return model;
  }

  static async getModelsForCase(caseId: string): Promise<schema.PredictionModel[]> {
    return db
      .select()
      .from(schema.predictionModels)
      .where(eq(schema.predictionModels.caseId, caseId))
      .orderBy(desc(schema.predictionModels.createdAt));
  }

  static async getModelById(modelId: string): Promise<schema.PredictionModel | null> {
    const [model] = await db
      .select()
      .from(schema.predictionModels)
      .where(eq(schema.predictionModels.id, modelId));

    return model || null;
  }

  static async addTrainingSample(
    modelId: string,
    communicationId: string,
    category: PredictionCategoryType,
    reviewerId: string,
    reviewNotes?: string,
    confidence: number = 1.0
  ): Promise<schema.TrainingSample> {
    const [comm] = await db
      .select({ body: schema.communications.body, subject: schema.communications.subject })
      .from(schema.communications)
      .where(eq(schema.communications.id, communicationId));

    const documentText = `${comm?.subject || ""} ${comm?.body || ""}`;
    const extractedKeywords = this.extractKeywords(documentText);

    const [sample] = await db
      .insert(schema.trainingSamples)
      .values({
        modelId,
        communicationId,
        category,
        confidence,
        reviewerId,
        reviewNotes,
        documentText,
        extractedKeywords,
      })
      .returning();

    await db
      .update(schema.predictionModels)
      .set({
        trainingSize: sql`${schema.predictionModels.trainingSize} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.predictionModels.id, modelId));

    return sample;
  }

  static async getTrainingSamples(modelId: string): Promise<schema.TrainingSample[]> {
    return db
      .select()
      .from(schema.trainingSamples)
      .where(eq(schema.trainingSamples.modelId, modelId))
      .orderBy(desc(schema.trainingSamples.createdAt));
  }

  static async trainModel(modelId: string): Promise<schema.PredictionModel> {
    await db
      .update(schema.predictionModels)
      .set({ status: "training", updatedAt: new Date() })
      .where(eq(schema.predictionModels.id, modelId));

    try {
      const samples = await this.getTrainingSamples(modelId);

      if (samples.length < 5) {
        throw new Error("Need at least 5 training samples to train the model");
      }

      const positiveKeywords: Record<string, number> = {};
      const negativeKeywords: Record<string, number> = {};
      const privilegedKeywords: Record<string, number> = {};
      const hotKeywords: Record<string, number> = {};

      for (const sample of samples) {
        const keywords = (sample.extractedKeywords as string[]) || [];
        const weight = sample.confidence;

        for (const keyword of keywords) {
          switch (sample.category) {
            case "responsive":
              positiveKeywords[keyword] = (positiveKeywords[keyword] || 0) + weight;
              break;
            case "non_responsive":
              negativeKeywords[keyword] = (negativeKeywords[keyword] || 0) + weight;
              break;
            case "privileged":
              privilegedKeywords[keyword] = (privilegedKeywords[keyword] || 0) + weight;
              break;
            case "hot":
              hotKeywords[keyword] = (hotKeywords[keyword] || 0) + weight;
              break;
          }
        }
      }

      const normalizeKeywords = (kw: Record<string, number>): string[] => {
        return Object.entries(kw)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 100)
          .map(([k]) => k);
      };

      const [model] = await db
        .update(schema.predictionModels)
        .set({
          status: "ready",
          positiveKeywords: normalizeKeywords(positiveKeywords),
          negativeKeywords: normalizeKeywords(negativeKeywords),
          modelConfig: {
            privilegedKeywords: normalizeKeywords(privilegedKeywords),
            hotKeywords: normalizeKeywords(hotKeywords),
          },
          trainedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.predictionModels.id, modelId))
        .returning();

      return model;
    } catch (error) {
      await db
        .update(schema.predictionModels)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(schema.predictionModels.id, modelId));

      throw error;
    }
  }

  static async predictDocuments(
    modelId: string,
    communicationIds?: string[]
  ): Promise<PredictionResult[]> {
    const model = await this.getModelById(modelId);
    if (!model || model.status !== "ready") {
      throw new Error("Model is not ready for predictions");
    }

    const positiveKeywords = new Set((model.positiveKeywords as string[]) || []);
    const negativeKeywords = new Set((model.negativeKeywords as string[]) || []);
    const config = (model.modelConfig as { privilegedKeywords?: string[]; hotKeywords?: string[] }) || {};
    const privilegedKeywords = new Set(config.privilegedKeywords || []);
    const hotKeywords = new Set(config.hotKeywords || []);

    const whereCondition = communicationIds && communicationIds.length > 0
      ? and(
          eq(schema.communications.caseId, model.caseId!),
          inArray(schema.communications.id, communicationIds)
        )
      : eq(schema.communications.caseId, model.caseId!);

    const documents = await db
      .select({
        id: schema.communications.id,
        subject: schema.communications.subject,
        body: schema.communications.body,
      })
      .from(schema.communications)
      .where(whereCondition);
    const results: PredictionResult[] = [];

    for (const doc of documents) {
      const text = `${doc.subject || ""} ${doc.body || ""}`;
      const docKeywords = this.extractKeywords(text);
      const docKeywordSet = new Set(docKeywords);

      let responsiveScore = 0;
      let nonResponsiveScore = 0;
      let privilegedScore = 0;
      let hotScore = 0;
      const matchedKeywords: string[] = [];

      for (const kw of Array.from(docKeywordSet)) {
        if (positiveKeywords.has(kw)) {
          responsiveScore += 1;
          matchedKeywords.push(kw);
        }
        if (negativeKeywords.has(kw)) {
          nonResponsiveScore += 1;
        }
        if (privilegedKeywords.has(kw)) {
          privilegedScore += 1;
          matchedKeywords.push(`[priv]${kw}`);
        }
        if (hotKeywords.has(kw)) {
          hotScore += 1;
          matchedKeywords.push(`[hot]${kw}`);
        }
      }

      const maxScore = Math.max(responsiveScore, nonResponsiveScore, privilegedScore, hotScore, 1);
      responsiveScore = responsiveScore / maxScore;
      nonResponsiveScore = nonResponsiveScore / maxScore;
      privilegedScore = privilegedScore / maxScore;
      hotScore = hotScore / maxScore;

      let predictedCategory: PredictionCategoryType = "needs_review";
      let confidenceScore = 0;

      if (hotScore > 0.5) {
        predictedCategory = "hot";
        confidenceScore = hotScore;
      } else if (privilegedScore > 0.5) {
        predictedCategory = "privileged";
        confidenceScore = privilegedScore;
      } else if (responsiveScore > nonResponsiveScore && responsiveScore > 0.3) {
        predictedCategory = "responsive";
        confidenceScore = responsiveScore;
      } else if (nonResponsiveScore > responsiveScore && nonResponsiveScore > 0.3) {
        predictedCategory = "non_responsive";
        confidenceScore = nonResponsiveScore;
      } else {
        confidenceScore = Math.max(responsiveScore, nonResponsiveScore, 0.1);
      }

      const explanationParts: string[] = [];
      if (matchedKeywords.length > 0) {
        explanationParts.push(`Matched keywords: ${matchedKeywords.slice(0, 5).join(", ")}`);
      }
      explanationParts.push(`Scores - Resp: ${(responsiveScore * 100).toFixed(0)}%, Non-Resp: ${(nonResponsiveScore * 100).toFixed(0)}%`);

      results.push({
        communicationId: doc.id,
        predictedCategory,
        confidenceScore,
        responsiveScore,
        nonResponsiveScore,
        privilegedScore,
        hotScore,
        matchedKeywords,
        explanationText: explanationParts.join(". "),
      });
    }

    results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    results.forEach((r, idx) => {
      (r as any).rankOrder = idx + 1;
    });

    return results;
  }

  static async savePredictions(
    modelId: string,
    predictions: PredictionResult[]
  ): Promise<number> {
    if (predictions.length === 0) return 0;

    await db
      .delete(schema.documentPredictions)
      .where(eq(schema.documentPredictions.modelId, modelId));

    const values = predictions.map((p, idx) => ({
      modelId,
      communicationId: p.communicationId,
      predictedCategory: p.predictedCategory,
      confidenceScore: p.confidenceScore,
      responsiveScore: p.responsiveScore,
      nonResponsiveScore: p.nonResponsiveScore,
      privilegedScore: p.privilegedScore,
      hotScore: p.hotScore,
      rankOrder: idx + 1,
      matchedKeywords: p.matchedKeywords,
      explanationText: p.explanationText,
    }));

    for (let i = 0; i < values.length; i += 100) {
      const batch = values.slice(i, i + 100);
      await db.insert(schema.documentPredictions).values(batch);
    }

    return predictions.length;
  }

  static async getPredictionsForCase(
    modelId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<schema.DocumentPrediction[]> {
    return db
      .select()
      .from(schema.documentPredictions)
      .where(eq(schema.documentPredictions.modelId, modelId))
      .orderBy(asc(schema.documentPredictions.rankOrder))
      .limit(limit)
      .offset(offset);
  }

  static async getActiveLearningQueue(
    modelId: string,
    limit: number = 20
  ): Promise<schema.DocumentPrediction[]> {
    return db
      .select()
      .from(schema.documentPredictions)
      .where(
        and(
          eq(schema.documentPredictions.modelId, modelId),
          eq(schema.documentPredictions.isReviewed, false),
          eq(schema.documentPredictions.predictedCategory, "needs_review")
        )
      )
      .orderBy(desc(schema.documentPredictions.confidenceScore))
      .limit(limit);
  }

  static async getHighConfidencePredictions(
    modelId: string,
    category: PredictionCategoryType,
    minConfidence: number = 0.7,
    limit: number = 50
  ): Promise<schema.DocumentPrediction[]> {
    return db
      .select()
      .from(schema.documentPredictions)
      .where(
        and(
          eq(schema.documentPredictions.modelId, modelId),
          eq(schema.documentPredictions.predictedCategory, category),
          sql`${schema.documentPredictions.confidenceScore} >= ${minConfidence}`
        )
      )
      .orderBy(desc(schema.documentPredictions.confidenceScore))
      .limit(limit);
  }

  static async markPredictionReviewed(
    predictionId: string,
    agreed: boolean
  ): Promise<void> {
    await db
      .update(schema.documentPredictions)
      .set({
        isReviewed: true,
        reviewerAgreed: agreed,
        updatedAt: new Date(),
      })
      .where(eq(schema.documentPredictions.id, predictionId));
  }

  static async getModelStats(modelId: string): Promise<{
    totalPredictions: number;
    reviewedCount: number;
    agreementRate: number;
    categoryBreakdown: Record<PredictionCategoryType, number>;
  }> {
    const predictions = await db
      .select()
      .from(schema.documentPredictions)
      .where(eq(schema.documentPredictions.modelId, modelId));

    const categoryBreakdown: Record<PredictionCategoryType, number> = {
      responsive: 0,
      non_responsive: 0,
      privileged: 0,
      hot: 0,
      needs_review: 0,
    };

    let reviewedCount = 0;
    let agreedCount = 0;

    for (const p of predictions) {
      categoryBreakdown[p.predictedCategory]++;
      if (p.isReviewed) {
        reviewedCount++;
        if (p.reviewerAgreed) {
          agreedCount++;
        }
      }
    }

    return {
      totalPredictions: predictions.length,
      reviewedCount,
      agreementRate: reviewedCount > 0 ? agreedCount / reviewedCount : 0,
      categoryBreakdown,
    };
  }

  static async getPredictionForDocument(
    communicationId: string,
    modelId?: string
  ): Promise<schema.DocumentPrediction | null> {
    const whereCondition = modelId
      ? and(
          eq(schema.documentPredictions.communicationId, communicationId),
          eq(schema.documentPredictions.modelId, modelId)
        )
      : eq(schema.documentPredictions.communicationId, communicationId);

    const [prediction] = await db
      .select()
      .from(schema.documentPredictions)
      .where(whereCondition)
      .limit(1);

    return prediction || null;
  }

  private static extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !this.STOPWORDS.has(w));

    const wordCounts: Record<string, number> = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    return Object.entries(wordCounts)
      .filter(([, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
  }
}
