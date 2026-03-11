import { Router, Request, Response } from 'express';
import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync, unlinkSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import pako from 'pako';
import multer from 'multer';
import { isAuthenticated, requireRole } from './replitAuth';
import { ObjectStorageService, objectStorageClient } from './objectStorage';
import { randomUUID } from 'crypto';
import { storage as dbStorage } from './storage';
import { db } from './db';
import * as schema from '@shared/schema';

const router = Router();

// Configure multer for chunk uploads
const multerStorage = multer.memoryStorage();
const upload = multer({ 
  storage: multerStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per chunk
});

// Directory for temporary chunk storage
const UPLOAD_DIR = '/tmp/chunked-uploads';

interface UploadSessionMeta {
  sessionId: string;
  fileName: string;
  fileSize: number;
  actualSize: number;
  totalChunks: number;
  compressed: boolean;
  caseId: string;
  uploadType: 'document' | 'evidence' | 'ingestion' | 'data_room';
  fileType: string;
  userId: string;
  createdAt: number;
  uploadedChunks: number[];
  roomId?: string;
  folderId?: string | null;
}

// Ensure upload directory exists
function ensureUploadDir(sessionId: string): string {
  const sessionDir = join(UPLOAD_DIR, sessionId);
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }
  return sessionDir;
}

// Get session metadata file path
function getMetaPath(sessionId: string): string {
  return join(UPLOAD_DIR, sessionId, 'meta.json');
}

