import { createClient } from "@supabase/supabase-js";

export const PDF_MAKER_BUCKET = "pdf-maker-assets";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function uploadAsset(file: File, folder: string): Promise<string> {
  const supabase = getSupabase();

  await supabase.storage.createBucket(PDF_MAKER_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const safeExtension = /^[a-z0-9]{1,5}$/.test(extension)
    ? extension
    : "png";
  const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(PDF_MAKER_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    console.error("[Upload] Supabase upload failed:", error);
    throw new Error("Failed to upload file");
  }

  const { data } = supabase.storage
    .from(PDF_MAKER_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
