import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Writable, PassThrough } from "stream";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET_NAME = process.env.STORAGE_BUCKET || "sentinel-files";

let storageClient: ReturnType<typeof createClient> | null = null;

function getStorageClient() {
  if (!storageClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for storage");
    }
    storageClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return storageClient;
}

// Ensure the storage bucket exists
let bucketEnsured = false;
async function ensureBucket() {
  if (bucketEnsured) return;
  try {
    const client = getStorageClient();
    const { data: buckets } = await client.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
      await client.storage.createBucket(BUCKET_NAME, { public: false });
      console.log(`[Storage] Created bucket: ${BUCKET_NAME}`);
    }
    bucketEnsured = true;
  } catch (err) {
    console.error("[Storage] Failed to ensure bucket:", err);
    // Don't block startup if bucket check fails
    bucketEnsured = true;
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// Supabase-compatible File class that mimics GCS File interface
class SupabaseFile {
  public name: string;

  constructor(name: string) {
    this.name = name.startsWith("/") ? name.slice(1) : name;
  }

  async exists(): Promise<[boolean]> {
    try {
      await ensureBucket();
      const client = getStorageClient();
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .download(this.name);
      return [!error && !!data];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[any]> {
    return [{ contentType: "application/octet-stream", size: "0", metadata: {} }];
  }

  async setMetadata(_metadata: any): Promise<void> {}

  createReadStream(): NodeJS.ReadableStream {
    const stream = new PassThrough();
    const fileName = this.name;

    (async () => {
      try {
        await ensureBucket();
        const client = getStorageClient();
        const { data, error } = await client.storage
          .from(BUCKET_NAME)
          .download(fileName);
        if (error || !data) {
          stream.destroy(new Error(`Download failed: ${error?.message}`));
          return;
        }
        const ab = await data.arrayBuffer();
        stream.end(Buffer.from(ab));
      } catch (err: any) {
        stream.destroy(err);
      }
    })();

    return stream;
  }

  async download(): Promise<[Buffer]> {
    await ensureBucket();
    const client = getStorageClient();
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(this.name);
    if (error || !data) {
      throw new Error(`Download failed: ${error?.message || "unknown error"}`);
    }
    return [Buffer.from(await data.arrayBuffer())];
  }

  async save(
    data: Buffer,
    options?: { metadata?: { contentType?: string } }
  ): Promise<void> {
    await ensureBucket();
    const client = getStorageClient();
    const { error } = await client.storage.from(BUCKET_NAME).upload(
      this.name,
      data,
      {
        contentType: options?.metadata?.contentType || "application/octet-stream",
        upsert: true,
      }
    );
    if (error) throw new Error(`Upload failed: ${error.message}`);
  }

  createWriteStream(options?: any): NodeJS.WritableStream {
    const chunks: Buffer[] = [];
    const filePath = this.name;
    const contentType = options?.metadata?.contentType || "application/octet-stream";

    const writable = new Writable({
      write(chunk: Buffer, _encoding: string, callback: (err?: Error | null) => void) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
      final(callback: (err?: Error | null) => void) {
        const buffer = Buffer.concat(chunks);
        ensureBucket()
          .then(() => {
            const client = getStorageClient();
            return client.storage.from(BUCKET_NAME).upload(filePath, buffer, {
              contentType,
              upsert: true,
            });
          })
          .then(({ error }) => {
            if (error) callback(new Error(`Upload failed: ${error.message}`));
            else callback();
          })
          .catch((err) => callback(err));
      },
    });

    return writable;
  }
}

// GCS-compatible client interface backed by Supabase Storage
export const objectStorageClient = {
  bucket(_bucketName: string) {
    return {
      file(objectName: string) {
        return new SupabaseFile(objectName);
      },
    };
  },
};

// The object storage service
export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    return paths;
  }

  getPrivateObjectDir(): string {
    return process.env.PRIVATE_OBJECT_DIR || "/sentinel-files";
  }

  async searchPublicObject(filePath: string): Promise<SupabaseFile | null> {
    const paths = this.getPublicObjectSearchPaths();
    if (paths.length === 0) return null;

    for (const searchPath of paths) {
      const fullPath = `${searchPath}/${filePath}`.replace(/^\/+/, "");
      const file = new SupabaseFile(fullPath);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(
    file: SupabaseFile | any,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    try {
      await ensureBucket();
      const client = getStorageClient();
      const filePath = file.name || file;
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (error || !data) {
        if (!res.headersSent) {
          res.status(404).json({ error: "File not found" });
        }
        return;
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": data.type || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      res.end(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    await ensureBucket();
    const client = getStorageClient();
    const objectId = randomUUID();
    const path = `uploads/${objectId}`;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async getObjectEntityFile(objectPath: string): Promise<SupabaseFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.slice("/objects/".length);
    const file = new SupabaseFile(entityId);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return file;
  }

  async createObjectReadStream(
    objectPath: string
  ): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    await ensureBucket();
    const client = getStorageClient();
    const entityId = objectPath.startsWith("/objects/")
      ? objectPath.slice("/objects/".length)
      : objectPath;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(entityId);

    if (error || !data) {
      throw new Error(`Download failed: ${error?.message}`);
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const stream = new PassThrough();
    stream.end(buffer);

    console.log(
      `[Storage] Creating read stream for: ${objectPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`
    );

    return { stream, size: buffer.length };
  }

  async getObjectSize(objectPath: string): Promise<number> {
    await ensureBucket();
    const client = getStorageClient();
    const entityId = objectPath.startsWith("/objects/")
      ? objectPath.slice("/objects/".length)
      : objectPath;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(entityId);

    if (error || !data) return 0;
    const buffer = await data.arrayBuffer();
    return buffer.byteLength;
  }

  async downloadAsBuffer(objectPath: string): Promise<Buffer> {
    await ensureBucket();
    const client = getStorageClient();
    const entityId = objectPath.startsWith("/objects/")
      ? objectPath.slice("/objects/".length)
      : objectPath;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .download(entityId);

    if (error || !data) {
      throw new Error(`Download failed: ${error?.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Handle Supabase signed URLs
    if (rawPath.includes("supabase.co/storage/")) {
      try {
        const url = new URL(rawPath);
        const match = url.pathname.match(
          /\/storage\/v1\/object\/(?:sign|public)\/[^/]+\/(.+)/
        );
        if (match) {
          return `/objects/${match[1]}`;
        }
      } catch {}
    }

    // Handle GCS URLs (legacy data)
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        let rawObjectPath = url.pathname;

        if (rawObjectPath.startsWith("/storage/v1/b/")) {
          const match = rawObjectPath.match(
            /^\/storage\/v1\/b\/[^/]+\/o\/(.+)$/
          );
          if (match) {
            return `/objects/${decodeURIComponent(match[1])}`;
          }
        }

        const parts = rawObjectPath.split("/").filter((p) => p);
        if (parts.length > 1) {
          return `/objects/${parts.slice(1).join("/")}`;
        }
      } catch {}
    }

    if (rawPath.startsWith("/objects/")) return rawPath;
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);

    if (normalizedPath.startsWith("/objects/")) {
      const entityId = normalizedPath.slice("/objects/".length);
      await setObjectAclPolicy({ name: entityId }, aclPolicy);
    }

    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: SupabaseFile | any;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile: { name: objectFile.name || objectFile },
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async uploadBuffer(
    targetPath: string,
    buffer: Buffer,
    contentType: string = "application/octet-stream"
  ): Promise<string> {
    await ensureBucket();
    const client = getStorageClient();

    let relativePath = targetPath;
    if (targetPath.startsWith("/objects/")) {
      relativePath = targetPath.slice("/objects/".length);
    }

    const { error } = await client.storage
      .from(BUCKET_NAME)
      .upload(relativePath, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload buffer: ${error.message}`);
    }

    return `/objects/${relativePath}`;
  }
}