// Load session metadata
function loadSessionMeta(sessionId: string): UploadSessionMeta | null {
  const metaPath = getMetaPath(sessionId);
  if (!existsSync(metaPath)) {
    return null;
  }
  try {
    const data = readFileSync(metaPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[ChunkedUpload] Failed to load session meta:', error);
    return null;
  }
}

// Save session metadata
function saveSessionMeta(meta: UploadSessionMeta): void {
  const sessionDir = ensureUploadDir(meta.sessionId);
  const metaPath = join(sessionDir, 'meta.json');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

// Get uploaded chunk indices
function getUploadedChunks(sessionId: string): number[] {
  const sessionDir = join(UPLOAD_DIR, sessionId);
  if (!existsSync(sessionDir)) {
    return [];
  }
  
  const files = readdirSync(sessionDir);
  const chunkIndices: number[] = [];
  
  for (const file of files) {
    const match = file.match(/^chunk_(\d+)$/);
    if (match) {
      chunkIndices.push(parseInt(match[1], 10));
    }
  }
  
  return chunkIndices.sort((a, b) => a - b);
}

async function createDataRoomDocument(meta: UploadSessionMeta, objectStoragePath: string, fileSize: number) {
  if (meta.uploadType !== 'data_room' || !meta.roomId) return null;

  const [doc] = await db
    .insert(schema.dataRoomDocuments)
    .values({
      dataRoomId: meta.roomId,
      folderId: meta.folderId || null,
      fileName: meta.fileName,
      fileType: meta.fileType || 'application/octet-stream',
      fileSize: fileSize,
      storagePath: objectStoragePath,
      uploadedBy: meta.userId,
      ocrStatus: "pending",
    })
    .returning();

  const { queueDocumentsForOCR } = await import("./services/ocr-service");
  queueDocumentsForOCR([doc.id]);

  try {
    const { queueDocumentsForGeminiIndexing } = await import("./services/transaction-search-service");
    queueDocumentsForGeminiIndexing([doc.id]);
  } catch (e) {
    // indexing is optional
  }

  console.log(`[ChunkedUpload] Created data room document: ${doc.id} for room ${meta.roomId}`);
  return doc;
}

// Roles allowed to upload documents
const UPLOAD_ALLOWED_ROLES = ['admin', 'compliance_officer', 'attorney', 'external_counsel'];

// Initialize upload session
router.post('/init', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      sessionId,
      fileName,
      fileSize,
      actualSize,
      totalChunks,
      compressed,
      caseId,
      uploadType,
      fileType,
      roomId,
      folderId
    } = req.body;

    if (!sessionId || !fileName || !fileSize) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (uploadType === 'data_room') {
      if (!roomId) {
        return res.status(400).json({ message: 'Missing roomId for data_room upload' });
      }
      const { eq } = await import('drizzle-orm');
      const room = await db.select().from(schema.peDataRooms).where(eq(schema.peDataRooms.id, roomId)).limit(1);
      if (room.length === 0) {
        return res.status(404).json({ message: 'Data room not found' });
      }
      if (folderId) {
        const { and } = await import('drizzle-orm');
        const folder = await db.select().from(schema.dataRoomFolders)
          .where(and(eq(schema.dataRoomFolders.id, folderId), eq(schema.dataRoomFolders.dataRoomId, roomId)))
          .limit(1);
        if (folder.length === 0) {
          return res.status(400).json({ message: 'Folder does not belong to this data room' });
        }
      }
      console.log(`[ChunkedUpload] Data room upload validated: room ${roomId}`);
    } else {
      if (!caseId) {
        return res.status(400).json({ message: 'Missing caseId' });
      }
      const caseData = await dbStorage.getCase(caseId);
      if (!caseData) {
        console.log(`[ChunkedUpload] Case not found: ${caseId}`);
        return res.status(404).json({ message: 'Case not found' });
      }
      console.log(`[ChunkedUpload] Case validated: ${caseId} - ${caseData.title}`);
    }

    // Check for existing session
    const existingMeta = loadSessionMeta(sessionId);
    if (existingMeta) {
      // Return existing session info for resume
      const uploadedChunks = getUploadedChunks(sessionId);
      existingMeta.uploadedChunks = uploadedChunks;
      saveSessionMeta(existingMeta);
      
      console.log(`[ChunkedUpload] Resuming session ${sessionId} - ${uploadedChunks.length}/${existingMeta.totalChunks} chunks uploaded`);
      return res.json({ 
        sessionId,
        uploadedChunks,
        resumed: true
      });
    }

    // Create new session
    const sessionDir = ensureUploadDir(sessionId);
    
    const meta: UploadSessionMeta = {
      sessionId,
      fileName,
      fileSize,
      actualSize: actualSize || fileSize,
      totalChunks,
      compressed: compressed || false,
      caseId: caseId || '',
      uploadType: uploadType || 'document',
      fileType: fileType || 'application/octet-stream',
      userId,
      createdAt: Date.now(),
      uploadedChunks: [],
      roomId: roomId || undefined,
      folderId: folderId || null,
    };
    
    saveSessionMeta(meta);
    
    console.log(`[ChunkedUpload] Initialized session ${sessionId} for ${fileName} (${totalChunks} chunks, compressed: ${compressed})`);
    
    res.json({ 
      sessionId,
      uploadedChunks: [],
      resumed: false
    });
  } catch (error: any) {
    console.error('[ChunkedUpload] Init error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Upload a chunk
router.post('/chunk', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), upload.single('chunk'), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId, chunkIndex } = req.body;
    const chunkData = req.file?.buffer;

    if (!sessionId || chunkIndex === undefined || !chunkData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const meta = loadSessionMeta(sessionId);
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found' });
    }

    // Verify user owns this session
    if (meta.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const sessionDir = ensureUploadDir(sessionId);
    const chunkPath = join(sessionDir, `chunk_${chunkIndex}`);
    
    // Write chunk to disk
    writeFileSync(chunkPath, chunkData);
    
    // Update metadata
    const uploadedChunks = getUploadedChunks(sessionId);
    meta.uploadedChunks = uploadedChunks;
    saveSessionMeta(meta);
    
    console.log(`[ChunkedUpload] Session ${sessionId}: chunk ${chunkIndex}/${meta.totalChunks - 1} received (${chunkData.length} bytes)`);
    
    res.json({ 
      success: true,
      chunkIndex,
      uploadedChunks: uploadedChunks.length,
      totalChunks: meta.totalChunks
    });
  } catch (error: any) {
    console.error('[ChunkedUpload] Chunk upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Finalize upload - stream directly to object storage (no temp file needed)
router.post('/finalize', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Missing session ID' });
    }

    const meta = loadSessionMeta(sessionId);
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found' });
    }

    if (meta.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const uploadedChunks = getUploadedChunks(sessionId);
    if (uploadedChunks.length !== meta.totalChunks) {
      return res.status(400).json({ 
        message: `Incomplete upload: ${uploadedChunks.length}/${meta.totalChunks} chunks`,
        uploadedChunks,
        totalChunks: meta.totalChunks
      });
    }

    console.log(`[ChunkedUpload] Finalizing session ${sessionId} - streaming ${meta.totalChunks} chunks directly to object storage`);

    const sessionDir = join(UPLOAD_DIR, sessionId);

    // For compressed files (small ones only, <200MB), decompress first
    // Then handle normally
    if (meta.compressed) {
      console.log(`[ChunkedUpload] Processing compressed upload...`);
      // For compressed files, we need to reassemble and decompress first
      // These are small files (<200MB) so we can handle in memory
      const chunks: Buffer[] = [];
      for (let i = 0; i < meta.totalChunks; i++) {
        const chunkPath = join(sessionDir, `chunk_${i}`);
        chunks.push(readFileSync(chunkPath));
      }
      const compressedData = Buffer.concat(chunks);
      const decompressed = pako.ungzip(compressedData);
      
      // Upload decompressed data directly to object storage
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const objectId = randomUUID();
      const objectName = `uploads/${objectId}/${meta.fileName}`;
      const fullObjectPath = `${privateDir}/${objectName}`;
      
      const pathParts = fullObjectPath.split('/').filter(p => p);
      const bucketName = pathParts[0];
      const objectPath = pathParts.slice(1).join('/');
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectPath);
      
      await file.save(Buffer.from(decompressed), {
        metadata: { contentType: meta.fileType || 'application/octet-stream' },
      });
      
      const objectStoragePath = `/objects/uploads/${objectId}/${meta.fileName}`;
      console.log(`[ChunkedUpload] Uploaded decompressed file to object storage: ${objectStoragePath}`);
      
      // Clean up all chunks and session directory
      for (let i = 0; i < meta.totalChunks; i++) {
        const chunkPath = join(sessionDir, `chunk_${i}`);
        if (existsSync(chunkPath)) unlinkSync(chunkPath);
      }
      const compressedMetaPath = join(sessionDir, 'meta.json');
      if (existsSync(compressedMetaPath)) unlinkSync(compressedMetaPath);
      try { require('fs').rmdirSync(sessionDir); } catch (e) {}

      const dataRoomDoc = await createDataRoomDocument(meta, objectStoragePath, decompressed.length);
      
      return res.json({
        success: true,
        fileName: meta.fileName,
        fileSize: decompressed.length,
        originalSize: meta.actualSize,
        compressed: true,
        filePath: '',
        objectStoragePath,
        caseId: meta.caseId,
        uploadType: meta.uploadType,
        dataRoomDocument: dataRoomDoc || undefined,
      });
    }

    // For uncompressed (large) files: stream directly to object storage
    // This avoids creating a temp file which would double disk usage
    const objectStorageService = new ObjectStorageService();
    const privateDir = objectStorageService.getPrivateObjectDir();
    const objectId = randomUUID();
    const objectName = `uploads/${objectId}/${meta.fileName}`;
    const fullObjectPath = `${privateDir}/${objectName}`;
    
    const pathParts = fullObjectPath.split('/').filter(p => p);
    const bucketName = pathParts[0];
    const objectPath = pathParts.slice(1).join('/');
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    console.log(`[ChunkedUpload] Starting direct-to-cloud streaming upload...`);
    
    // Create a resumable upload stream to object storage
    const uploadStream = file.createWriteStream({
      metadata: {
        contentType: meta.fileType || 'application/octet-stream',
      },
      resumable: true, // Use resumable for reliability
    });
    
    let totalBytesStreamed = 0;
    
    // Stream each chunk directly to object storage, then delete the chunk
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = join(sessionDir, `chunk_${i}`);
      if (!existsSync(chunkPath)) {
        uploadStream.destroy();
        throw new Error(`Missing chunk ${i}`);
      }
      
      // Read chunk and write to upload stream
      const chunkData = readFileSync(chunkPath);
      totalBytesStreamed += chunkData.length;
      
      // Write to stream with backpressure handling
      const canContinue = uploadStream.write(chunkData);
      if (!canContinue) {
        await new Promise<void>(resolve => uploadStream.once('drain', resolve));
      }
      
      // Delete chunk immediately after uploading to free disk space
      unlinkSync(chunkPath);
      
      if ((i + 1) % 50 === 0 || i === meta.totalChunks - 1) {
        const mbStreamed = (totalBytesStreamed / (1024 * 1024)).toFixed(1);
        console.log(`[ChunkedUpload] Streamed ${i + 1}/${meta.totalChunks} chunks (${mbStreamed}MB)`);
      }
    }
    
    // Close the upload stream and wait for completion
    await new Promise<void>((resolve, reject) => {
      uploadStream.end();
      uploadStream.on('finish', () => {
        console.log(`[ChunkedUpload] Upload stream finished`);
        resolve();
      });
      uploadStream.on('error', (err) => {
        console.error(`[ChunkedUpload] Upload stream error:`, err);
        reject(err);
      });
    });
    
    const objectStoragePath = `/objects/uploads/${objectId}/${meta.fileName}`;
    console.log(`[ChunkedUpload] Successfully uploaded ${meta.fileName} to object storage: ${objectStoragePath} (${totalBytesStreamed} bytes)`);

    // Clean up session directory (metadata file)
    const metaPath = join(sessionDir, 'meta.json');
    if (existsSync(metaPath)) {
      unlinkSync(metaPath);
    }
    try {
      require('fs').rmdirSync(sessionDir);
    } catch (e) {
      // Directory might not be empty, ignore
    }

    const dataRoomDoc = await createDataRoomDocument(meta, objectStoragePath, totalBytesStreamed);

    res.json({
      success: true,
      fileName: meta.fileName,
      fileSize: totalBytesStreamed,
      originalSize: meta.actualSize,
      compressed: false,
      filePath: '',
      objectStoragePath,
      caseId: meta.caseId,
      uploadType: meta.uploadType,
      dataRoomDocument: dataRoomDoc || undefined,
    });
  } catch (error: any) {
    console.error('[ChunkedUpload] Finalize error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Cancel upload - clean up session
router.post('/cancel', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Missing session ID' });
    }

    // Verify session ownership
    const meta = loadSessionMeta(sessionId);
    if (meta && meta.userId !== userId) {
      console.log(`[ChunkedUpload] Cancel denied: user ${userId} attempted to cancel session owned by ${meta.userId}`);
      return res.status(403).json({ message: 'You can only cancel your own uploads' });
    }

    const sessionDir = join(UPLOAD_DIR, sessionId);
    
    if (existsSync(sessionDir)) {
      // Remove all files in the session directory
      const files = readdirSync(sessionDir);
      for (const file of files) {
        unlinkSync(join(sessionDir, file));
      }
      // Remove the directory
      require('fs').rmdirSync(sessionDir);
      console.log(`[ChunkedUpload] Cancelled and cleaned up session ${sessionId}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ChunkedUpload] Cancel error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get session status
router.get('/status/:sessionId', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId } = req.params;
    
    const meta = loadSessionMeta(sessionId);
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found' });
    }

    // Verify session ownership
    if (meta.userId !== userId) {
      console.log(`[ChunkedUpload] Status denied: user ${userId} attempted to access session owned by ${meta.userId}`);
      return res.status(403).json({ message: 'You can only view your own uploads' });
    }

    const uploadedChunks = getUploadedChunks(sessionId);
    
    res.json({
      sessionId,
      fileName: meta.fileName,
      fileSize: meta.fileSize,
      totalChunks: meta.totalChunks,
      uploadedChunks: uploadedChunks.length,
      compressed: meta.compressed,
      caseId: meta.caseId,
      uploadType: meta.uploadType,
      createdAt: meta.createdAt
    });
  } catch (error: any) {
    console.error('[ChunkedUpload] Status error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get the final file after upload is complete
router.get('/file/:sessionId', isAuthenticated, requireRole(...UPLOAD_ALLOWED_ROLES), async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { sessionId } = req.params;
    
    const meta = loadSessionMeta(sessionId);
    if (!meta) {
      return res.status(404).json({ message: 'Upload session not found' });
    }

    // Verify session ownership
    if (meta.userId !== userId) {
      console.log(`[ChunkedUpload] File access denied: user ${userId} attempted to access session owned by ${meta.userId}`);
      return res.status(403).json({ message: 'You can only access your own uploads' });
    }

    const filePath = join(UPLOAD_DIR, sessionId, meta.fileName);
    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found - upload may not be finalized' });
    }

    res.json({
      sessionId,
      fileName: meta.fileName,
      filePath,
      fileSize: statSync(filePath).size,
      caseId: meta.caseId,
      uploadType: meta.uploadType
    });
  } catch (error: any) {
    console.error('[ChunkedUpload] File info error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
