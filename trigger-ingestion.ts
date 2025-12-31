import { db } from "./server/db";
import * as schema from "./shared/schema";
import { eq } from "drizzle-orm";
import { processFile } from "./server/fileProcessor";

async function triggerProcessing() {
  const fileId = "file-usa-water-polo-mbox";
  const jobId = "9f1a9c8d-6d57-4899-9ee2-91511618f18c";
  const fileName = "USA Water Polo-001.mbox";
  const fileType = "mbox";
  const objectPath = "/objects/uploads/568346c2-5eea-49a5-a608-4ff956818f42/USA Water Polo-001.mbox";
  const caseId = "e66d1254-d59d-4fe2-9adb-33c39da11e81";

  console.log(`[Trigger] Starting processing for file: ${fileName}`);
  
  // Update status to processing
  await db.update(schema.ingestionJobs).set({
    status: "processing",
    processingStartedAt: new Date(),
  }).where(eq(schema.ingestionJobs.id, jobId));

  await db.update(schema.ingestionFiles).set({
    status: "processing",
    processingStartedAt: new Date(),
  }).where(eq(schema.ingestionFiles.id, fileId));

  console.log(`[Trigger] Status updated to processing`);

  // Process the file
  try {
    const result = await processFile(fileId, fileName, fileType, objectPath, caseId);
    console.log(`[Trigger] Processing complete: ${result.communicationsCreated} communications created`);
    
    // Update file with results
    await db.update(schema.ingestionFiles).set({
      status: result.errors.length > 0 ? "failed" : "completed",
      communicationsExtracted: result.communicationsCreated,
      alertsCreated: result.alertsGenerated,
      processingCompletedAt: new Date(),
      errorMessage: result.errors.length > 0 ? result.errors.join("; ") : null,
    }).where(eq(schema.ingestionFiles.id, fileId));

    // Update job status
    await db.update(schema.ingestionJobs).set({
      status: result.errors.length > 0 ? "failed" : "completed",
      processedFiles: 1,
      communicationsCreated: result.communicationsCreated,
      alertsGenerated: result.alertsGenerated,
      processingCompletedAt: new Date(),
    }).where(eq(schema.ingestionJobs.id, jobId));

    console.log(`[Trigger] Database updated successfully`);
  } catch (error: any) {
    console.error(`[Trigger] Error processing file:`, error);
    
    await db.update(schema.ingestionFiles).set({
      status: "failed",
      errorMessage: error.message,
      processingCompletedAt: new Date(),
    }).where(eq(schema.ingestionFiles.id, fileId));

    await db.update(schema.ingestionJobs).set({
      status: "failed",
      failedFiles: 1,
      errorMessage: error.message,
      processingCompletedAt: new Date(),
    }).where(eq(schema.ingestionJobs.id, jobId));
  }
}

triggerProcessing().then(() => {
  console.log("[Trigger] Script completed");
  process.exit(0);
}).catch((err) => {
  console.error("[Trigger] Script failed:", err);
  process.exit(1);
});
