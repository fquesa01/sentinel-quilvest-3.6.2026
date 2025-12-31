import pako from 'pako';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const PARALLEL_UPLOADS = 4; // Number of chunks to upload simultaneously
const DB_NAME = 'sentinel-uploads';
const DB_VERSION = 1;
const STORE_NAME = 'upload-sessions';

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  uploaded: boolean;
  retries: number;
}

export interface UploadSession {
  id: string;
  fileFingerprint: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  uploadedChunks: number[];
  compressed: boolean;
  compressedSize?: number;
  caseId: string;
  uploadType: 'document' | 'evidence' | 'ingestion';
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface UploadProgress {
  sessionId: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  percentage: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  status: UploadSession['status'];
  compressed: boolean;
  compressionRatio?: number;
  currentChunk: number;
  totalChunks: number;
  finalResult?: {
    fileName: string;
    fileSize: number;
    filePath: string;
    objectStoragePath: string;
  };
}

// Generate a fingerprint for a file based on name, size, and last modified
export async function generateFileFingerprint(file: File): Promise<string> {
  const data = `${file.name}-${file.size}-${file.lastModified}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// IndexedDB helpers
class UploadDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[UploadDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('fileFingerprint', 'fileFingerprint', { unique: false });
          store.createIndex('caseId', 'caseId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async saveSession(session: UploadSession): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSession(id: string): Promise<UploadSession | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getSessionByFingerprint(fingerprint: string): Promise<UploadSession | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('fileFingerprint');
      const request = index.get(fingerprint);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingUploads(): Promise<UploadSession[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const sessions: UploadSession[] = [];
      
      const request = index.openCursor(IDBKeyRange.bound('paused', 'uploading'));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (cursor.value.status === 'paused' || cursor.value.status === 'uploading') {
            sessions.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCompletedSessions(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      
      const request = index.openCursor(IDBKeyRange.only('completed'));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const uploadDb = new UploadDatabase();

// Compression utilities
export async function compressFile(file: File): Promise<{ data: Uint8Array; originalSize: number; compressedSize: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const compressed = pako.gzip(data, { level: 6 }); // Level 6 is a good balance of speed/compression
  
  return {
    data: compressed,
    originalSize: data.length,
    compressedSize: compressed.length
  };
}

// Maximum file size for in-memory compression (200MB)
// Larger files should be uploaded without compression to avoid memory issues
const MAX_COMPRESSION_SIZE = 200 * 1024 * 1024;

export function shouldCompress(file: File): boolean {
  // Don't compress files larger than 200MB - it will exhaust browser memory
  if (file.size > MAX_COMPRESSION_SIZE) {
    console.log(`[ChunkedUpload] Skipping compression for ${file.name} - file too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 200MB limit)`);
    return false;
  }
  
  // Text-based formats that compress well
  const compressibleTypes = [
    'text/', 'application/json', 'application/xml', 'application/javascript',
    'application/mbox', 'message/rfc822', 'text/plain'
  ];
  
  // File extensions that indicate compressible content
  const compressibleExtensions = [
    '.mbox', '.eml', '.msg', '.txt', '.json', '.xml', '.csv', '.log',
    '.html', '.htm', '.css', '.js', '.ts', '.md', '.pst'
  ];
  
  const isCompressibleType = compressibleTypes.some(type => 
    file.type.startsWith(type) || file.type.includes(type)
  );
  
  const isCompressibleExtension = compressibleExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  // Also compress files over 1MB that don't have a known type
  const isLargeUnknown = file.size > 1024 * 1024 && !file.type;
  
  return isCompressibleType || isCompressibleExtension || isLargeUnknown;
}

// Chunk management
export function calculateChunks(fileSize: number): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  let index = 0;
  let start = 0;
  
  while (start < fileSize) {
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    chunks.push({
      index,
      start,
      end,
      uploaded: false,
      retries: 0
    });
    index++;
    start = end;
  }
  
  return chunks;
}

export function getChunkData(data: Uint8Array | ArrayBuffer, chunk: ChunkInfo): Uint8Array {
  const arr = data instanceof Uint8Array ? data : new Uint8Array(data);
  return arr.slice(chunk.start, chunk.end);
}

// Main upload manager class
export class ChunkedUploadManager {
  private sessions: Map<string, UploadSession> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, (progress: UploadProgress) => void> = new Map();
  private uploadStartTimes: Map<string, number> = new Map();
  private uploadedBytesHistory: Map<string, { time: number; bytes: number }[]> = new Map();

  async createSession(
    file: File,
    caseId: string,
    uploadType: UploadSession['uploadType'],
    enableCompression: boolean = true
  ): Promise<UploadSession> {
    const fingerprint = await generateFileFingerprint(file);
    
    // Check for existing session with same fingerprint
    const existingSession = await uploadDb.getSessionByFingerprint(fingerprint);
    if (existingSession && existingSession.status !== 'completed') {
      console.log('[ChunkedUpload] Found existing session for file:', file.name);
      this.sessions.set(existingSession.id, existingSession);
      return existingSession;
    }
    
    const shouldCompressFile = enableCompression && shouldCompress(file);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    const session: UploadSession = {
      id: crypto.randomUUID(),
      fileFingerprint: fingerprint,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      totalChunks,
      uploadedChunks: [],
      compressed: shouldCompressFile,
      caseId,
      uploadType,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending'
    };
    
    await uploadDb.saveSession(session);
    this.sessions.set(session.id, session);
    
    return session;
  }

  async startUpload(
    sessionId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const session = this.sessions.get(sessionId) || await uploadDb.getSession(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }
    
    if (onProgress) {
      this.progressCallbacks.set(sessionId, onProgress);
    }
    
    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);
    this.uploadStartTimes.set(sessionId, Date.now());
    this.uploadedBytesHistory.set(sessionId, []);
    
    session.status = 'uploading';
    session.updatedAt = Date.now();
    await uploadDb.saveSession(session);
    this.sessions.set(sessionId, session);
    
    try {
      let uploadData: Uint8Array | null = null;
      let actualSize: number;
      let useStreaming = false;
      
      // For large files or when compression fails, use streaming mode
      // Streaming reads chunks directly from the file instead of loading into memory
      if (session.compressed) {
        this.reportProgress(session, 0, 'Compressing file...');
        try {
          const compressed = await compressFile(file);
          uploadData = compressed.data;
          actualSize = compressed.compressedSize;
          session.compressedSize = compressed.compressedSize;
          await uploadDb.saveSession(session);
          
          const ratio = ((1 - compressed.compressedSize / compressed.originalSize) * 100).toFixed(1);
          console.log(`[ChunkedUpload] Compressed ${file.name}: ${this.formatBytes(compressed.originalSize)} → ${this.formatBytes(compressed.compressedSize)} (${ratio}% reduction)`);
        } catch (compressionError: any) {
          // Compression failed (likely memory issue), fall back to streaming
          console.warn(`[ChunkedUpload] Compression failed for ${file.name}, falling back to streaming upload:`, compressionError.message);
          session.compressed = false;
          useStreaming = true;
          actualSize = file.size;
          await uploadDb.saveSession(session);
        }
      } else {
        // For uncompressed files, use streaming for files over 100MB
        if (file.size > 100 * 1024 * 1024) {
          console.log(`[ChunkedUpload] Using streaming mode for large file: ${file.name} (${this.formatBytes(file.size)})`);
          useStreaming = true;
          actualSize = file.size;
        } else {
          try {
            const buffer = await file.arrayBuffer();
            uploadData = new Uint8Array(buffer);
            actualSize = file.size;
          } catch (readError: any) {
            // File read failed, try streaming
            console.warn(`[ChunkedUpload] File read failed for ${file.name}, falling back to streaming:`, readError.message);
            useStreaming = true;
            actualSize = file.size;
          }
        }
      }
      
      // Initialize session on server
      const initResponse = await fetch('/api/chunked-upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          fileName: session.fileName,
          fileSize: session.fileSize,
          actualSize,
          totalChunks: Math.ceil(actualSize / CHUNK_SIZE),
          compressed: session.compressed,
          caseId: session.caseId,
          uploadType: session.uploadType,
          fileType: session.fileType
        }),
        signal: abortController.signal
      });
      
      if (!initResponse.ok) {
        throw new Error(`Failed to initialize upload: ${await initResponse.text()}`);
      }
      
      const { uploadedChunks: serverChunks } = await initResponse.json();
      session.uploadedChunks = serverChunks || [];
      
      // Calculate actual chunks based on compressed/original data
      const chunks = calculateChunks(actualSize);
      session.totalChunks = chunks.length;
      await uploadDb.saveSession(session);
      
      // Upload chunks in parallel using batched promise pattern
      // Use Set to prevent duplicate chunk tracking
      const uploadedSet = new Set(session.uploadedChunks);
      const pendingChunks = chunks.filter(chunk => !uploadedSet.has(chunk.index));
      
      if (pendingChunks.length > 0) {
        console.log(`[ChunkedUpload] Uploading ${pendingChunks.length} chunks with ${PARALLEL_UPLOADS} parallel connections`);
        
        // Pre-calculate chunk sizes for O(1) lookup (avoid O(n²) progress calculation)
        const chunkSizeMap = new Map<number, number>();
        for (const chunk of chunks) {
          chunkSizeMap.set(chunk.index, chunk.end - chunk.start);
        }
        
        // Initialize completed bytes from already uploaded chunks
        let completedBytes = 0;
        for (const idx of uploadedSet) {
          completedBytes += chunkSizeMap.get(idx) || 0;
        }
        
        // Process chunks in sequential batches for controlled concurrency
        for (let i = 0; i < pendingChunks.length; i += PARALLEL_UPLOADS) {
          // Check abort at batch start - throw to propagate to catch block
          if (abortController.signal.aborted) {
            throw new DOMException('Upload paused', 'AbortError');
          }
          
          const batch = pendingChunks.slice(i, i + PARALLEL_UPLOADS);
          const batchCompleted: { index: number; size: number }[] = [];
          
          // Upload all chunks in this batch in parallel
          const results = await Promise.allSettled(
            batch.map(async (chunk) => {
              // Read chunk data
              let chunkData: Uint8Array;
              if (useStreaming) {
                const blob = file.slice(chunk.start, chunk.end);
                const buffer = await blob.arrayBuffer();
                chunkData = new Uint8Array(buffer);
              } else {
                chunkData = getChunkData(uploadData!, chunk);
              }
              
              // Upload the chunk (will throw AbortError if aborted)
              await this.uploadChunk(session, chunk.index, chunkData, abortController.signal);
              
              return { index: chunk.index, size: chunk.end - chunk.start };
            })
          );
          
          // Process results: first commit ALL successful chunks, then check for errors
          // This ensures progress is durable even if some chunks fail
          let hasAbort = false;
          let firstError: Error | null = null;
          
          for (const result of results) {
            if (result.status === 'fulfilled') {
              batchCompleted.push(result.value);
            } else if (result.reason?.name === 'AbortError') {
              hasAbort = true;
            } else if (!firstError) {
              firstError = result.reason;
            }
          }
          
          // Update session state with completed chunks BEFORE checking errors
          // This ensures successful chunks in this batch are saved even if one failed
          for (const completed of batchCompleted) {
            uploadedSet.add(completed.index);
            completedBytes += completed.size;
          }
          
          // Sort uploadedChunks for consistent server-side resume logic
          session.uploadedChunks = Array.from(uploadedSet).sort((a, b) => a - b);
          session.updatedAt = Date.now();
          
          // Report progress using incremental counter (O(1))
          this.reportProgress(session, completedBytes);
          
          // Persist session for resume capability - even on abort/error
          await uploadDb.saveSession(session);
          
          // Handle abort - throw to propagate to catch block
          if (hasAbort || abortController.signal.aborted) {
            throw new DOMException('Upload paused', 'AbortError');
          }
          
          // Handle errors
          if (firstError) {
            throw firstError;
          }
        }
      }
      
      // Final abort check before finalize
      if (abortController.signal.aborted) {
        throw new DOMException('Upload paused', 'AbortError');
      }
      
      // Finalize upload
      const finalizeResponse = await fetch('/api/chunked-upload/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
        signal: abortController.signal
      });
      
      if (!finalizeResponse.ok) {
        throw new Error(`Failed to finalize upload: ${await finalizeResponse.text()}`);
      }
      
      const finalizeResult = await finalizeResponse.json();
      
      session.status = 'completed';
      session.updatedAt = Date.now();
      await uploadDb.saveSession(session);
      this.sessions.set(sessionId, session);
      
      // Pass the finalize result to the progress callback
      this.reportProgress(session, session.compressedSize || session.fileSize, undefined, {
        fileName: finalizeResult.fileName,
        fileSize: finalizeResult.fileSize,
        filePath: finalizeResult.filePath || finalizeResult.objectStoragePath,
        objectStoragePath: finalizeResult.objectStoragePath
      });
      
      // Cleanup
      this.cleanup(sessionId);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        session.status = 'paused';
      } else {
        session.status = 'failed';
        session.errorMessage = error.message;
      }
      session.updatedAt = Date.now();
      await uploadDb.saveSession(session);
      this.sessions.set(sessionId, session);
      
      // Clean up abort controller so resumeUpload can start fresh
      this.abortControllers.delete(sessionId);
      
      throw error;
    }
  }

  private async uploadChunk(
    session: UploadSession,
    chunkIndex: number,
    data: Uint8Array,
    signal: AbortSignal,
    retries: number = 0
  ): Promise<void> {
    const maxRetries = 3;
    
    try {
      const formData = new FormData();
      formData.append('sessionId', session.id);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunk', new Blob([data]));
      
      const response = await fetch('/api/chunked-upload/chunk', {
        method: 'POST',
        body: formData,
        signal
      });
      
      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${await response.text()}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 1000;
        console.log(`[ChunkedUpload] Chunk ${chunkIndex} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.uploadChunk(session, chunkIndex, data, signal, retries + 1);
      }
      
      throw error;
    }
  }

  pauseUpload(sessionId: string): void {
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
  }

  async resumeUpload(sessionId: string, file: File): Promise<void> {
    const session = await uploadDb.getSession(sessionId);
    if (!session) {
      throw new Error('Upload session not found');
    }
    
    // Verify file matches
    const fingerprint = await generateFileFingerprint(file);
    if (fingerprint !== session.fileFingerprint) {
      throw new Error('File does not match the original upload');
    }
    
    this.sessions.set(sessionId, session);
    const callback = this.progressCallbacks.get(sessionId);
    await this.startUpload(sessionId, file, callback);
  }

  async cancelUpload(sessionId: string): Promise<void> {
    this.pauseUpload(sessionId);
    
    try {
      await fetch('/api/chunked-upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (error) {
      console.error('[ChunkedUpload] Failed to cancel on server:', error);
    }
    
    await uploadDb.deleteSession(sessionId);
    this.cleanup(sessionId);
  }

  private reportProgress(
    session: UploadSession, 
    uploadedBytes: number, 
    customMessage?: string,
    finalResult?: UploadProgress['finalResult']
  ): void {
    const callback = this.progressCallbacks.get(session.id);
    if (!callback) return;
    
    const totalBytes = session.compressedSize || session.fileSize;
    const percentage = Math.round((uploadedBytes / totalBytes) * 100);
    
    // Calculate speed
    const history = this.uploadedBytesHistory.get(session.id) || [];
    const now = Date.now();
    history.push({ time: now, bytes: uploadedBytes });
    
    // Keep only last 10 seconds of history
    const cutoff = now - 10000;
    const recentHistory = history.filter(h => h.time > cutoff);
    this.uploadedBytesHistory.set(session.id, recentHistory);
    
    let speed = 0;
    let estimatedTimeRemaining = 0;
    
    if (recentHistory.length >= 2) {
      const oldest = recentHistory[0];
      const newest = recentHistory[recentHistory.length - 1];
      const timeDiff = (newest.time - oldest.time) / 1000;
      const bytesDiff = newest.bytes - oldest.bytes;
      speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;
      
      const remainingBytes = totalBytes - uploadedBytes;
      estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : 0;
    }
    
    const progress: UploadProgress = {
      sessionId: session.id,
      fileName: session.fileName,
      totalBytes: session.fileSize,
      uploadedBytes,
      percentage,
      speed,
      estimatedTimeRemaining,
      status: session.status,
      compressed: session.compressed,
      compressionRatio: session.compressedSize 
        ? ((1 - session.compressedSize / session.fileSize) * 100)
        : undefined,
      currentChunk: session.uploadedChunks.length,
      totalChunks: session.totalChunks,
      finalResult
    };
    
    callback(progress);
  }

  private cleanup(sessionId: string): void {
    this.abortControllers.delete(sessionId);
    this.progressCallbacks.delete(sessionId);
    this.uploadStartTimes.delete(sessionId);
    this.uploadedBytesHistory.delete(sessionId);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  async getPendingUploads(): Promise<UploadSession[]> {
    return uploadDb.getPendingUploads();
  }

  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }
}

// Singleton instance
export const uploadManager = new ChunkedUploadManager();
