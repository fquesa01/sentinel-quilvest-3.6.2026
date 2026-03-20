import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("[SupabaseStorage] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — file storage disabled");
}

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const RON_DOCUMENTS_BUCKET = "ron-documents";
const FORM_TEMPLATES_BUCKET = "form-templates";

async function ensureBucket(name: string) {
  if (!supabase) return;
  const { error } = await supabase.storage.createBucket(name, {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024,
  });
  if (error && !error.message.includes("already exists")) {
    console.error(`[SupabaseStorage] Failed to create bucket "${name}":`, error.message);
  }
}

export async function initBuckets() {
  await ensureBucket(RON_DOCUMENTS_BUCKET);
  await ensureBucket(FORM_TEMPLATES_BUCKET);
  console.log("[SupabaseStorage] Buckets verified");
}

function getClient(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase Storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }
  return supabase;
}

export async function uploadFile(
  bucket: string,
  path: string,
  data: Buffer,
  contentType: string = "application/octet-stream",
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Upload failed (${bucket}/${path}): ${error.message}`);
  }
  return path;
}

export async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const client = getClient();
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) {
    throw new Error(`Download failed (${bucket}/${path}): ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Delete failed (${bucket}/${path}): ${error.message}`);
  }
}

export async function fileExists(bucket: string, path: string): Promise<boolean> {
  const client = getClient();
  const dir = path.substring(0, path.lastIndexOf("/"));
  const fileName = path.substring(path.lastIndexOf("/") + 1);
  const { data, error } = await client.storage.from(bucket).list(dir, {
    search: fileName,
    limit: 1,
  });
  if (error) return false;
  return Array.isArray(data) && data.some((f) => f.name === fileName);
}

export { RON_DOCUMENTS_BUCKET, FORM_TEMPLATES_BUCKET };
